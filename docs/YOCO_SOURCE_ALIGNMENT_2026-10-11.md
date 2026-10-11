# Yoco source alignment and subscription security — 2026-10-11

## Status: PARTIALLY RESOLVED / DEPLOYMENT BLOCKED

Production currently runs server-only Yoco functions. The deployed checkout path creates orders with `create_yoco_payment_order_server`, uses the order’s trusted amount and idempotency key, persists the provider checkout through `attach_yoco_checkout_server`, and returns only a controlled app-scheme destination. The deployed webhook verifies the raw body with `webhook-id`, `webhook-timestamp`, HMAC-SHA256, constant-time comparison, and a three-minute replay window. It persists webhook IDs for idempotency and calls `set_payment_order_status_from_yoco_verified` with provider amount and currency.

The live `yoco-create-checkout` v11 source contained a critical source defect: after logging an order creation failure, its `return order_creation_failed` was not scoped by braces and therefore executed unconditionally. This means the deployed function can reject even successful order creation. The repository copy was updated locally with the reviewed server-only contract and fixed control flow. No Edge Function was deployed, so the live defect remains a release blocker.

The repository webhook was also updated locally from older `payment.created`/`payment.refunded` and caller-controlled order fields to the deployed current event family (`payment.succeeded`, `payment.failed`, `refund.succeeded`), checkout identity, amount, currency, and verified transition RPC.

## Subscription administration

`yoco-webhook-subscription` is JWT-protected, checks `is_platform_admin`, refuses live-mode registration, avoids duplicate TEST subscriptions, and returns the signing secret only at creation time for immediate storage as `YOCO_WEBHOOK_SECRET`. Ordinary users cannot reach the admin route through the menu, and the server performs the authoritative admin check. No merchant secret was read, printed, committed, or exposed.

## Test-mode contract

Lekka’s current product scope is verification payments in TEST mode. The verified amount is R200, represented as `20000` cents, and currency is ZAR. Yoco refunds are represented where the provider event and verified transition function support them. Subscription activation, cancellation, expiry, recurring billing, and customer entitlements are not implemented in the inspected scope; they must not be implied by UI copy or treated as supported API capability.

## Verification

`tests/yoco-source-alignment.security.test.ts` covers server-only order creation, absence of caller-supplied amount, fixed error control flow, verified amount/currency transitions, webhook replay headers, admin gating, TEST-mode enforcement, and duplicate-subscription handling.

## Remaining actions

1. Review the local source at a candidate SHA.
2. Deploy only after explicit approval and normal Edge Function review.
3. Execute a provider-supported TEST checkout with isolated data.
4. Verify paid, failed, cancelled, delayed, duplicate, and refunded events against the resulting `payment_orders` row.
5. Re-read deployed function source/version and rerun the source-alignment tests.

Final status remains **BLOCKED for payment release** until the corrected function is deployed and an end-to-end TEST payment is verified.
