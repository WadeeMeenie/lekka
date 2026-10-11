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
