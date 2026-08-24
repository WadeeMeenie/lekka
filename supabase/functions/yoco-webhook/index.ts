import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("YOCO_WEBHOOK_SECRET");
const MAX_SKEW_SECONDS = 180;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function base64ToBytes(value: string) {
  const bin = atob(value);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function verifySignature(rawBody: string, req: Request) {
  if (!WEBHOOK_SECRET) return false;
  const id = req.headers.get("webhook-id");
  const timestamp = req.headers.get("webhook-timestamp");
  const signatureHeader = req.headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > MAX_SKEW_SECONDS) return false;

  const secretValue = WEBHOOK_SECRET.startsWith("whsec_") ? WEBHOOK_SECRET.slice(6) : WEBHOOK_SECRET;
  let secretBytes: Uint8Array;
  try {
    secretBytes = base64ToBytes(secretValue);
  } catch {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signedContent = new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, signedContent));

  return signatureHeader.split(" ").some((entry) => {
    const [version, encodedSignature] = entry.split(",", 2);
    if (version !== "v1" || !encodedSignature) return false;
    try {
      return timingSafeEqual(digest, base64ToBytes(encodedSignature));
    } catch {
      return false;
    }
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const rawBody = await req.text();
  if (!(await verifySignature(rawBody, req))) return json({ error: "invalid_signature" }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const webhookId = req.headers.get("webhook-id");
  if (!webhookId) return json({ error: "missing_webhook_id" }, 400);

  const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const eventType = String(payload.event_type ?? "unknown");

  const { error: eventInsertError } = await service.from("yoco_webhook_events").insert({
    webhook_id: webhookId,
    event_type: eventType,
    payload,
  });
  if (eventInsertError && eventInsertError.code !== "23505") {
    return json({ error: "webhook_persistence_failed" }, 500);
  }

  if (eventType !== "payment.created" && eventType !== "payment.refunded") {
    return json({ received: true, ignored: true });
  }

  const providerOrderId = typeof payload.order_id === "string" ? payload.order_id : "";
  const paymentId = typeof payload.payment_id === "string" ? payload.payment_id : "";
  if (!providerOrderId) return json({ error: "missing_order_id" }, 400);

  const nextStatus = eventType === "payment.created" ? "paid" : "refunded";
  const { data: updatedOrder, error: updateError } = await service.rpc(
    "set_payment_order_status_from_yoco",
    {
      p_checkout_id: providerOrderId,
      p_status: nextStatus,
      p_provider_payment_id: paymentId || null,
      p_metadata: { yoco_event_type: eventType, webhook_id: webhookId },
    },
  );

  if (updateError) return json({ error: "payment_update_failed" }, 500);
  if (!updatedOrder) return json({ error: "payment_order_not_found" }, 404);

  return json({ received: true });
});
