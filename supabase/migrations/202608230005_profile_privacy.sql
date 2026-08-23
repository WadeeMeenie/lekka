-- Lekka profile privacy foundation
alter table public.profiles
  add column if not exists is_private boolean not null default false,
  add column if not exists friends_list_visibility text not null default 'friends'
    check (friends_list_visibility in ('only_me','friends','everyone'));

create or replace function public.can_view_full_profile(viewer_id uuid, owner_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select
    viewer_id = owner_id
    or exists (
      select 1 from public.buddies b
      where b.status = 'accepted'
        and ((b.requester_id = viewer_id and b.addressee_id = owner_id)
          or (b.requester_id = owner_id and b.addressee_id = viewer_id))
    );
$$;

create or replace function public.get_profile_for_viewer(owner_id uuid)
returns table (
  id uuid,
  display_name text,
  profile_image_path text,
  bio text,
  is_private boolean,
  friends_list_visibility text,
  can_view_full boolean,
  mutual_friend_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id, p.display_name, p.profile_image_path,
    case when public.can_view_full_profile(auth.uid(), p.id) then p.bio else null end,
    p.is_private, p.friends_list_visibility,
    public.can_view_full_profile(auth.uid(), p.id),
    (select count(*) from public.buddies a join public.buddies b
      on a.status='accepted' and b.status='accepted'
      where ((a.requester_id=auth.uid() and a.addressee_id in (b.requester_id,b.addressee_id))
          or (a.addressee_id=auth.uid() and a.requester_id in (b.requester_id,b.addressee_id)))
        and p.id in (b.requester_id,b.addressee_id)
    )::bigint
  from public.profiles p where p.id = owner_id;
$$;

create index if not exists profiles_is_private_idx on public.profiles(is_private);

-- Locked users' posts are visible only to the owner or accepted friends.
drop policy if exists posts_private_profile_read on public.posts;
create policy posts_private_profile_read on public.posts
for select to authenticated
using (
  author_id = auth.uid()
  or not coalesce((select p.is_private from public.profiles p where p.id = posts.author_id), false)
  or public.can_view_full_profile(auth.uid(), author_id)
);
