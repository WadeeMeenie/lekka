-- Backward-compatible compatibility overload for deployed Edge Functions.
-- The supplied UUID is intentionally ignored; callers can only learn their own admin status.
create or replace function public.is_platform_admin(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select public.is_platform_admin();
$function$;

revoke all on function public.is_platform_admin(uuid) from public, anon;
grant execute on function public.is_platform_admin(uuid) to authenticated;
