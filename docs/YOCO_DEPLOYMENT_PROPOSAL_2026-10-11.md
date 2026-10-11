# Yoco deployment proposal — 2026-10-11

## Status: NOT EXECUTED

No production deployment authorization was provided. The following source-only changes are committed on the audit branch at the current candidate SHA:

```text
supabase/functions/yoco-create-checkout/index.ts
- uses client-authorized create_yoco_payment_order
- accepts a legacy return base
- attaches through attach_yoco_checkout
+ uses service-side create_yoco_payment_order_server with p_user_id
+ uses LEKKA_APP_SCHEME-controlled return destinations
+ uses attach_yoco_checkout_server with p_user_id
+ scopes the order creation failure return correctly
+ never returns provider error bodies to the caller

supabase/functions/yoco-webhook/index.ts
- handles legacy payment.created/payment.refunded fields
- calls set_payment_order_status_from_yoco
+ handles current payment.succeeded/payment.failed/refund.succeeded events
+ extracts provider checkout identity and payment identity from the event data
+ passes provider amount and currency to set_payment_order_status_from_yoco_verified
+ preserves raw-body signature, replay-window, and webhook-id idempotency checks
```

## Proposed review/deployment command

After a platform owner reviews the candidate SHA and confirms the target project/environment is the TEST configuration, the authorized operator may run:

```bash
supabase functions deploy yoco-create-checkout --project-ref vnitwsjidlurlwlpsmtf
supabase functions deploy yoco-webhook --project-ref vnitwsjidlurlwlpsmtf
```

The operator must verify that the Supabase secrets already configured for the TEST environment include the Yoco secret and webhook signing secret by **name only**, never printing values. The command is intentionally documented but was not executed.

## Post-deployment verification

1. Re-read both deployed function sources and record function versions/hashes.
2. Send unauthenticated and malformed requests; require 401/400 without provider calls.
3. Run one isolated provider TEST checkout for a test business and verify the order amount is R200 / 20000 cents and currency ZAR.
4. Replay the same signed webhook; require one state transition and an idempotent response.
5. Send invalid-signature, stale-timestamp, wrong-checkout, wrong-amount, and wrong-currency fixtures; require rejection and no entitlement change.
6. Verify failed, cancelled, delayed, and refund events against the isolated payment order.
7. Re-run `npx vitest run tests/yoco-source-alignment.security.test.ts` and the full release suite.

Until those steps are completed, the payment blocker remains **OPEN**.
