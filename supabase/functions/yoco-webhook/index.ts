import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("YOCO_WEBHOOK_SECRET");
const MAX_SKEW_SECONDS = 300;

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
  const signature = req.headers.get("webhook-signature");
  if (!id || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > MAX_SKEW_SECONDS) return false;

  const secretValue = WEBHOOK_SECRET.startsWith("whsec_") ? WEBHOOK_SECRET.slice(6) : WEBHOOK_SECRET;
  let secretBytes: Uint8Array;
  try {
    secretBytes = base64ToBytes(secretValue);
  } catch {
    return false;
  }

  const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, signed));

  return signature.split(" ").some((entry) => {
    const parts = entry.split(",", 2);
    if (parts.length !== 2 || parts[0] !== "v1") return false;
    try {
      return timingSafeEqual(digest, base64ToBytes(parts[1]));
    } catch {
      return false;
    }
  });
}

function findValue(value: unknown, keys: string[]): unknown {
  if (!value || typeof value !== "object") return undefined;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (keys.includes(key) && (typeof child === "string" || typeof child === "number")) return child;
    const nested = findValue(child, keys);
    if (nested !== undefined) return nested;
  }
  return undefined;
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
  const eventType = String(payload.event_type ?? payload.type ?? payload.event ?? "unknown");

  // Yoco documents webhook-id as the unique delivery identifier. Persist it before
  // processing so retries are acknowledged without applying the payment twice.
  const { error: eventInsertError } = await service.from("yoco_webhook_events").insert({
    webhook_id: webhookId,
    event_type: eventType,
    payload,
  });
  if (eventInsertError) {
    if (eventInsertError.code === "23505") return json({ received: true, duplicate: true });
    return json({ error: "webhook_persistence_failed" }, 500);
  }

  // The current Yoco webhook API documents payment.created and payment.refunded.
  // A payment.created delivery is the authoritative payment event for this flow.
  const isPaid = eventType === "payment.created";
  const isRefunded = eventType === "payment.refunded";
  if (!isPaid && !isRefunded) return json({ received: true, ignored: true });

  const paymentId = String(findValue(payload, ["payment_id", "paymentId", "id"]) ?? "");
  const checkoutId = String(findValue(payload, ["checkout_id", "checkoutId"]) ?? "");
  const metadataValue = findValue(payload, ["metadata", "metaData", "meta_data"]);
  const metadata = metadataValue && typeof metadataValue === "object"
    ? metadataValue as Record<string, unknown>
    : {};
  const lekkaOrderId = String(metadata.lekkaOrderId ?? metadata.lekka_order_id ?? "");

  if (lekkaOrderId) {
    await service.from("payment_orders").update({
      status: isPaid ? "paid" : "refunded",
      provider_checkout_id: checkoutId || undefined,
      provider_payment_id: paymentId || undefined,
      paid_at: isPaid ? new Date().toISOString() : undefined,
      metadata: { yoco_event_type: eventType, yoco_payload: payload },
      updated_at: new Date().toISOString(),
    }).eq("id", lekkaOrderId);
  } else if (checkoutId) {
    await service.rpc("set_payment_order_status_from_yoco", {
      p_checkout_id: checkoutId,
      p_status: isPaid ? "paid" : "refunded",
      p_provider_payment_id: paymentId || null,
      p_metadata: { yoco_event_type: eventType },
    });
  }

  return json({ received: true });
});
