-- PostGIS installs SECURITY DEFINER helper functions in public with broad default
-- execute privileges. Lekka does not expose ST_EstimatedExtent through its API,
-- so remove anonymous/authenticated/public execution while leaving service_role
-- available for trusted server-side tooling.

revoke execute on function public.st_estimatedextent(text, text) from anon, authenticated, public;
revoke execute on function public.st_estimatedextent(text, text, text) from anon, authenticated, public;
revoke execute on function public.st_estimatedextent(text, text, text, boolean) from anon, authenticated, public;
