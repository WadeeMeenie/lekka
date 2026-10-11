-- Keep PostGIS coordinate-system metadata readable for spatial operations,
-- but prevent public client roles from changing the shared reference catalogue.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.spatial_ref_sys
  FROM anon, authenticated;
GRANT SELECT ON TABLE public.spatial_ref_sys TO anon, authenticated;

-- ST_EstimatedExtent exposes metadata through SECURITY DEFINER overloads and is
-- not part of Lekka's client API. Remove default/public and client execution.
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text, boolean)
  FROM PUBLIC, anon, authenticated;

-- Fail loudly if this migration runs under a role that cannot revoke the
-- extension owner's grants. A silent no-op would leave the security issue open.
DO $$
BEGIN
  IF has_table_privilege('anon', 'public.spatial_ref_sys', 'INSERT')
     OR has_table_privilege('anon', 'public.spatial_ref_sys', 'UPDATE')
     OR has_table_privilege('anon', 'public.spatial_ref_sys', 'DELETE')
     OR has_table_privilege('authenticated', 'public.spatial_ref_sys', 'INSERT')
     OR has_table_privilege('authenticated', 'public.spatial_ref_sys', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.spatial_ref_sys', 'DELETE') THEN
    RAISE EXCEPTION 'Could not revoke client write access to spatial_ref_sys; apply with the table owner or a sufficiently privileged role.';
  END IF;
  IF has_function_privilege('anon', 'public.st_estimatedextent(text, text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.st_estimatedextent(text, text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.st_estimatedextent(text, text, text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.st_estimatedextent(text, text, text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.st_estimatedextent(text, text, text, boolean)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.st_estimatedextent(text, text, text, boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Could not revoke client EXECUTE on ST_EstimatedExtent; apply with sufficient privileges.';
  END IF;
END $$;
