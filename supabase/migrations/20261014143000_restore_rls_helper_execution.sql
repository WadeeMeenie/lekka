-- Repair RLS helper execution permissions.
--
-- These SECURITY DEFINER helpers are called from RLS policy expressions. The
-- caller must still have EXECUTE on them, even when the call originates inside
-- a policy. Each helper is self-scoped (target user/viewer must equal auth.uid()).
-- Grant only to authenticated clients; anonymous callers must not probe them.

grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.is_community_member(uuid, uuid) to authenticated;
grant execute on function public.is_community_owner(uuid, uuid) to authenticated;
grant execute on function public.can_manage_business(uuid, uuid) to authenticated;
grant execute on function public.is_business_manager(uuid, uuid) to authenticated;
grant execute on function public.can_view_full_profile(uuid, uuid) to authenticated;
grant execute on function public.is_profile_private(uuid) to authenticated;

revoke execute on function public.is_community_member(uuid, uuid) from public, anon;
revoke execute on function public.is_community_owner(uuid, uuid) from public, anon;

-- Not an application RPC; clients must not execute PostGIS extent estimators.
revoke execute on function public.st_estimatedextent(text, text) from public, anon, authenticated;
revoke execute on function public.st_estimatedextent(text, text, text) from public, anon, authenticated;
revoke execute on function public.st_estimatedextent(text, text, text, boolean) from public, anon, authenticated;
