import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const YOCO_SECRET_KEY = Deno.env.get("YOCO_SECRET_KEY");
const APP_SCHEME = Deno.env.get("LEKKA_APP_SCHEME") ?? "manuslocalradarsa";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!YOCO_SECRET_KEY) return json({ error: "yoco_not_configured" }, 503);
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return json({ error: "missing_authorization" }, 401);

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  let input: { businessId?: string; purpose?: string; referenceId?: string; successUrl?: string; cancelUrl?: string; failureUrl?: string };
  try { input = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  if (input.purpose !== "verification") return json({ error: "unsupported_test_product" }, 400);
  if (!input.businessId || !input.referenceId) return json({ error: "business_id_and_reference_id_required" }, 400);

  // R200 is server-controlled. The client cannot alter the amount.
  const { data: order, error: orderError } = await authClient.rpc("create_yoco_payment_order", {
    p_business_id: input.businessId,
    p_purpose: "verification",
    p_reference_id: input.referenceId,
    p_amount_cents: 20000,
    p_metadata: { environment: "test", user_id: user.id },
  }).single();
  if (orderError || !order) return json({ error: "order_creation_failed", detail: orderError?.message }, 400);

  const successUrl = input.successUrl ?? `${APP_SCHEME}://payment/success?order_id=${order.id}`;
  const cancelUrl = input.cancelUrl ?? `${APP_SCHEME}://payment/cancel?order_id=${order.id}`;
  const failureUrl = input.failureUrl ?? `${APP_SCHEME}://payment/failure?order_id=${order.id}`;

  const yocoResponse = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${YOCO_SECRET_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": order.idempotency_key,
    },
    body: JSON.stringify({
      amount: order.amount_cents,
      currency: "ZAR",
      successUrl,
      cancelUrl,
      failureUrl,
      metadata: { lekkaOrderId: order.id, businessId: order.business_id, purpose: order.purpose },
    }),
  });

  const yocoBody = await yocoResponse.json().catch(() => ({}));
  if (!yocoResponse.ok || !yocoBody.id || !yocoBody.redirectUrl) {
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    await service.from("payment_orders").update({ status: "failed", metadata: { yoco_error: yocoBody }, updated_at: new Date().toISOString() }).eq("id", order.id);
    return json({ error: "yoco_checkout_creation_failed", detail: yocoBody }, 502);
  }

  const { error: attachError } = await authClient.rpc("attach_yoco_checkout", { p_order_id: order.id, p_checkout_id: yocoBody.id });
  if (attachError) return json({ error: "checkout_persistence_failed" }, 500);

  return json({ orderId: order.id, checkoutId: yocoBody.id, redirectUrl: yocoBody.redirectUrl });
});
