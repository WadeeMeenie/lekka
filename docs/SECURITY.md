# Security status

## Confirmed production findings

### Fixed locally — reflective credentialed CORS

The server previously reflected any request `Origin` while sending `Access-Control-Allow-Credentials: true`. The audit branch now requires an explicit `CORS_ALLOWED_ORIGINS` match in configured environments or the paired local preview frontend when unset, rejects disallowed origins with HTTP 403, and adds focused regression tests. This fix is committed locally but is not deployed.

### Fixed locally — public storage proxy scope

The public `/manus-storage/*` route previously used a service-backed presign operation for any caller-supplied key. It now decodes and validates keys, rejects traversal-like paths, and only permits configured public prefixes via `PUBLIC_STORAGE_PREFIXES` (default: `generated/`). Private namespaces return a non-disclosing 404. This fix is local and requires deployment configuration review.

### P1 — PostGIS API exposure remains effective

Supabase security advisors reported that `public.st_estimatedextent(text,text)`, the three-argument overload, and the four-argument overload are executable by `anon`, `authenticated`, and `public`. Direct read-only SQL verification on 2026-10-11 confirmed all three effective grants remain true. `public.spatial_ref_sys` is public, has RLS disabled, and is selectable by `anon`, `authenticated`, and `public`.

The repository contains a revoke migration, but it did not change effective grants. Do not repeat it blindly. Determine whether these extension-owned objects require an elevated owner or Supabase support remediation. Owner: backend/platform. Evidence required: advisor result and `has_function_privilege`/table privilege queries showing the grants are removed or an accepted supported exception.

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
- Supabase RLS policy guidance: https://supabase.com/docs/guides/database/postgres/row-level-security
