-- Production hardening: reconcile profile privacy, block RLS, and public profile column exposure.
-- This migration is designed for the current live schema (buddy_requests, not legacy buddies).

alter table public.profiles
  add column if not exists is_private boolean not null default false,
  add column if not exists friends_list_visibility text not null default 'friends';

alter table public.profiles
  drop constraint if exists profiles_friends_list_visibility_check;

alter table public.profiles
  add constraint profiles_friends_list_visibility_check
  check (friends_list_visibility in ('only_me', 'friends', 'everyone'));

create index if not exists profiles_is_private_idx on public.profiles(is_private);

-- Blocks are user-owned data. The application needs to manage only the caller's rows.
drop policy if exists blocks_self_access on public.blocks;
create policy blocks_self_access
  on public.blocks
  for all
  to authenticated
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

-- Blocking is part of authorization decisions, so it must remain readable by
-- trusted helper functions even though clients cannot select arbitrary block rows.
create or replace function public.is_blocked_between(viewer uuid, subject uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.blocks b
    where (b.blocker_id = viewer and b.blocked_id = subject)
       or (b.blocker_id = subject and b.blocked_id = viewer)
  );
$$;

revoke all on function public.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

create or replace function public.can_view_full_profile(viewer_id uuid, owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    viewer_id is not null
    and owner_id is not null
    and not public.is_blocked_between(viewer_id, owner_id)
    and (
      viewer_id = owner_id
      or exists (
        select 1
        from public.buddy_requests br
        where br.status = 'accepted'
          and (
            (br.sender_id = viewer_id and br.recipient_id = owner_id)
            or
            (br.sender_id = owner_id and br.recipient_id = viewer_id)
          )
      )
    );
$$;

revoke all on function public.can_view_full_profile(uuid, uuid) from public, anon;
grant execute on function public.can_view_full_profile(uuid, uuid) to authenticated;

create or replace function public.is_profile_private(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce((select p.is_private from public.profiles p where p.id = owner_id), false);
$function$;

revoke all on function public.is_profile_private(uuid) from public, anon;
grant execute on function public.is_profile_private(uuid) to authenticated;

create or replace function public.get_profile_for_viewer(owner_id uuid)
returns table (
  id uuid,
  display_name text,
  username text,
  profile_image_path text,
  bio text,
  is_private boolean,
  friends_list_visibility text,
  can_view_full boolean,
  mutual_friend_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with owner_profile as (
    select p.*
    from public.profiles p
    where p.id = owner_id
  )
  select
    p.id,
    p.display_name,
    p.username,
    p.profile_image_path,
    case
      when not p.is_private or public.can_view_full_profile(auth.uid(), p.id)
      then p.bio
      else null
    end,
    p.is_private,
    p.friends_list_visibility,
    (not p.is_private or public.can_view_full_profile(auth.uid(), p.id)),
    (
      select count(*)::bigint
      from public.buddy_requests br1
      join public.buddy_requests br2
        on br1.status = 'accepted'
       and br2.status = 'accepted'
      where br1.sender_id = auth.uid()
        and br1.recipient_id <> auth.uid()
        and br2.sender_id = p.id
        and br2.recipient_id = br1.recipient_id
    )
  from owner_profile p
  where auth.uid() is not null
    and (
      not p.is_private
      or public.can_view_full_profile(auth.uid(), p.id)
    );
$$;

revoke all on function public.get_profile_for_viewer(uuid) from public, anon;
grant execute on function public.get_profile_for_viewer(uuid) to authenticated;

create or replace function public.get_my_profile()
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
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id, p.display_name, p.username, p.bio, p.home_area,
    p.preferred_radius_m, p.interests, p.location_visibility,
    p.profile_image_path, p.is_private, p.friends_list_visibility
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

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
    raise exception 'not authenticated';
  end if;

  if p_location_visibility not in ('hidden', 'area') then
    raise exception 'invalid location visibility';
  end if;

  if p_friends_list_visibility not in ('only_me', 'friends', 'everyone') then
    raise exception 'invalid friends list visibility';
  end if;

  if p_preferred_radius_m < 500 or p_preferred_radius_m > 50000 then
    raise exception 'invalid preferred radius';
  end if;

  update public.profiles
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
  where id = auth.uid();

  return query
  select * from public.get_my_profile();
end;
$$;

revoke all on function public.update_my_profile(text,text,text,text,integer,text[],text,boolean,text) from public, anon;
grant execute on function public.update_my_profile(text,text,text,text,integer,text[],text,boolean,text) to authenticated;

-- Public profile reads expose only fields deliberately intended for discovery.
-- Private/profile settings remain available through the authenticated RPCs above.
revoke select on public.profiles from anon, authenticated;
grant select (id, display_name, username, profile_image_path) on public.profiles to anon, authenticated;

-- A private profile's posts are visible only to the owner or accepted buddy,
-- while preserving the existing public/community authorization rules.
drop policy if exists posts_public_read on public.posts;
create policy posts_public_read
  on public.posts
  for select
  to authenticated
  using (
    author_id = auth.uid()
    or (
      visibility = 'public'
      and not public.is_blocked_between(auth.uid(), author_id)
      and (
        not public.is_profile_private(author_id)
        or public.can_view_full_profile(auth.uid(), author_id)
      )
      and (
        community_id is null
        or exists (
          select 1
          from public.communities c
          where c.id = posts.community_id
            and (
              c.visibility = 'public'
              or c.created_by = auth.uid()
              or public.is_community_member(c.id, auth.uid())
            )
        )
      )
    )
  );
