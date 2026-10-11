# Lekka production-readiness audit — 2026-10-11

## Verdict

**NOT READY.** The application has a passing local type/build/static baseline, but the auditable Git checkout is not the same source as the deployed Supabase backend. Production still has unresolved PostGIS exposure findings, the live integration check returned 401, and key operational/release evidence is missing.

## Actual project state

- Repository: `https://github.com/WadeeMeenie/lekka`
- Audited branch/SHA: `main`, `b0ee8fa7cb199b1e2b8b7bc2deb666dfecc985b8`
- Audit branch created: `audit/production-readiness-2026-10-11`
- Open PR: #9, `fix/production-hardening-social-state-2026-10-11`, head `b5bf8d69798c2f9aaea763ea6304ec003d9f0621`, all three code/Android/release checks successful, Supabase Preview skipped.
- Architecture: Expo Router React Native app for Android/iOS/web; Supabase Auth/Postgres/PostGIS/Storage/Realtime/Edge Functions; small Express/tRPC server.
- Backend: Supabase project `vnitwsjidlurlwlpsmtf`, `local-radar-sa`, `eu-west-1`, active/healthy.
- Repository migrations: 65 SQL files, last dated 2026-09-06. Live history continues through migration `20261011195846`.

## Baseline commands and results

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | **FAIL**: workspace declares no `packages` and no `pnpm-lock.yaml` exists. |
| `npm install --no-audit --no-fund` | **PASS**, generated a temporary untracked lockfile which was removed. |
| `npm run check` | **PASS** |
| `npm run audit:interactions` | **PASS**, 37 source files scanned. |
| `npm run audit:production` | **PASS**, 37 route/source files checked. |
| `npm test -- --reporter=dot` | **FAIL**: 104 passed, 1 failed, 2 skipped. The REST integration test expected 200 and received 401. |
| `npm run lint` | **PASS with 14 warnings**, no errors. |
| `npx expo config --type public` | **PASS** |
| `npm run build` | **PASS**, generated `dist/index.js`. |
| Android/native build | **NOT VERIFIED locally**; only historical PR CI evidence exists. |

## Findings register

### P1 — Reflective credentialed CORS (fixed locally)

**Evidence:** `server/_core/index.ts` reflected every supplied `Origin` and enabled credentials, allowing an arbitrary website to attempt browser requests with Lekka cookies.

**Fix:** added `server/_core/cors.ts` with explicit configured origins and a narrowly scoped local preview mapping. Disallowed origins now receive HTTP 403. Added `tests/cors.security.test.ts` covering production allowlists, authoritative production configuration, preview origins, localhost, malformed origins, and credential-bearing origins.

**Verification:** `npm run check`, focused CORS tests, full tests without live integration credentials, lint, build, and `git diff --check` pass. Deployment and browser verification remain outstanding.

### P1 — Production source drift blocks reproducible release

**Evidence:** live migration history includes later Yoco, RLS, PostGIS, grant, and product migrations through `20261011195846`; Git checkout ends at `20260906071000`. Production Edge Functions are active at newer versions and include `yoco-create-checkout-v2` plus server-only RPC calls absent from this checkout.

**Impact:** a build from Git cannot be assumed to reproduce the deployed backend or payment behavior. Applying the missing changes automatically could overwrite or duplicate production behavior.

**Action taken:** documented as a release blocker; no live mutation performed.

**Required fix:** choose the authoritative source, export/review the deployed migration/function delta, commit traceable migrations and source, then validate from the exact candidate SHA.

### P1 — PostGIS metadata exposure remains effective

**Evidence:** Supabase security advisor still reports three `public.st_estimatedextent` overloads executable by `anon`; direct SQL confirmed `anon`, `authenticated`, and `public` can execute all three. `public.spatial_ref_sys` has RLS disabled and is selectable by `anon`, `authenticated`, and `public`.

**Impact:** public API exposure of extension-owned metadata and privileged helper execution.

**Action taken:** did not repeat the repository revoke migration because it already failed to change effective grants. Documented the need for supported elevated-owner/Supabase remediation.

**Required fix:** owner/platform-supported remediation, then repeat effective grant and advisor checks.

### P1 — Yoco source and deployment are inconsistent

**Evidence:** repository checkout calls client-authorized `create_yoco_payment_order` with caller-supplied amount and uses older status RPCs. Deployed production uses `create_yoco_payment_order_server`, `attach_yoco_checkout_server`, and `set_payment_order_status_from_yoco_verified`; the latter checks ZAR and matches paid amount to the order. Deployed webhook accepts current event names and verified checkout identity.

**Impact:** source review and release validation would not cover the payment path actually deployed. No payment readiness claim is justified.

**Action taken:** no payment or live configuration was changed.

**Required fix:** reconcile deployed source into Git and add regression tests for amount/currency mismatch, duplicate events, refund transitions, missing checkout ID, and server-only execution.

### P2 — Supabase REST integration check is not passing

**Evidence:** `tests/supabase.connection.test.ts` returned HTTP 401 with the configured project URL and repository publishable-key value used by CI-style configuration. No write was attempted.

**Impact:** live integration health and key validity are not proven by the local test.

**Follow-up evidence:** the Supabase project API reports the modern publishable key as enabled, but direct requests using it as `apikey` return `401 Invalid API key`. The legacy anon key succeeds, including when paired with the modern key as Bearer. This points to a project gateway/key configuration mismatch rather than a test-only header issue.

**Required fix:** have the Supabase/project owner correct or rotate the modern publishable key configuration, without printing or committing key material. Do not silently downgrade the client architecture to legacy anon. Rerun the test at the candidate SHA after correction.

### P2 — Auth leaked-password protection disabled

**Evidence:** Supabase security advisor reports `auth_leaked_password_protection` disabled.

**Required fix:** enable through supported Auth settings if plan permits, then record the setting and validation evidence.

### P2 — RLS-enabled tables lack policies

**Evidence:** advisor and direct query report no policies on `cape_aloe_order_items`, `cape_aloe_orders`, `cape_aloe_yoco_events`, `media_cleanup_queue`, and `yoco_webhook_events`.

**Required fix:** classify each table as server-only or client-facing; add explicit least-privilege grants/policies through reviewed migrations, or document why server-only access is intentional and verify grants.

### P3 — Lint and package-manager hygiene

**Evidence:** 14 lint warnings and an unusable frozen pnpm workflow declaration. CI currently installs with npm, while `package.json` declares pnpm 9.12.0.

**Required fix:** choose one supported package manager, commit its lockfile, and resolve actionable hook/unused-code warnings without unrelated refactors.

## Changes actually made

- Created the non-destructive audit branch `audit/production-readiness-2026-10-11`.
- Added the required repository guidance and release artifacts: `AGENTS.md`, `PRODUCT_SPEC.md`, `docs/RELEASE_READINESS.md`, `docs/SECURITY.md`, `docs/PRODUCTION_SCALE_PLAN.md`, `.ai/STATE.md`, and this report.
- Hardened credentialed CORS in `server/_core/index.ts`, added `server/_core/cors.ts`, and added `tests/cors.security.test.ts`.
- No database migration was applied. No Edge Function was deployed. No customer data, payment, branch merge, force-push, or PR merge was performed.

## External evidence

- Supabase project inventory, table/RLS metadata, migration history, Edge Function inventory/source, advisor results, and bounded read-only SQL were obtained from the configured project.
- Yoco’s official webhook guidance confirms raw-body signing with `webhook-id`, `webhook-timestamp`, HMAC-SHA256, base64 comparison, and a replay threshold up to three minutes: https://developer.yoco.com/online/api-reference/webhooks/verifying-events/
- Supabase RLS guidance: https://supabase.com/docs/guides/database/postgres/row-level-security

## Highest-priority next actions

1. Platform owner reconciles production drift into a reviewable Git branch.
2. Supabase owner resolves the effective PostGIS grants or obtains supported elevated-owner remediation.
3. Payment owner aligns repository code/tests with deployed verified Yoco functions and confirms event schemas from the sandbox.
4. CI/release owner repairs the 401 integration check and runs Android/native validation at the exact candidate SHA.
5. Operations owner performs a backup/restore drill and documents rollback, monitoring, queue, and webhook-reconciliation evidence.
