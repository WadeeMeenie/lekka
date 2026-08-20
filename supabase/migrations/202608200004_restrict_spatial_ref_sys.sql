-- Remove direct PostgREST access to PostGIS CRS metadata from ordinary application roles.
-- Keep the table owned by Supabase/Postgres so PostGIS internals remain available.
revoke all on table public.spatial_ref_sys from public, anon, authenticated;
