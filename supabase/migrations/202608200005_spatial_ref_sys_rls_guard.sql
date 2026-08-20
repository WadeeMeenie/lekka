-- Guard the PostGIS CRS metadata table from ordinary PostgREST roles.
-- Do not FORCE RLS: the table owner/PostGIS internals retain access.
alter table public.spatial_ref_sys enable row level security;
