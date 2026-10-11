# Release readiness

**Audit date:** 2026-10-11  
**Verdict:** **NOT READY**

A clean local build is not sufficient for release. The current checkout is `main` at `b0ee8fa7cb199b1e2b8b7bc2deb666dfecc985b8`. PR #9 is open and green at historical head `b5bf8d69798c2f9aaea763ea6304ec003d9f0621`, but that is not the SHA audited here.

## Gate status

- Build and TypeScript: **PASS locally** (`npm run check`, `npm run build`).
- Static audits: **PASS locally** (`audit:interactions`, `audit:production`).
- Unit/integration tests: **PASS locally**: 119 passed, 3 skipped, including the expanded Yoco source-alignment security test (6/6). Skips are the missing-credential Supabase REST test, the manual Expo-token test, and the explicitly TODO/skip auth.logout suite. The Supabase REST check remains an external CI/configuration blocker when publishable credentials are supplied.
- Lint: **PASS with 0 warnings** after repairing the stale nearby-feed, messaging, profile, menu, post-edit, onboarding, and post-detail dependency/type issues.
- Web export: **PASS locally** (`npm run build:web`). Expo web support is explicit through `react-native-web`; NativeWind uses virtual CSS modules during web export to avoid Metro hashing a generated `node_modules` cache file.
- Android/native build: **NOT VERIFIED locally**; historical PR CI passed only at the PR SHA.
- Migration consistency: **BLOCKED**. Production has migrations through `20261011203434`, while this checkout contains files only through `20260906071000`. See `docs/MIGRATION_PARITY_2026-10-11.md`.
- Security advisors: **BLOCKED**. Production still reports public execution of three `st_estimatedextent` overloads and public, RLS-disabled `spatial_ref_sys`.
- Payments: **BLOCKED**. The repository now records the deployed server-only Yoco contract and has focused source tests, but the deployed primary checkout function contains an unconditional order-failure return and was not changed because deployment requires explicit authorization. No charge was attempted.
- Auth leaked-password protection: **BLOCKED/EXTERNAL**. Supabase reports it disabled; enablement requires project Auth settings and must be checked against plan capabilities.
- Backups, restore, monitoring, load, physical-device testing, legal/privacy/terms: **NOT VERIFIED**.

## Release blockers

1. Reconcile repository and production migration/function history without overwriting production or silently applying SQL.
2. Resolve or formally accept the PostGIS elevated-owner findings. Two live revoke migrations were recorded, but the `postgres` migration runner cannot alter functions owned by `supabase_admin`; raw ACLs and effective grants remain unchanged.
3. Align the repository Yoco implementation with the deployed server-only payment path and add tests for verified amount/currency and valid transitions.
4. Have the Supabase/project owner correct or rotate the modern publishable-key configuration. Do not silently downgrade the client to legacy anon; rerun the integration check after correction.
5. Obtain evidence for Auth password protection, backups/restore, deployment rollback, legal/privacy readiness, and Android/device flows.

## Closure-pass evidence

The live project was re-checked read-only on 2026-10-11. The three `st_estimatedextent` overloads still have effective client execution grants and are owned by `supabase_admin`; five server-only tables have no policies but also no `anon` or `authenticated` table privileges; leaked-password protection remains disabled; and Supabase performance advisors still report 39 RLS init-plan, 58 multiple-permissive-policy, and 26 unused-index findings. The deployed Yoco function inventory and source were compared with Git. Local checkout/webhook source alignment and regression coverage were added, but production remains unchanged; the exact proposed deployment is documented but was not executed.

Detailed evidence is in `docs/MIGRATION_PARITY_2026-10-11.md`, `docs/POSTGIS_REMEDIATION_2026-10-11.md`, `docs/YOCO_SOURCE_ALIGNMENT_2026-10-11.md`, `docs/YOCO_DEPLOYMENT_PROPOSAL_2026-10-11.md`, `docs/CATEGORY_WORKFLOW_E2E_2026-10-11.md`, `docs/BACKUP_RESTORE_MONITORING_2026-10-11.md`, `docs/DEVICE_VALIDATION_2026-10-11.md`, and `docs/FINAL_RELEASE_CHECKLIST_2026-10-11.md`.
