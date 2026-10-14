-- Prevent anonymous and authenticated API roles from reading PostGIS reference metadata.
-- PostGIS operations continue to run under their function/table owner where required.
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.spatial_ref_sys FROM PUBLIC, anon, authenticated;
