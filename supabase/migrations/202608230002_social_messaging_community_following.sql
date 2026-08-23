-- Lekka production social wiring: private direct messages, community following,
-- and server-backed profile/community relationships.

create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint direct_conversations_distinct_users check (user_a <> user_b)
);

create unique index if not exists direct_conversations_pair_idx
  on public.direct_conversations (least(user_a, user_b), greatest(user_a, user_b));

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists direct_messages_conversation_created_idx on public.direct_messages (conversation_id, created_at desc);
create index if not exists direct_messages_sender_idx on public.direct_messages (sender_id, created_at desc);

alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;

grant select, insert, update on public.direct_conversations to authenticated;
grant select, insert, update on public.direct_messages to authenticated;

-- New public tables must be explicitly added to the Realtime publication on projects where
-- Postgres Changes is enabled. RLS below still controls which rows a subscriber can receive.
do $$ begin
  alter publication supabase_realtime add table public.direct_messages;
exception when duplicate_object then null;
end $$;

create or replace function public.is_conversation_member(conversation uuid)
returns boolean language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.direct_conversations c where c.id = conversation and ((select auth.uid()) = c.user_a or (select auth.uid()) = c.user_b));
$$;
revoke all on function public.is_conversation_member(uuid) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;

drop policy if exists "conversation participants can read" on public.direct_conversations;
create policy "conversation participants can read" on public.direct_conversations for select to authenticated
  using ((select auth.uid()) = user_a or (select auth.uid()) = user_b);

drop policy if exists "users can create conversations for themselves" on public.direct_conversations;
create policy "users can create conversations for themselves" on public.direct_conversations for insert to authenticated
  with check ((select auth.uid()) = user_a or (select auth.uid()) = user_b);

drop policy if exists "conversation participants can read messages" on public.direct_messages;
create policy "conversation participants can read messages" on public.direct_messages for select to authenticated
  using (public.is_conversation_member(conversation_id));

drop policy if exists "conversation participants can send messages" on public.direct_messages;
create policy "conversation participants can send messages" on public.direct_messages for insert to authenticated
  with check ((select auth.uid()) = sender_id and public.is_conversation_member(conversation_id));

drop policy if exists "message recipients can mark read" on public.direct_messages;
create policy "message recipients can mark read" on public.direct_messages for update to authenticated
  using (public.is_conversation_member(conversation_id))
  with check (public.is_conversation_member(conversation_id));

create or replace function public.get_or_create_direct_conversation(other_user uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  me uuid := (select auth.uid()); conversation_id uuid; a uuid; b uuid;
begin
  if me is null or other_user is null or me = other_user then raise exception 'Invalid conversation participants'; end if;
  a := least(me, other_user); b := greatest(me, other_user);
  select id into conversation_id from public.direct_conversations where user_a = a and user_b = b limit 1;
  if conversation_id is null then
    insert into public.direct_conversations(user_a, user_b) values (a, b) on conflict do nothing returning id into conversation_id;
    if conversation_id is null then select id into conversation_id from public.direct_conversations where user_a = a and user_b = b limit 1; end if;
  end if;
  return conversation_id;
end;
$$;
revoke all on function public.get_or_create_direct_conversation(uuid) from public;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

create index if not exists community_members_user_joined_idx on public.community_members (user_id, joined_at desc);
create unique index if not exists community_members_unique_idx on public.community_members (community_id, user_id);

-- Public discovery and private-group membership access.
drop policy if exists "community members can read private communities" on public.communities;
create policy "community members can read private communities" on public.communities for select to authenticated
  using (visibility = 'public' or created_by = (select auth.uid()) or exists (select 1 from public.community_members cm where cm.community_id = communities.id and cm.user_id = (select auth.uid())));

-- Avoid recursive RLS. A member can read their own membership; owners can read all membership rows in their communities.
drop policy if exists "members can read own community membership" on public.community_members;
create policy "members can read own community membership" on public.community_members for select to authenticated
  using (user_id = (select auth.uid()) or exists (select 1 from public.communities c where c.id = community_id and c.created_by = (select auth.uid())));

drop policy if exists "authenticated users can create communities" on public.communities;
create policy "authenticated users can create communities" on public.communities for insert to authenticated
  with check ((select auth.uid()) = created_by);

drop policy if exists "community members can create community posts" on public.posts;
create policy "community members can create community posts" on public.posts for insert to authenticated
  with check ((select auth.uid()) = author_id and (community_id is null or exists (select 1 from public.communities c where c.id = community_id and c.visibility = 'public') or exists (select 1 from public.community_members cm where cm.community_id = community_id and cm.user_id = (select auth.uid()))));
