-- Fix community moderation authorization and add first-message request state.

drop policy if exists "community_moderators_delete_posts" on public.posts;
create policy "community_moderators_delete_posts"
on public.posts
for delete
to authenticated
using (
  community_id is not null
  and (
    exists (
      select 1 from public.communities c
      where c.id = posts.community_id and c.created_by = (select auth.uid())
    )
    or exists (
      select 1 from public.community_members cm
      where cm.community_id = posts.community_id
        and cm.user_id = (select auth.uid())
        and cm.is_moderator = true
    )
  )
);

alter table public.posts
  add column if not exists community_pinned_at timestamptz,
  add column if not exists community_pinned_by uuid;

create index if not exists posts_community_pinned_idx
  on public.posts (community_id, community_pinned_at desc nulls last, created_at desc)
  where community_id is not null;

alter table public.direct_conversations
  add column if not exists request_status text not null default 'accepted'
    check (request_status in ('pending','accepted','rejected')),
  add column if not exists requested_by uuid references public.profiles(id) on delete set null;

create index if not exists direct_conversations_request_idx
  on public.direct_conversations (user_a, user_b, request_status, updated_at desc);

create or replace function public.get_or_create_direct_conversation(other_user uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  conversation_id uuid;
  a uuid;
  b uuid;
begin
  if me is null or other_user is null or me = other_user then
    raise exception 'Invalid conversation participants';
  end if;
  a := least(me, other_user);
  b := greatest(me, other_user);
  select id into conversation_id from public.direct_conversations where user_a = a and user_b = b limit 1;
  if conversation_id is null then
    insert into public.direct_conversations(user_a, user_b, request_status, requested_by)
    values (a, b, 'pending', me)
    on conflict do nothing returning id into conversation_id;
    if conversation_id is null then
      select id into conversation_id from public.direct_conversations where user_a = a and user_b = b limit 1;
    end if;
  end if;
  return conversation_id;
end;
$$;

revoke all on function public.get_or_create_direct_conversation(uuid) from public;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
