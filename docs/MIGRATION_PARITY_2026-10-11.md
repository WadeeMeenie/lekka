# Migration parity report — 2026-10-11

## Verdict

**BLOCKED for reproducible release.** The active Supabase project is healthy, but its migration ledger and deployed Edge Functions are materially ahead of the approved Git branch.

## Evidence

The repository contains 65 SQL files and ends at the 2026-09-06 migration set. The live project `local-radar-sa` (`vnitwsjidlurlwlpsmtf`) has recorded migrations through `20261011203434`, including later payment, RLS, PostGIS, grant, index, and atomic social changes.

The current live tail is:

| Live version | Name | Parity status |
|---|---|---|
| 20261011192054 | verify_yoco_payment_amount_currency_20261011 | Missing from Git |
| 20261011192351 | lock_down_yoco_order_creation_20261011 | Missing from Git |
| 20261011192757 | fix_yoco_rpc_coalesce_20261011 | Missing from Git |
| 20261011195846 | restrict_postgis_metadata_rpc_and_table_writes | Missing from Git |
| 20261011203402 | revoke_public_st_estimatedextent_execute_20261011 | Missing from Git; ineffective in live ACL verification |
| 20261011203434 | revoke_all_client_st_estimatedextent_privileges_20261011 | Missing from Git; ineffective in live ACL verification |

The live project also has active Edge Functions absent from the repository’s complete source history: `yoco-create-checkout-v2` v10 and newer deployed versions of `yoco-create-checkout`, `yoco-webhook`, `yoco-return`, and `yoco-webhook-subscription`.

The repository itself has seven duplicate migration-version groups, including `202608230001`, `202608230002`, `202608230007`, and `202608240001`. These are not automatically equivalent to live migration versions because the live ledger uses generated timestamps and has already applied a different ordered history. They must be retained as historical source files and reconciled through a fresh ordered migration plan, not renamed or deleted casually.

The current live tail verified read-only is:

```text
20261011082007 restrict_postgis_metadata_client_access
20261011114123 index_posts_community_pinned_by_20261011
20261011114344 toggle_block_atomic_20261011
20261011114429 toggle_post_like_atomic_20261011
20261011192054 verify_yoco_payment_amount_currency_20261011
20261011192351 lock_down_yoco_order_creation_20261011
20261011192757 fix_yoco_rpc_coalesce_20261011
20261011195846 restrict_postgis_metadata_rpc_and_table_writes
20261011203402 revoke_public_st_estimatedextent_execute_20261011
20261011203434 revoke_all_client_st_estimatedextent_privileges_20261011
```

## Classification

The missing migrations are not safe to recreate from names alone. They must be exported or reconstructed from reviewed deployed definitions, assigned new monotonic migration names where required, and tested on a disposable branch. The two PostGIS revoke records must not be treated as effective remediation because the function owner is `supabase_admin` while ordinary migration execution is `postgres`.

The five RLS-no-policy tables are server-only by effective ACL: `anon` and `authenticated` have no table privileges, while `service_role` retains access. No client-facing policy should be added merely to silence the advisor.

## Safe reconciliation plan

1. Freeze the candidate SHA and declare whether Git or the deployed project is authoritative.
2. Export and review live function definitions and relevant table/function ACLs.
3. Reconstruct missing migrations in a review branch with explicit idempotency and pre/post assertions.
4. Test the migration sequence on a fresh Supabase branch, not production.
5. Run schema, RLS, payment, and Edge Function contract tests against the candidate SHA.
6. Obtain explicit owner approval before any production migration or Edge Function deployment.

No production mutation or deployment was performed during this closure pass. The exact live read-only evidence is preserved in `docs/evidence_live_production_2026-10-11.md`.
