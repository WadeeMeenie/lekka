-- Restore only the public profile fields required by authenticated social UI.
-- The previous privilege lockdown correctly removed broad table access, but
-- PostgREST embeds and username checks now fail because even safe columns are
-- not selectable. Keep private identity/location fields ungranted and enforce
-- private-profile visibility in the row policy.

begin;

revoke all on table public.profiles from anon, authenticated;

revoke select (
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

-- Keep all profile writes behind a narrow owner-scoped RPC rather than
-- granting direct UPDATE privileges on profile columns to the client.
create or replace function public.update_my_profile_privacy(
  p_is_private boolean,
  p_friends_list_visibility text
)
returns void
language plpgsql
security definer
set search_path = ''
as $
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_friends_list_visibility is null
     or p_friends_list_visibility not in ('only_me', 'friends', 'everyone') then
    raise exception 'invalid friends list visibility' using errcode = '22023';
  end if;

  update public.profiles
  set is_private = p_is_private,
      friends_list_visibility = p_friends_list_visibility,
      updated_at = pg_catalog.now()
  where id = v_user_id;

  if not found then
    raise exception 'profile not found';
  end if;
end;
$;

revoke all on function public.update_my_profile_privacy(boolean, text) from public, anon, authenticated;
grant execute on function public.update_my_profile_privacy(boolean, text) to authenticated;

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
