# Lekka launch execution status

**Assessment date:** 2026-10-28
**Overall status:** **NOT READY** — implementation remains on the open, unmerged PR #23. The Android production bundle fails in Worklets/Babel, the database migration is not deployed, the live PostGIS catalog issue is unresolved, and no current-source APK or device/account acceptance evidence exists.

This register distinguishes source changes and automated checks from production/deployment/device evidence. A green local test does not certify a live migration, real authentication delivery, cross-account isolation, or a release artifact.

## Verified issue register

| Severity | Evidence and root cause | Implementation | Verification / remaining blocker |
|---|---|---|---|
| **Critical — production DB privileges** | Read-only query against project `vnitwsjidlurlwlpsmtf` found `anon` and `authenticated` with SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, and TRIGGER on `public.spatial_ref_sys`; all listed grants name `supabase_admin` as grantor. The table owner is `supabase_admin`. The connected `postgres` role is neither a member of that role nor a superuser, while `supabase_admin` is a superuser. Earlier remediation versions are recorded remotely but did not remove the effective grants. | No production DDL attempted. The verified owner/ACL boundary is documented in `supabase/README.md`. | **Open.** Requires an authorized Supabase owner/admin maintenance path and PostGIS compatibility verification. Do not resolve by enabling RLS or changing extension ownership/schema without a tested plan. |
| **High — private-community membership bypass** | Live `pg_policies` shows `community_members_self_insert` checked self-ownership and moderator status but did not require the community to be public or the caller to own it; the client calls `community_members.upsert` for joins. A crafted request could self-insert into a private community. | Added forward-only policy replacement in `supabase/migrations/20261028190000_harden_community_and_nearby_reads.sql`; ordinary public joins and owner membership remain supported. | Four migration-source regression tests pass. **Not applied to production**; requires a disposable/staging policy test and then approved deployment. |
| **High — nearby authorization consistency / unbounded radius** | Live definitions source and checked-in feeds clamp lower bounds but don't cap caller-supplied radius in every nearby read. The service-only media helper authorizes by caller-supplied coordinates/community membership but omitted author-private-profile and mutual block checks; callers can be real but proximity coordinates are not independently attested. | The new additive migration caps feed, detail, and server-only media radius at 50 km; validates coordinate ranges; adds private-profile/accepted-buddy and mutual-block checks to detail/feed/media authorization. | Four static migration regression tests pass. SQL has **not** been executed against a disposable PostgreSQL/PostGIS database, so policy/function behavior must be tested before deployment. Client-supplied coordinates remain an input, not cryptographic proof of physical presence. |
| **High — CI/reproducibility gaps** | The source had no lockfile while CI ran `npm install`; pnpm exposed undeclared audit imports. Run `40760954855` failed Expo config generation. Run `40762314143` first exposed a Worklets/Babel transform error in Reanimated `timing.ts`. Run `40766781520` then revealed that `react-native-css-interop@0.2.1` loads `@babel/plugin-transform-react-jsx` without declaring it, so pnpm could not resolve it. The direct dependency fixed that missing-module failure. Run `40768908525` now reaches the Worklets error: Babel generator receives an incomplete `TSFunctionType` node and throws `Cannot read properties of undefined (reading 'length')`; the same failure occurs in a clean local production export. | Added `pnpm-lock.yaml`, pinned pnpm 9.12.0 and frozen installs in GitHub Actions/Codemagic; declared `@babel/parser`, `@babel/plugin-transform-react-jsx`, `expo-doctor`, Tailwind CSS 3.4, and the CSS interop runtime; upgraded NativeWind/CSS interop together to 4.2.1/0.2.1; switched the custom plugin to Expo's supported `expo/config-plugins` export; aligned invariant checks with pnpm and set production mode for both Gradle variants. Added invariant coverage for the direct CSS interop JSX plugin. Temporary Babel-order experiments did not fix the Worklets failure and were reverted. | Run `40768908525` on `4b684de0afe02f4e44e134133d3a085930c465e9` passed code/tests and standard debug, but internal debug and the release gate failed at Worklets/Babel bundling. Current local TypeScript, tests, audits, frozen install, Expo dependency check, Expo Doctor (18/18), and production-mode prebuild pass. No current-source APK exists; the Worklets failure remains an open release blocker. ESLint exits successfully with 15 warnings. Expo SDK 54 documents automatic Reanimated Babel-plugin configuration [2]. |
| **Medium — small-screen authentication access** | The authentication form was a non-scrollable `View`, so password/signup controls could fall behind the Android keyboard on short screens. | Replaced the root content with a keyboard-aware `KeyboardAvoidingView` and `ScrollView` in `app/auth.tsx`. | TypeScript and lint pass; physical small-screen Android interaction remains untested. |
| **High — current APK not verified** | The in-repository `LEKKA_FINAL_RELEASE.md` references a historical APK/commit; no APK exists in the current sandbox. The ARM64 host lacks an Android SDK/ADB and EAS authentication, so only the Gradle wrapper can run locally. | Expo native prebuild succeeded locally. | Native build, exact-source APK metadata inspection, device install/launch, and release signing remain unverified until a corrected GitHub build succeeds. A debug artifact is for internal testing, not a production-signed release. |
| **High — Supabase history reconciliation** | Live project is `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.155, with recorded applied migrations through `20261017231856`. Several live version/name pairs differ from repository filenames, and remote history includes duplicate names. The migration-list integration exposes applied versions, not historical failed-attempt logs. | Documented real project details and a non-destructive reconciliation requirement in `supabase/README.md`. | **Open.** Reconcile exact schema and version/name mappings before applying the new migration; do not replay all local files. |
| **High — real-user/device acceptance** | Automated tests do not prove provider email delivery, multi-account RLS/storage isolation, notifications, Yoco checkout/webhooks, permissions, or offline recovery. The test suite explicitly skips Supabase credential-dependent checks in this environment. | Existing regression tests retained; migration tests added. | **Open.** Requires confirmed test accounts, valid CI integration credentials, provider setup, and Android hardware/emulator. No result is marked passed without observation. |

## Verification evidence on this branch

- `pnpm check` — PASS (TypeScript).
- `pnpm test` — PASS: **43 files passed, 1 skipped; 180 tests passed, 2 skipped**. The skipped cases include credential-dependent integration/configuration checks.
- `pnpm lint` — PASS with **0 errors and 15 warnings** in existing files.
- `pnpm audit:interactions` — PASS, 38 source files scanned.
- `pnpm audit:production` — PASS, 38 app route/source files checked.
- `pnpm exec expo config --type public` — PASS for the intended Lekka package configuration (`com.app.localradarsa`); public defaults only.
- `pnpm exec expo install --check` — PASS, dependencies aligned to Expo SDK 54.
- `pnpm exec expo-doctor` — PASS, 18/18 checks.
- `pnpm install --frozen-lockfile --ignore-scripts` — PASS, lockfile current.
- `CI=1 NODE_ENV=production pnpm exec expo export --platform android` — FAIL, reproduces the Worklets/Babel exception in Reanimated `timing.ts`; no release bundle or APK was produced.
- `CI=1 NODE_ENV=production pnpm exec expo prebuild --no-install --clean` — PASS; generated native Android project is ignored build output, not a source change.
- Previous main-branch GitHub run: [run 39985339494](https://github.com/WadeeMeenie/lekka/actions/runs/39985339494) succeeded on `d574bf56822b085555534279cb010f0cb5d61156` on 2026-10-23. This is **not** a check of the current branch.
- First current-branch GitHub run: [run 40760954855](https://github.com/WadeeMeenie/lekka/actions/runs/40760954855). Code/tests/Expo checks passed; Android failed at Expo config generation. The custom plugin now uses `expo/config-plugins`, and Gradle runs with `NODE_ENV=production`.
- Latest completed run: [run 40768908525](https://github.com/WadeeMeenie/lekka/actions/runs/40768908525) on `4b684de0afe02f4e44e134133d3a085930c465e9`. Code/tests passed; standard debug built; internal debug and release gate failed with the Worklets/Babel `TSFunctionType` exception. This confirms the missing CSS interop JSX plugin was fixed, but the app still cannot produce a bundled Android APK.

## Repository and production boundaries

- Repository: [WadeeMeenie/lekka](https://github.com/WadeeMeenie/lekka)
- Starting main commit: `d574bf56822b085555534279cb010f0cb5d61156`
- Implementation branch: `manus/launch-hardening-20261028`; [PR #23](https://github.com/WadeeMeenie/lekka/pull/23)
- The launch/security migration has not been applied to production. No live table, user record, Storage object, or function was changed in this work.
- Project metadata currently reports `ACTIVE_HEALTHY`, `eu-west-1`, PostgreSQL 17.6.1.155; that does not resolve the open `spatial_ref_sys` privilege finding.

## Launch decision and next gates

Do not ship or describe the product as production-ready until: (1) PostGIS owner-level grants are corrected and verified through a supported route, (2) live migration history/schema are reconciled, (3) the new RLS/functions are executed and tested in staging with anonymous, unrelated, owner, buddy, blocked, and community-member identities, (4) the exact-source Android APK is built and inspected, (5) device and multi-account acceptance is performed, and (6) the resulting commit passes published CI. The current verification-payment integration is test-mode only; it is not a live monetization release.


## Android build environment

Expo prebuild generated the native project, and Gradle 8.14.3 configured it successfully up to SDK discovery. The local host is ARM64 and has no Android SDK. The generated app currently requests Android compile/target SDK 36 and NDK 27.1.12297006. Google's current standalone Android CLI installer documentation lists Linux x86_64, not Linux ARM64, so the reproducible x86-64 GitHub Actions runner is the viable build path for this sandbox. [1]

**References**

[1]: https://developer.android.com/tools/agents/android-cli/download "Android CLI download options"
[2]: https://docs.expo.dev/versions/v54.0.0/sdk/reanimated/ "Expo SDK 54 Reanimated setup"
