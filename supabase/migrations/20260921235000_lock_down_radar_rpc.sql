-- Radar is an authenticated, location-sensitive feature. Do not expose its RPC to anonymous callers.
revoke execute on function public.nearby_radar(double precision, double precision, double precision, text) from anon;
grant execute on function public.nearby_radar(double precision, double precision, double precision, text) to authenticated;
