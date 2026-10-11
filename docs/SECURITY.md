# Security status

## Confirmed production findings

### Fixed locally — session JWT fail-closed and app binding

The server SDK now refuses to sign or verify sessions when `VITE_APP_ID` is missing or `JWT_SECRET` is shorter than 32 characters, and rejects otherwise-valid tokens whose `appId` does not match the current application. Empty display names remain valid because they are not authorization claims. This fix is local and not deployed.

### Follow-up — OAuth login-CSRF state binding

The OAuth `state` value is currently a base64-encoded redirect URI rather than a browser-bound nonce. The provider exchange may add protection, but the server does not independently bind the callback to the initiating browser session. Add a server-issued state nonce or document provider-level protection before broad web launch.

### Fixed locally — reflective credentialed CORS

The server previously reflected any request `Origin` while sending `Access-Control-Allow-Credentials: true`. The audit branch now requires an explicit `CORS_ALLOWED_ORIGINS` match in configured environments or the paired local preview frontend when unset, rejects disallowed origins with HTTP 403, and adds focused regression tests. This fix is committed locally but is not deployed.

### Fixed locally — public storage proxy scope

The public `/manus-storage/*` route previously used a service-backed presign operation for any caller-supplied key. It now decodes and validates keys, rejects traversal-like paths, and only permits configured public prefixes via `PUBLIC_STORAGE_PREFIXES` (default: `generated/`). Private namespaces return a non-disclosing 404. This fix is local and requires deployment configuration review.

### P1 — PostGIS API exposure remains effective

Supabase security advisors reported that `public.st_estimatedextent(text,text)`, the three-argument overload, and the four-argument overload are executable by `anon`, `authenticated`, and `public`. Direct read-only SQL verification on 2026-10-11 confirmed all three effective grants remain true. `public.spatial_ref_sys` is public, has RLS disabled, and is selectable by `anon`, `authenticated`, and `public`.

The repository contains a revoke migration, and two additional live migrations were recorded on 2026-10-11, but none changed the raw ACL. The live migration runner is `postgres` while all three extension-owned functions are owned by `supabase_admin`; `postgres` cannot assume that role (`pg_has_role` returned false), so the revokes are no-ops. Do not change extension ownership. Backend/platform must run the revoke through a supported elevated-owner path or obtain Supabase remediation. Evidence required: advisor result and `has_function_privilege`/raw `proacl` queries showing the grants are removed or an accepted supported exception.

### P1 — Production/repository security drift

Production migration history extends beyond the audited checkout and includes later Yoco, PostGIS, RLS, and privilege changes. Deployed Yoco functions are newer than the repository copies. Until the exact source of truth is selected and reconciled, the release candidate cannot be reproduced from Git.

### P2 — RLS-enabled tables with no policies

The advisor reports no policies on `cape_aloe_order_items`, `cape_aloe_orders`, `cape_aloe_yoco_events`, `media_cleanup_queue`, and `yoco_webhook_events`. Their grants and intended access must be documented and verified. Server-only tables should have explicit least-privilege grants; client-facing tables need explicit policies.

### P2 — Auth password breach protection disabled

Supabase reports leaked-password protection disabled. Enable it in the supported Auth settings if the project plan permits, then capture the setting and a safe test result. Do not replace it with client-side password rules.

## Controls observed

The repository and deployed Yoco webhook both use raw-body HMAC-SHA256 verification, timestamp skew checking, constant-time comparison, event-id idempotency, and server-only payment status mutation. Deployed production RPCs also validate checkout identity, amount, and ZAR currency. These controls must be brought under version control before release.

## Evidence and references

- Supabase advisors and live privilege queries were collected during the 2026-10-11 audit.
- Yoco signature guidance: https://developer.yoco.com/online/api-reference/webhooks/verifying-events/
- Supabase RLS policy guidance: https://supabase.com/docs/guides/database/row-level-security

## Closure-pass update — 2026-10-11

The live migration ledger and deployed Edge Function source were rechecked read-only. Production remains ahead of Git. The repository now aligns its Yoco checkout and webhook source with the server-only verified contract and adds `tests/yoco-source-alignment.security.test.ts`; no Edge Function was deployed. The deployed primary checkout function still requires the reviewed control-flow fix, so payment status remains blocked. See `docs/MIGRATION_PARITY_2026-10-11.md`, `docs/POSTGIS_REMEDIATION_2026-10-11.md`, and `docs/YOCO_SOURCE_ALIGNMENT_2026-10-11.md`.

The five RLS-enabled/no-policy tables remain intentionally server-only based on their effective grants; adding broad client policies would weaken least privilege. PostGIS client execution remains effective and requires the elevated-owner action in the dedicated remediation report. Leaked-password protection, backup/restore, monitoring, legal/privacy, and native-device evidence remain unverified.
