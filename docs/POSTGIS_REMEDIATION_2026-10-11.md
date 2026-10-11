# PostGIS remediation and verification — 2026-10-11

## Status: BLOCKED

The three public overloads remain executable by `PUBLIC`, `anon`, `authenticated`, and `service_role`:

- `public.st_estimatedextent(text,text)`
- `public.st_estimatedextent(text,text,text)`
- `public.st_estimatedextent(text,text,text,boolean)`

Read-only SQL confirmed all three functions are owned by `supabase_admin`, have `proacl` entries granting `X` to `PUBLIC`, `anon`, and `authenticated`, and return `true` from `has_function_privilege` for those roles. The live migration runner is `postgres`, and `pg_has_role('postgres','supabase_admin','USAGE')` was previously verified false. The two live revoke migrations therefore did not change the effective ACL.

## Related exposure

`public.spatial_ref_sys` is a public table with RLS disabled. Current table privilege inspection and Supabase security advisors continue to flag it. The repository has already removed ordinary client table writes in source/live migration history, but the extension remains in the public schema.

## Required elevated action

A Supabase-supported platform/admin owner must either revoke client execution from all three exact signatures or move the extension/function exposure out of the public API surface. The least-privilege ACL action, to be executed only through an owner-supported path, is:

```sql
revoke execute on function public.st_estimatedextent(text, text) from public, anon, authenticated;
revoke execute on function public.st_estimatedextent(text, text, text) from public, anon, authenticated;
revoke execute on function public.st_estimatedextent(text, text, text, boolean) from public, anon, authenticated;
```

Do not revoke `service_role` unless the platform confirms the function is unused by trusted server paths. Do not change extension ownership or apply another ordinary migration that cannot alter the owner ACL.

## Verification query

After the elevated action, run this read-only query and require all client booleans to be false before calling the blocker closed:

```sql
select p.oid::regprocedure as signature,
       pg_get_userbyid(p.proowner) as owner,
       p.proacl,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('public', p.oid, 'EXECUTE') as public_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'st_estimatedextent'
order by p.oid
limit 20;
```

Then rerun the Supabase security advisor and verify the `anon_security_definer_function_executable` and `authenticated_security_definer_function_executable` findings no longer include these overloads. Until both checks pass, status remains **BLOCKED**.
