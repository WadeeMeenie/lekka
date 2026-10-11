# Release readiness

**Audit date:** 2026-10-11  
**Verdict:** **NOT READY**

A clean local build is not sufficient for release. The current checkout is `main` at `b0ee8fa7cb199b1e2b8b7bc2deb666dfecc985b8`. PR #9 is open and green at historical head `b5bf8d69798c2f9aaea763ea6304ec003d9f0621`, but that is not the SHA audited here.

## Gate status

- Build and TypeScript: **PASS locally** (`npm run check`, `npm run build`).
- Static audits: **PASS locally** (`audit:interactions`, `audit:production`).
- Unit/integration tests: **PASS locally**: 113 passed, 3 skipped. The Supabase REST check remains an external CI/configuration blocker when publishable credentials are supplied: the active modern `sb_publishable_…` key was rejected by the project gateway while the legacy anon key succeeded; no live mutation was attempted.
- Lint: **PASS with 0 warnings** after repairing the stale nearby-feed, messaging, profile, menu, post-edit, onboarding, and post-detail dependency/type issues.
- Web export: **PASS locally** (`npm run build:web`). Expo web support is explicit through `react-native-web`; NativeWind uses virtual CSS modules during web export to avoid Metro hashing a generated `node_modules` cache file.
- Android/native build: **NOT VERIFIED locally**; historical PR CI passed only at the PR SHA.
- Migration consistency: **BLOCKED**. Production has migrations through `20261011195846`, while this checkout contains files only through `20260906071000`.
- Security advisors: **BLOCKED**. Production still reports public execution of three `st_estimatedextent` overloads and public, RLS-disabled `spatial_ref_sys`.
- Payments: **NOT VERIFIED end to end**. Production has newer server-only Yoco RPCs and a verified amount/currency path than this checkout; no live or sandbox charge was attempted.
- Auth leaked-password protection: **BLOCKED/EXTERNAL**. Supabase reports it disabled; enablement requires project Auth settings and must be checked against plan capabilities.
- Backups, restore, monitoring, load, physical-device testing, legal/privacy/terms: **NOT VERIFIED**.

## Release blockers

1. Reconcile repository and production migration/function history without overwriting production or silently applying SQL.
2. Resolve or formally accept the PostGIS elevated-owner findings. Two live revoke migrations were recorded, but the `postgres` migration runner cannot alter functions owned by `supabase_admin`; raw ACLs and effective grants remain unchanged.
3. Align the repository Yoco implementation with the deployed server-only payment path and add tests for verified amount/currency and valid transitions.
4. Have the Supabase/project owner correct or rotate the modern publishable-key configuration. Do not silently downgrade the client to legacy anon; rerun the integration check after correction.
5. Obtain evidence for Auth password protection, backups/restore, deployment rollback, and Android/device flows.
