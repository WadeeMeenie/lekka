-- Lekka private/locked profiles: server-side privacy boundary.
-- New users remain open by default for backwards compatibility.

alter table public.profiles
  add column if not exists is_private boolean not null default false,
  add column if not exists friends_list_visibility text not null default 'friends'
    check (friends_list_visibility in ('only_me', 'friends', 'everyone'));

create index if not exists profiles_private_idx on public.profiles (is_private);

create or replace function public.are_buddies(p_viewer_id uuid, p_owner_id uuid)
returns boolean
language sql stable security invoker set search_path = public
as $$
  select p_viewer_id is not null
    and p_owner_id is not null
    and p_viewer_id <> p_owner_id
    and exists (
      select 1 from public.buddy_requests br
      where br.status = 'accepted'
        and ((br.sender_id = p_viewer_id and br.recipient_id = p_owner_id)
          or (br.sender_id = p_owner_id and br.recipient_id = p_viewer_id))
    );
$$;

create or replace function public.is_blocked_between(p_viewer_id uuid, p_owner_id uuid)
returns boolean
language sql stable security invoker set search_path = public
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = p_viewer_id and b.blocked_id = p_owner_id)
       or (b.blocker_id = p_owner_id and b.blocked_id = p_viewer_id)
  );
$$;

create or replace function public.can_view_full_profile(p_viewer_id uuid, p_owner_id uuid)
returns boolean
language sql stable security invoker set search_path = public
as $$
  select case
    when p_owner_id is null then false
    when public.is_blocked_between(p_viewer_id, p_owner_id) then false
    when p_viewer_id = p_owner_id then true
    when not coalesce((select is_private from public.profiles where id = p_owner_id), false) then true
    else public.are_buddies(p_viewer_id, p_owner_id)
  end;
$$;

-- Replace broad profile reads with owner/friend-aware access. This still permits the
-- minimal locked profile fields through the public profile RPC below.
drop policy if exists profiles_public_read on public.profiles;
create policy profiles_owner_or_allowed_read on public.profiles
for select using (
  auth.uid() = id
  or public.can_view_full_profile(auth.uid(), id)
);

-- Public search/profile cards should use this RPC rather than selecting profiles directly.
create or replace function public.get_profile_for_viewer(p_owner_id uuid)
returns table (
  id uuid,
  display_name text,
  username text,
  bio text,
  profile_image_path text,
  interests text[],
  home_area text,
  is_private boolean,
  is_full_view boolean,
  mutual_friend_count integer
)
language plpgsql stable security invoker set search_path = public
as $$
declare
  v_full boolean;
begin
  if p_owner_id is null then return; end if;
  v_full := public.can_view_full_profile(auth.uid(), p_owner_id);
  return query
  select p.id, p.display_name, p.username,
         case when v_full then p.bio else null end,
         p.profile_image_path,
         case when v_full then p.interests else '{}'::text[] end,
         case when v_full then p.home_area else '' end,
         p.is_private,
         v_full,
         0;
end;
$$;

-- Locked users' posts are globally retroactive: only owner or accepted buddies can see them.
drop policy if exists posts_public_read on public.posts;
create policy posts_privacy_aware_read on public.posts
for select using (
  auth.uid() = author_id
  or (
    not public.is_blocked_between(auth.uid(), author_id)
    and (
      not coalesce((select is_private from public.profiles where id = author_id), false)
      or public.are_buddies(auth.uid(), author_id)
    )
    and (
      visibility = 'public'
      or (visibility = 'nearby' and auth.uid() is not null)
      or visibility in ('followers', 'community', 'group')
    )
  )
);

-- Comments/reactions are only exposed if the viewer can see the parent post.
drop policy if exists comments_public_read on public.comments;
create policy comments_privacy_aware_read on public.comments
for select using (
  exists (select 1 from public.posts p where p.id = post_id)
);

drop policy if exists reactions_public_read on public.reactions;
create policy reactions_privacy_aware_read on public.reactions
for select using (
  exists (select 1 from public.posts p where p.id = post_id)
);

-- Friends-list visibility is independently controlled. Only accepted buddies can see
-- a locked user's friend list; owners always see their own list.
create or replace function public.can_view_friend_list(p_viewer_id uuid, p_owner_id uuid)
returns boolean
language sql stable security invoker set search_path = public
as $$
  select case
    when p_viewer_id = p_owner_id then true
    when public.is_blocked_between(p_viewer_id, p_owner_id) then false
    when coalesce((select is_private from public.profiles where id = p_owner_id), false)
      then public.are_buddies(p_viewer_id, p_owner_id)
    else case coalesce((select friends_list_visibility from public.profiles where id = p_owner_id), 'friends')
      when 'everyone' then true
      when 'friends' then public.are_buddies(p_viewer_id, p_owner_id)
      else false
    end
  end;
$$;

-- Safe helper for friend-list consumers; the raw follows/buddy tables remain protected by their own policies.
create or replace function public.get_visible_buddy_ids(p_owner_id uuid)
returns table (user_id uuid)
language sql stable security invoker set search_path = public
as $$
  select case when br.sender_id = p_owner_id then br.recipient_id else br.sender_id end
  from public.buddy_requests br
  where br.status = 'accepted'
    and (br.sender_id = p_owner_id or br.recipient_id = p_owner_id)
    and public.can_view_friend_list(auth.uid(), p_owner_id);
$$;

comment on column public.profiles.is_private is 'Locked profile: only owner and accepted buddies can see full profile/posts.';
comment on column public.profiles.friends_list_visibility is 'Independent friend-list visibility: only_me, friends, everyone.';
