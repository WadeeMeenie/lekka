import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const checkout = readFileSync("supabase/functions/yoco-create-checkout/index.ts", "utf8");
const webhook = readFileSync("supabase/functions/yoco-webhook/index.ts", "utf8");
const subscription = readFileSync("supabase/functions/yoco-webhook-subscription/index.ts", "utf8");

describe("Yoco source alignment", () => {
  it("creates payment orders through the server-only RPC without accepting a client amount", () => {
    expect(checkout).toContain('service.rpc("create_yoco_payment_order_server"');
    expect(checkout).toContain("p_user_id: user.id");
    expect(checkout).not.toContain("p_amount_cents");
    expect(checkout).toContain('service.rpc("attach_yoco_checkout_server"');
    expect(checkout).toContain('const APP_SCHEME = Deno.env.get("LEKKA_APP_SCHEME")');
  });

  it("fails order creation only when the order is actually missing", () => {
    expect(checkout).toContain('if (orderError || !order) {');
    expect(checkout).toContain('return json({ error: "order_creation_failed" }, 400);');
    expect(checkout).not.toMatch(/if \(orderError \|\| !order\) console\.error[\s\S]{0,180}return json/);
  });

  it("verifies webhook event identity, amount, and currency server-side", () => {
    expect(webhook).toContain('service.rpc(\n    "set_payment_order_status_from_yoco_verified"');
    expect(webhook).toContain("p_amount_cents: amount");
    expect(webhook).toContain("p_currency: currency");
    expect(webhook).toContain('eventType !== "payment.succeeded"');
    expect(webhook).toContain('eventType !== "refund.succeeded"');
    expect(webhook).toContain("webhook-id");
    expect(webhook).toContain("webhook-timestamp");
    expect(webhook).toContain('if (!(await verifySignature(rawBody, req))) return json({ error: "invalid_signature" }, 401);');
    expect(webhook).toContain('if (eventInsertError && eventInsertError.code !== "23505")');
    expect(webhook).toContain('eventType !== "payment.failed"');
  });

  it("keeps success and rejected payment outcomes on the verified transition path", () => {
    expect(webhook).toContain('const nextStatus = eventType === "payment.succeeded" ? "paid" : eventType === "payment.failed" ? "failed" : "refunded";');
    expect(webhook).toContain('if (!providerOrderId) return json({ error: "missing_checkout_id" }, 400);');
    expect(webhook).toContain('const currency = typeof data.currency === "string" ? data.currency.toUpperCase() : null;');
    expect(webhook).toContain("Number.isSafeInteger(data.amount)");
  });

  it("rejects unauthenticated checkout calls before any provider request", () => {
    expect(checkout).toContain('if (!authHeader) return json({ error: "missing_authorization" }, 401);');
    expect(checkout).toContain('if (userError || !user) return json({ error: "unauthorized" }, 401);');
    expect(checkout).toContain('if (input.purpose !== "verification") return json({ error: "unsupported_test_product" }, 400);');
  });

  it("keeps merchant webhook setup admin-gated and test-mode only", () => {
    expect(subscription).toContain('authClient.rpc("is_platform_admin"');
    expect(subscription).toContain('environment !== "test"');
    expect(subscription).toContain('secret: webhookSecret');
    expect(subscription).toContain("Do not create a duplicate webhook");
  });
});
