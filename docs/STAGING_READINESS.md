# Lekka staging readiness — 14 October 2026

## 1. Environment

Staging **BLOCKED / not provisioned**. Organization selected by user for a cost quote: WadeeMeenie's Org (`ezuqyiivnqdvrfsadntr`), Free plan. Both connected accounts return the same organization and projects. Production `local-radar-sa`, `vnitwsjidlurlwlpsmtf`, eu-west-1, PostgreSQL 17.6, is ACTIVE_HEALTHY. Its only listed branch is main, with MIGRATIONS_FAILED; this status is not a successful replay. The exact historical failure log has not been retrieved.

Other projects: payflow-sa (`aavubupmqnwpsjdrdhsk`, inactive) and printkings (`vmjapprncqkyabcabqfa`, active). Neither is identified as disposable or suitable for Lekka. Do not repurpose them.

Proposed new project: **lekka-staging**, eu-west-1, empty database, no production data/Auth/media import, staging-specific Auth redirects and email delivery, private media bucket, reviewed application migrations and Edge Functions. Payment integrations must remain test-only and unrelated Cape Aloe application resources excluded unless a dependency review proves necessary. PostgreSQL major version should match production where provisioning permits.

The account-specific get_cost tool returned `UNAVAILABLE: MCP tool get_cost was not returned by tools/list`. No cost confirmation, project creation, subscription change or infrastructure charge was initiated. Official pricing lists two active Free projects; this organization already has two. Pro starts at USD 25/month with additional projects from USD 10/month. This is published pricing, **not an account-specific quote**; upgrading this organization may affect billing for its existing projects. Obtain the actual dashboard quote and explicit authorization before proceeding. Sources checked 2026-10-14: https://supabase.com/pricing and https://supabase.com/docs/guides/platform/billing-faq.

## 2. Accounts

| Logical label | Auth ID | Created |
|---|---|---|
| lekka-test-owner | none | No |
| lekka-test-member-a | none | No |
| lekka-test-member-b | none | No |
| lekka-test-outsider | none | No |
| lekka-test-admin | none | No |

After provisioning: obtain an approved test email domain or staging mail sink. Generate unique run-scoped addresses and cryptographically random per-account passwords in a server-side test runner. Store credentials only in the approved secret store or ephemeral runner memory. Exercise normal signup/confirmation for the signup test; admin-created confirmed users must not count as signup verification. Record only projectRef, runId, logical labels and returned Auth UUIDs in a staging-only manifest. Never infer disposability from existing email addresses. Admin membership requires an explicit staging fixture, never editable user_metadata. No domain or credential store has yet been approved.

## 3. Changes

- `lib/staging-target.ts`: exact HTTPS project-host validation, hard production deny, explicit environment/reference confirmation and run-manifest validation.
- `lib/supabase.ts`: staging frontend refuses missing or production project configuration before creating a client.
- `.env.staging.example`: blank staging-specific settings; no production fallback or secrets.
- `scripts/staging/preflight.mjs`: read-only Auth reachability probe, publishable key only, no redirects, timeout, sanitized output. Node 22.18+ or 24 required for the TypeScript module import.
- `scripts/staging/audit-migrations.mjs`: local filename inventory; fails on duplicate versions without contacting a database.
- `tests/staging-target.test.ts`: 21 isolation regressions. No database migration, policy or account was modified.

The guard is required at the start of every future seed/test/cleanup runner. It is a target validation layer, not proof that an arbitrary non-production project is authorized. Confirm the newly provisioned project through management tools first. Cleanup implementation is deferred until the real schema and test fixtures are verified: guard target, validate manifest, verify each Auth user's run marker and explicit ID, preview exact owned records, delete only manifest-owned fixtures in dependency order, then delete those Auth identities. Never bulk-delete by email prefix or table-wide predicate. There is no executable destructive cleanup in this candidate.

## 4. Tests and migration evidence

PASS: 21 new isolation tests, including frontend production refusal. Full local suite: **165 passed, 2 skipped**, 33 files (32 passed, one skipped). TypeScript and diff whitespace check pass. Unconfigured staging preflight exits 1 as intended, without a network request. No staging integration test has run.

Repository: **84 SQL migration files**, **9 duplicated version prefixes**. Live production history: **88 recorded migrations**, only **11 repository files match a live version ID**. Version matches alone do not prove statement equivalence. Production contains later entries absent by exact version in the checkout, including profile/avatar/community RPC repairs. Do not rename applied migrations or mark production history repaired. Build a reviewed staging-only replay plan mapping file contents, ordering/dependencies and actual definitions; validate it on a fresh isolated database. The present history cannot be declared replayable. The failed branch's underlying error is not proven to be the duplicate prefixes.

BLOCKED: signup/confirmation/recovery, post/community workflow, cross-account denial, private media, Realtime leakage, cleanup, full schema replay. No test account or service configuration exists yet.

Earlier code candidate ef86720c84da54b02b33bf47a66dd10b7e46712c passed GitHub code/tests/web export/Expo doctor. Android was still in progress at the last check: https://github.com/WadeeMeenie/lekka/actions/runs/38532536970. That result does not cover subsequent staging guard edits.

## 5. Security findings from read-only production inspection

| ID / severity | Resource / evidence | Remediation and verification required |
|---|---|---|
| S01 Critical | public.spatial_ref_sys has RLS disabled and anon/authenticated INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER privileges. Effective UPDATE checks return true. Owner is supabase_admin; connected SQL session is postgres. | Owner-assisted, separately approved privilege repair. Existing migration 20261011083000 includes revocations/assertions but is not recorded under that version. Preserve required spatial reads; validate grants and denied writes on staging first. Do not assume repeated REVOKE under postgres repairs owner grants. |
| S02 High | All three public.st_estimatedextent overloads are SECURITY DEFINER and executable by anon/authenticated despite hardening history entries. | Resolve effective grants with extension owner; revoke inappropriate execution through a reviewed migration and verify each overload. No exploit or data mutation attempted. |
| S03 High, definition evidence | Two PERMISSIVE posts INSERT policies combine with OR: one enforces business membership but omits community membership; the other checks community membership but omits business authorization. The inspected moderation trigger does not add INSERT membership checks. | Reproduce business impersonation/private-community insertion with synthetic staging fixtures, then consolidate authorization using ownership AND business AND community predicates. No live attack executed. |
| S04 High, definition evidence | nearby_feed_posts, nearby_feed_posts_page and nearby_post_detail run as owner and omit block/private-profile checks present in direct posts SELECT policy; radius has a floor but no ceiling. | Staging tests must compare direct and RPC access for blocked/private authors and geographic bounds. Repair all paths consistently after reproduction. |
| S05 Medium | Private local-radar-media bucket has no bucket-level file_size_limit or allowed_mime_types. | Define supported media limits and test allowed/denied upload types/sizes in staging. |
| S06 Medium / plan dependency | Leaked-password protection disabled; official pricing lists it outside Free. | Select suitable Auth protection/plan with billing approval; verify signup behavior. |

Community member/owner helpers have empty search_path and require auth.uid plus caller equality; anonymous EXECUTE alone is not proof of a data leak. Five RLS-enabled service tables have no policies: assess intentional service-only access rather than adding public policies. Performance advisors: 39 auth-per-row findings, 58 multiple-permissive-policy findings, 26 unused-index findings. Do not remove indexes based on a lightly used database; measure staging plans/load first.

Advisor references: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public ; https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable ; https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan .

## 6. Production safety

Performed only project/organization/branch/function/migration listings, advisor reads and SELECT queries over catalogs, grants, function definitions and bucket configuration. Saved metadata contains no Auth user rows, passwords, tokens or media. No production DDL/DML, Auth administration, function deployment, credential change, billing change, seeding, destructive tests or cleanup was issued. This is an operation record, not a claim to have independently audited all external actors' activity.

## 7. Blockers

Account-specific cost tool unavailable; project provisioning and any billing changes unapproved; no staging project, approved test email domain or secret store; migration ordering/drift unresolved; no isolated database runtime currently configured. Production security findings remain open. Staging and public launch are NOT READY.

## 8. Next action

Obtain the dashboard's account-specific quote for lekka-staging in the selected organization, then approve that exact cost and provisioning configuration. Do not upgrade, pause unrelated projects or create infrastructure to bypass this boundary. After creation, verify the new reference and migration replay plan before enabling seed/test operations.
