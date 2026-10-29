-- Fix ambiguous output-column resolution in the profile update RPC.
-- RETURNS TABLE declares an output variable named "id"; qualify the target
-- table column in the UPDATE predicate so PL/pgSQL cannot resolve it ambiguously.
create or replace function public.update_my_profile(
  p_display_name text,
  p_username text,
  p_bio text,
  p_home_area text,
  p_preferred_radius_m integer,
  p_interests text[],
  p_location_visibility text,
  p_is_private boolean,
  p_friends_list_visibility text
)
returns table (
  id uuid,
  display_name text,
  username text,
  bio text,
  home_area text,
  preferred_radius_m integer,
  interests text[],
  location_visibility text,
  profile_image_path text,
  is_private boolean,
  friends_list_visibility text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if p_location_visibility not in ('hidden', 'area') then
    raise exception 'invalid location visibility' using errcode = '22023';
  end if;

  if p_friends_list_visibility not in ('only_me', 'friends', 'everyone') then
    raise exception 'invalid friends list visibility' using errcode = '22023';
  end if;

  if p_preferred_radius_m < 500 or p_preferred_radius_m > 50000 then
    raise exception 'invalid preferred radius' using errcode = '22023';
  end if;

  update public.profiles as target_profile
  set display_name = coalesce(p_display_name, ''),
      username = nullif(lower(btrim(p_username)), ''),
      bio = p_bio,
      home_area = coalesce(p_home_area, 'Bellville'),
      preferred_radius_m = p_preferred_radius_m,
      interests = coalesce(p_interests, '{}'::text[]),
      location_visibility = p_location_visibility,
      is_private = p_is_private,
      friends_list_visibility = p_friends_list_visibility,
      updated_at = now()
  where target_profile.id = auth.uid();

  if not found then
    raise exception 'profile not found for the authenticated user' using errcode = 'P0002';
  end if;

  return query
  select * from public.get_my_profile();
end;
$$;

revoke all on function public.update_my_profile(text,text,text,text,integer,text[],text,boolean,text) from public, anon;
grant execute on function public.update_my_profile(text,text,text,text,integer,text[],text,boolean,text) to authenticated;
