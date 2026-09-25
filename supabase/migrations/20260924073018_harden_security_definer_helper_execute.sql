-- Reduce exposed SECURITY DEFINER helper surface.
-- These helpers are policy/internal primitives; callers do not need direct Data API EXECUTE.
revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.is_community_member(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.is_community_owner(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.can_manage_business(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.is_business_manager(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.can_view_full_profile(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.is_profile_private(uuid) from public, anon, authenticated;
revoke execute on function public.prevent_business_verification_tampering() from public, anon, authenticated;

-- The compatibility overload was only needed while the webhook function used the old signature.
-- The webhook now uses the self-scoped no-argument admin check.
drop function if exists public.is_platform_admin(uuid);
