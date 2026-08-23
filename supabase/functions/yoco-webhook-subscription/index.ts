import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const YOCO_API_KEY = Deno.env.get("YOCO_API_KEY");
const NOTIFICATION_URL = Deno.env.get("YOCO_WEBHOOK_NOTIFICATION_URL")
  ?? `${SUPABASE_URL}/functions/v1/yoco-webhook`;
const SUBSCRIPTION_NAME = "Lekka payments";
const EVENT_TYPES = ["payment.created", "payment.refunded"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!YOCO_API_KEY) return json({ error: "yoco_api_not_configured" }, 503);

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return json({ error: "missing_authorization" }, 401);

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  const { data: isAdmin, error: adminError } = await authClient.rpc("is_platform_admin", {
    target_user: user.id,
  });
  if (adminError || !isAdmin) return json({ error: "admin_required" }, 403);

  const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Do not create another Yoco subscription if Lekka already has a TEST subscription.
  const { data: existing, error: existingError } = await service
    .from("yoco_webhook_subscriptions")
    .select("provider_subscription_id,name,notification_url,event_types,status,environment")
    .eq("environment", "test")
    .eq("notification_url", NOTIFICATION_URL)
    .limit(1)
    .maybeSingle();

  if (existingError) return json({ error: "subscription_lookup_failed" }, 500);
  if (existing) {
    return json({
      subscriptionId: existing.provider_subscription_id,
      notificationUrl: existing.notification_url,
      eventTypes: existing.event_types,
      status: existing.status,
      environment: existing.environment,
      alreadyExists: true,
      secret: null,
      secretStorage: "The webhook secret is only returned by Yoco at subscription creation. Do not create a duplicate subscription.",
    });
  }

  const response = await fetch("https://api.yoco.com/v1/webhooks/subscriptions/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${YOCO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_types: EVENT_TYPES,
      name: SUBSCRIPTION_NAME,
      notification_url: NOTIFICATION_URL,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json({ error: "yoco_subscription_creation_failed", status: response.status, detail: body }, 502);
  }

  const subscriptionId = String(body.id ?? body.subscription_id ?? "");
  if (!subscriptionId) return json({ error: "yoco_subscription_missing_id" }, 502);

  const { error: persistError } = await service.from("yoco_webhook_subscriptions").upsert({
    provider_subscription_id: subscriptionId,
    name: String(body.name ?? SUBSCRIPTION_NAME),
    notification_url: NOTIFICATION_URL,
    event_types: EVENT_TYPES,
    status: String(body.status ?? (body.active === false ? "inactive" : "active")),
    environment: "test",
    updated_at: new Date().toISOString(),
  }, { onConflict: "provider_subscription_id" });

  if (persistError) return json({ error: "subscription_persistence_failed" }, 500);

  // Yoco returns the whsec_ secret only once at creation. Return it only to the
  // authenticated platform admin so it can be stored as YOCO_WEBHOOK_SECRET.
  return json({
    subscriptionId,
    notificationUrl: NOTIFICATION_URL,
    eventTypes: EVENT_TYPES,
    status: String(body.status ?? (body.active === false ? "inactive" : "active")),
    environment: "test",
    alreadyExists: false,
    secret: body.secret ?? null,
    secretStorage: "Store the returned secret as Supabase secret YOCO_WEBHOOK_SECRET. Never commit it.",
  });
});
