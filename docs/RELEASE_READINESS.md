# Lekka release readiness

This checklist is the release gate for the current production-hardening candidate. A green CI run proves the checked source compiles and the automated checks pass; it does not replace live account, device, or provider verification.

## Automated gates

- [ ] GitHub Actions passes on the exact commit intended for release.
- [ ] TypeScript, interaction audit, production invariant audit, tests, lint, Expo compatibility/doctor, and both Android debug builds pass.
- [ ] Downloaded APKs install and launch on a physical Android device; verify login, session restoration, navigation, location permission, camera/media selection, and sign-out.
- [ ] Test on at least three isolated accounts (A, B, C): profile privacy, private posts, blocks, buddy requests, community membership, saved posts, notifications, and cached/offline feed data must not cross account boundaries.

## Supabase production gates

- [ ] Reconcile repository migration filenames/content against the live migration history before deploying any migration. Some hardening migrations were previously applied directly to the live project under different migration versions.
- [ ] Inspect every exposed SECURITY DEFINER function for auth.uid() checks, fixed search_path, argument validation, bounded queries, and least-privilege EXECUTE grants. Do not revoke client execution from intentionally public authenticated RPCs without checking call sites.
- [ ] Resolve the spatial_ref_sys RLS/grant finding using a PostGIS-compatible approach; do not blindly enable RLS or move the extension on production.
- [ ] Confirm tables flagged as RLS-enabled/no-policy remain inaccessible to anon and authenticated and are intended for service-role/server use only.
- [ ] Enable Supabase leaked-password protection and verify email confirmation, password reset, OAuth/deep links, and redirect allowlists.
- [ ] Test Storage upload, signed URL expiry, replacement/deletion cleanup, and access control across accounts.
- [ ] Verify database backup/PITR availability and a rollback plan before any production DDL.

## Payments and launch

- [ ] Use Yoco sandbox/test credentials to exercise checkout creation, webhook signature/authentication, duplicate/replayed webhook delivery, cancellation/failure, paid transition, and refund handling.
- [ ] Verify server-side amount and ownership validation; never trust client-supplied payment status or price.
- [ ] Confirm production secrets are stored only in Supabase secrets/GitHub Actions secrets and not in client bundles or repository history.
- [ ] Confirm privacy policy, terms, community/reporting/block flows, account deletion/data retention, support contact, and location permission explanations.
- [ ] Build and sign the release APK/AAB with the intended production credentials; verify upgrade compatibility against the existing package ID before publishing.

## Known open items

- The social reaction/save/follow/block client methods still use SELECT-then-write toggles. They now report failed writes truthfully, but concurrent taps can race. Replace them with reviewed atomic database operations and unique constraints before high-traffic launch.
- Physical-device and multi-account tests require real test accounts/devices and cannot be truthfully marked complete by CI alone.
- Production Supabase migration history is not identical to the repository migration history; do not apply migrations until reconciled.
