# Lekka release readiness

This checklist is the release gate for the current production-hardening candidate. A green CI run proves the checked source compiles and the automated checks pass; it does not replace live account, device, provider, and load verification. See [Production Scale Plan](./PRODUCTION_SCALE_PLAN.md).

## Automated gates

- [ ] GitHub Actions passes on the exact commit intended for release.
- [ ] TypeScript, interaction audit, production invariant audit, tests, lint, Expo compatibility/doctor, and both Android debug builds pass.
- [ ] Downloaded APKs install and launch on a physical Android device; verify login, session restoration, navigation, location permission, camera/media selection, and sign-out.
- [ ] Test on at least three isolated accounts (A, B, C): profile privacy, private posts, blocks, buddy requests, community membership, saved posts, notifications, and cached/offline feed data must not cross account boundaries.
- [ ] Run read-only discovery load tests in staging and record p50/p95/p99, error rates, DB saturation, and the maximum stable throughput. Do not infer million-user capacity from a small smoke test.

## Supabase production gates

- [ ] Reconcile repository migration filenames/content against the live migration history before deploying any additional migration. Some hardening migrations were previously applied directly to the live project under different migration versions.
- [ ] Verify the production index `posts_community_pinned_by_idx` exists. It was applied and verified on 2026-10-11; its repository migration must remain aligned with the recorded migration version.
- [ ] Inspect every exposed SECURITY DEFINER function for auth.uid() checks, fixed search_path, argument validation, bounded queries, and least-privilege EXECUTE grants. Do not revoke client execution from intentionally public authenticated RPCs without checking call sites.
- [ ] Resolve the spatial_ref_sys RLS/grant finding using a PostGIS-compatible approach; do not blindly enable RLS or move the extension on production. The attempted grant revocation failed its postcondition and the issue remains open.
- [ ] Confirm tables flagged as RLS-enabled/no-policy remain inaccessible to anon and authenticated and are intended for service-role/server use only.
- [ ] **Deferred — plan-gated:** leaked-password protection could not be enabled on the current Supabase plan. Revisit only if the plan changes; do not block current development work on an upgrade.
- [ ] Test Storage upload, signed URL expiry, replacement/deletion cleanup, and access control across accounts.
- [ ] Verify database backup/PITR availability and a rollback plan before any production DDL.

## Verified live changes (2026-10-11)

- The production checkout function no longer accepts client-controlled success/cancel/failure URLs (Edge Function version 11).
- The Yoco webhook handler now recognizes `payment.succeeded`, `payment.failed`, and `refund.succeeded`, correlates checkout IDs, and calls a server-only RPC that verifies amount and ZAR currency before a paid transition (Edge Function version 12).
- Order creation and checkout attachment are now server-only RPCs; the previous client-callable RPC grants were revoked. Both checkout Edge Function versions use the server-only RPCs (v1 version 11; v2 version 10).
- Live migrations recorded by Supabase: `20261011192054` (verified Yoco amount/currency) and `20261011192351` (server-only order creation/checkout attachment). Repository migration filenames are aligned to those versions.
- The current verification checkout is explicitly **test-only**, with a fixed R200 amount and `environment=test` metadata. It is not a production monetization flow; do not switch it to live Yoco credentials until a separate production pricing/checkout configuration and end-to-end live-mode safeguards are implemented and tested.

## Live security recheck (2026-10-14)

- **OPEN — PostGIS metadata:** Live privilege inspection confirms `public.spatial_ref_sys` is owned by `supabase_admin`, RLS is disabled, and `anon` and `authenticated` have SELECT and INSERT privileges (the ACL also grants broader table privileges). Previous ordinary migrations did not remove those grants. Do not repeat ineffective revokes or change extension ownership; resolve via a supported Supabase owner/admin maintenance path, then verify effective privileges and PostGIS operations.
- **DEFERRED — Leaked-password protection:** User confirmed the current Supabase plan does not include this feature. No upgrade will be pursued for this task. Revisit only if the plan changes; do not claim the setting is enabled.
- **SECURITY DEFINER review:** The audited application functions have an empty/fixed `search_path`. Most client-callable functions are restricted to authenticated users; server/webhook functions are not executable by either client role. `is_community_member` and `is_community_owner` are still executable by `anon`, but both return false without `auth.uid()`. Existing public-role RLS policies invoke these helpers, so revoking anonymous EXECUTE blindly can break public community/member/media reads. Test policy behavior before changing those grants.
- **Server-only tables:** `cape_aloe_order_items`, `cape_aloe_orders`, `cape_aloe_yoco_events`, `media_cleanup_queue`, and `yoco_webhook_events` grant table privileges only to `service_role` among the client/service roles checked; RLS enabled with no policies is intentional for this access pattern.
- **Validation status:** latest code commit under validation is `90d53dd5477729976e22cbcf0b41119c645303a7`. Its GitHub Actions run was cancelled when a newer commit triggered validation. Do not count the build/test gate as passed until the current run completes successfully.

## Known open items

- Reaction/save/follow/block now use transaction-serialized RPCs; verify them with concurrent and retry tests before high-traffic launch.
- Physical-device and multi-account tests require real test accounts/devices and cannot be truthfully marked complete by CI alone.
- The production project still has unresolved PostGIS metadata grants. Leaked-password protection is explicitly deferred because the current plan does not include it. Do not label the app fully launch-ready until the remaining required security, CI, device, payment, and release gates are closed.
