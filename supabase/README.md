# Lekka Supabase backend

Lekka uses the **existing** Supabase project `vnitwsjidlurlwlpsmtf` (`local-radar-sa`) in `eu-west-1`. The connected project metadata reported `ACTIVE_HEALTHY` and PostgreSQL `17.6.1.155` on 2026-10-28. Do not create a replacement project or replay the repository migration directory against production.

The application uses the public client variables `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Privileged credentials belong only in server-side Supabase secrets and must never be included in the mobile app.

## Current migration state (read-only check, 2026-10-28)

Supabase's recorded migration list currently ends at version `20261017231856` (`remediate_postgis_metadata_client_privileges`). The live history has multiple version/name pairs that differ from the filenames in `supabase/migrations`, including migrations previously applied directly to production and two separate recorded versions named `protect_profile_role`. The remote migration-list API reports applied rows but does not provide failed-attempt logs; it therefore does not establish whether an older dashboard status labelled a migration failure was later repaired. Reconcile remote schema, history, and repository source before production changes.

The additive migration `20261028190000_harden_community_and_nearby_reads.sql` is **local to the implementation branch and has not been applied**. It is subject to SQL execution, authorization, and migration-history verification before release.

## Verified production security blocker

A read-only catalog query on 2026-10-28 found `anon` and `authenticated` with SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, and TRIGGER privileges on `public.spatial_ref_sys`; the recorded grantor is `supabase_admin`. The table is owned by `supabase_admin`, which is a superuser. The SQL integration session ran as `postgres`, which is not a superuser and is not a member of the owner role. The project has recorded prior remediation migrations, but those live grants remain. Do not claim the historical PostGIS finding is resolved. Do not try repeated client-role revokes, enable RLS on the extension-owned relation, transfer ownership, or change the extension schema without the supported Supabase owner/admin path and a verified PostGIS compatibility plan. See [`docs/LAUNCH_EXECUTION_STATUS.md`](../docs/LAUNCH_EXECUTION_STATUS.md).

The project is otherwise reported `ACTIVE_HEALTHY`; read-only migration inspection returned applied history through the version above. This is not proof that every historical migration attempt succeeded or that the production policy surface has passed cross-account tests. User-account, device, storage-expiry, and payment-provider acceptance checks remain separate release gates.

## Local setup and verification

1. Install the pinned dependencies from the repository root using `pnpm install --frozen-lockfile`.
2. Copy `.env.example` to `.env` and set the target project URL and its publishable key.
3. Run `pnpm check`, `pnpm test`, `pnpm audit:production`, and `pnpm lint`.
4. Inspect each migration and compare it with the live project history before applying it. Never use a blanket reset against the existing production database.
5. For schema changes, use a disposable/staging database where available, test fresh installation and authorization cases, then follow the approved production migration process. Keep backups and a rollback plan.

The client must not use the service-role key. Keep Edge Function secrets in the Supabase project secret store and verify each function's deployed version and authorization separately from its checked-in source.
