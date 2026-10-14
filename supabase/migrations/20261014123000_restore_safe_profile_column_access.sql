-- Restore only the public profile fields required by authenticated social UI.
-- The previous privilege lockdown correctly removed broad table access, but
-- PostgREST embeds and username checks now fail because even safe columns are
-- not selectable. Keep private identity/location fields ungranted and enforce
-- private-profile visibility in the row policy.

begin;

revoke all on table public.profiles from anon, authenticated;

revoke select (
  bio,
  interests,
  home_area,
  preferred_radius_m,
  role,
  approximate_location,
  location_visibility,
  created_at,
  updated_at,
  account_intent,
  is_private,
  friends_list_visibility
) on table public.profiles from anon, authenticated;

revoke insert (
  id,
  display_name,
  username,
  bio,
  profile_image_path,
  interests,
  home_area,
  preferred_radius_m,
  role,
  approximate_location,
  location_visibility,
  created_at,
  updated_at,
  account_intent,
  is_private,
  friends_list_visibility
) on table public.profiles from anon, authenticated;

revoke update (
  id,
  display_name,
  username,
  bio,
  interests,
  home_area,
  preferred_radius_m,
  role,
  approximate_location,
  location_visibility,
  created_at,
  updated_at,
  account_intent,
  profile_image_path,
  is_private,
  friends_list_visibility
) on table public.profiles from anon, authenticated;

grant select (id, display_name, username, profile_image_path)
  on table public.profiles to authenticated;

-- Privacy preferences are changed through the existing owner-scoped UI flow.
-- Restrict direct UPDATE to these two preference columns; the existing
-- profiles_self_write policy limits the row to auth.uid() = id.
grant update (is_private, friends_list_visibility)
  on table public.profiles to authenticated;

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read
  on public.profiles
  for select
  to authenticated
  using (
    (select auth.uid()) = id
    or not public.is_profile_private(id)
    or public.can_view_full_profile((select auth.uid()), id)
  );

commit;
