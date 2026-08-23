-- Fix: community SELECT policy queried community_members, whose owner-read policy queried communities.
-- That creates a communities -> community_members -> communities RLS cycle.
-- Use SECURITY DEFINER membership helpers with a fixed search_path so policy evaluation
-- does not recursively re-enter the protected relations.

create or replace function public.is_community_member(target_community uuid, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_members cm
    where cm.community_id = target_community
      and cm.user_id = target_user
  );
$$;

create or replace function public.is_community_owner(target_community uuid, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.communities c
    where c.id = target_community
      and c.created_by = target_user
  );
$$;

revoke all on function public.is_community_member(uuid, uuid) from public;
grant execute on function public.is_community_member(uuid, uuid) to authenticated;
revoke all on function public.is_community_owner(uuid, uuid) from public;
grant execute on function public.is_community_owner(uuid, uuid) to authenticated;

drop policy if exists "community members can read private communities" on public.communities;
create policy "community members can read private communities"
on public.communities for select to authenticated
using (
  visibility = 'public'
  or created_by = (select auth.uid())
  or public.is_community_member(id, (select auth.uid()))
);

drop policy if exists "members can read own community membership" on public.community_members;
create policy "members can read own community membership"
on public.community_members for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_community_owner(community_id, (select auth.uid()))
);

drop policy if exists community_members_owner_update on public.community_members;
create policy community_members_owner_update
on public.community_members for update to authenticated
using (public.is_community_owner(community_id, (select auth.uid())))
with check (public.is_community_owner(community_id, (select auth.uid())));

drop policy if exists community_members_owner_delete on public.community_members;
create policy community_members_owner_delete
on public.community_members for delete to authenticated
using (public.is_community_owner(community_id, (select auth.uid())));

drop policy if exists "community members can create community posts" on public.posts;
create policy "community members can create community posts"
on public.posts for insert to authenticated
with check (
  (select auth.uid()) = author_id
  and (
    community_id is null
    or exists (
      select 1 from public.communities c
      where c.id = community_id and c.visibility = 'public'
    )
    or public.is_community_member(community_id, (select auth.uid()))
  )
);
