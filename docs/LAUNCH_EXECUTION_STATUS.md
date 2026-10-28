# Lekka launch execution status

**Assessment date:** 2026-10-28
**Overall status:** **NOT READY** — current code work remains on a local implementation branch, the database migration is not deployed, the live PostGIS catalog issue is unresolved, and the current source has not yet produced a verified APK or passed device/account acceptance tests.

This register distinguishes source changes and automated checks from production/deployment/device evidence. A green local test does not certify a live migration, real authentication delivery, cross-account isolation, or a release artifact.

## Verified issue register

| Severity | Evidence and root cause | Implementation | Verification / remaining blocker |
|---|---|---|---|
| **Critical — production DB privileges** | Read-only query against project `vnitwsjidlurlwlpsmtf` found `anon` and `authenticated` with SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, and TRIGGER on `public.spatial_ref_sys`. The table owner is `supabase_admin`; the connected SQL session is `postgres` and is not a member of that owner role. Earlier remediation versions are recorded remotely but did not remove the effective grants. | No production DDL attempted. The unsupported owner/ACL boundary is documented in `supabase/README.md`. | **Open.** Requires a supported Supabase owner/admin path and PostGIS compatibility verification. Do not resolve by enabling RLS or changing extension ownership/schema without a tested plan. |
| **High — private-community membership bypass** | Live `pg_policies` shows `community_members_self_insert` checked self-ownership and moderator status but did not require the community to be public or the caller to own it; the client calls `community_members.upsert` for joins. A crafted request could self-insert into a private community. | Added forward-only policy replacement in `supabase/migrations/20261028190000_harden_community_and_nearby_reads.sql`; ordinary public joins and owner membership remain supported. | Four migration-source regression tests pass. **Not applied to production**; requires a disposable/staging policy test and then approved deployment. |
| **High — nearby authorization consistency / unbounded radius** | Live definitions source and checked-in feeds clamp lower bounds but don't cap caller-supplied radius in every nearby read. The service-only media helper authorizes by caller-supplied coordinates/community membership but omitted author-private-profile and mutual block checks; callers can be real but proximity coordinates are not independently attested. | The new additive migration caps feed, detail, and server-only media radius at 50 km; validates coordinate ranges; adds private-profile/accepted-buddy and mutual-block checks to detail/feed/media authorization. | Four static migration regression tests pass. SQL has **not** been executed against a disposable PostgreSQL/PostGIS database, so policy/function behavior must be tested before deployment. Client-supplied coordinates remain an input, not cryptographic proof of physical presence. |
| **High — CI/reproducibility gaps** | The source had no lockfile while CI ran `npm install`. Under pnpm's isolated layout, `audit-interactions` failed to resolve its directly imported but undeclared `@babel/parser`. After switching CI to pnpm, `audit:production` failed because it hard-coded the old npm gate command strings. | Added `pnpm-lock.yaml`, pinned pnpm 9.12.0 workflow steps and frozen installs in GitHub Actions/Codemagic; declared `@babel/parser` and `expo-doctor`; aligned invariant assertions with actual CI gates. | Frozen install, interaction audit, production audit, and dependency checks pass locally. GitHub Actions on this exact branch have not yet run. ESLint exits successfully with 15 existing warnings. |
| **Medium — small-screen authentication access** | The authentication form was a non-scrollable `View`, so password/signup controls could fall behind the Android keyboard on short screens. | Replaced the root content with a keyboard-aware `KeyboardAvoidingView` and `ScrollView` in `app/auth.tsx`. | TypeScript and lint pass; physical small-screen Android interaction remains untested. |
| **High — current APK not verified** | The in-repository `LEKKA_FINAL_RELEASE.md` references a historical APK/commit; no APK exists in the current sandbox. This environment has no Android SDK, ADB, Gradle, or EAS CLI installed/configured. | Expo native prebuild succeeded locally. | Native Gradle build, exact-source APK metadata inspection, device install/launch, and release signing remain unverified. A debug artifact from a different commit is not a release substitute. |
| **High — Supabase history reconciliation** | Live project is `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.155, with recorded applied migrations through `20261017231856`. Several live version/name pairs differ from repository filenames, and remote history includes duplicate names. The migration-list integration exposes applied versions, not historical failed-attempt logs. | Documented real project details and a non-destructive reconciliation requirement in `supabase/README.md`. | **Open.** Reconcile exact schema and version/name mappings before applying the new migration; do not replay all local files. |
| **High — real-user/device acceptance** | Automated tests do not prove provider email delivery, multi-account RLS/storage isolation, notifications, Yoco checkout/webhooks, permissions, or offline recovery. The test suite explicitly skips Supabase credential-dependent checks in this environment. | Existing regression tests retained; migration tests added. | **Open.** Requires confirmed test accounts, valid CI integration credentials, provider setup, and Android hardware/emulator. No result is marked passed without observation. |

## Verification evidence on this branch (before CI publication)

- `pnpm check` — PASS (TypeScript).
- `pnpm test` — PASS: **43 files passed, 1 skipped; 180 tests passed, 2 skipped**. The skipped cases include credential-dependent integration/configuration checks.
- `pnpm lint` — PASS with **0 errors and 15 warnings** in existing files.
- `pnpm audit:interactions` — PASS, 38 source files scanned.
- `pnpm audit:production` — PASS, 38 app route/source files checked.
- `pnpm exec expo config --type public` — PASS for the intended Lekka package configuration (`com.app.localradarsa`); public defaults only.
- `pnpm exec expo install --check` — PASS, dependencies aligned to Expo SDK 54.
- `pnpm exec expo-doctor` — PASS, 18/18 checks.
- `pnpm install --frozen-lockfile --ignore-scripts` — PASS, lockfile current.
- `CI=1 pnpm exec expo prebuild --no-install --clean` — PASS; generated native Android project is ignored build output, not a source change.
- Previous main-branch GitHub run: [run 39985339494](https://github.com/WadeeMeenie/lekka/actions/runs/39985339494) succeeded on `d574bf56822b085555534279cb010f0cb5d61156` on 2026-10-23. This is **not** a check of the current branch.

## Repository and production boundaries

- Repository: [WadeeMeenie/lekka](https://github.com/WadeeMeenie/lekka)
- Starting main commit: `d574bf56822b085555534279cb010f0cb5d61156`
- Implementation branch: `manus/launch-hardening-20261028` (local at time of writing)
- The launch/security migration has not been applied to production. No live table, user record, Storage object, or function was changed in this work.
- Project metadata currently reports `ACTIVE_HEALTHY`, `eu-west-1`, PostgreSQL 17.6.1.155; that does not resolve the open `spatial_ref_sys` privilege finding.

## Launch decision and next gates

Do not ship or describe the product as production-ready until: (1) PostGIS owner-level grants are corrected and verified through a supported route, (2) live migration history/schema are reconciled, (3) the new RLS/functions are executed and tested in staging with anonymous, unrelated, owner, buddy, blocked, and community-member identities, (4) the exact-source Android APK is built and inspected, (5) device and multi-account acceptance is performed, and (6) the resulting commit passes published CI. The current verification-payment integration is test-mode only; it is not a live monetization release.


## Android build environment

Expo prebuild generated the native project, and Gradle 8.14.3 configured it successfully up to SDK discovery. The local host is ARM64 and has no Android SDK. The generated app currently requests Android compile/target SDK 36 and NDK 27.1.12297006. Google's current standalone Android CLI installer documentation lists Linux x86_64, not Linux ARM64, so the reproducible x86-64 GitHub Actions runner is the viable build path for this sandbox. [1]

**References**

[1]: https://developer.android.com/tools/agents/android-cli/download "Android CLI download options"
