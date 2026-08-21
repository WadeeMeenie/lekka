create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;
create policy if not exists blocks_self_access on public.blocks for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

alter table public.reports add column if not exists comment_id uuid references public.comments(id) on delete cascade;
alter table public.reports add column if not exists profile_id uuid references public.profiles(id) on delete cascade;
create policy if not exists reports_self_read on public.reports for select using (auth.uid() = reporter_id);

create or replace function public.is_blocked_between(viewer uuid, subject uuid)
returns boolean language sql stable security invoker set search_path = public
as $$ select exists(select 1 from public.blocks b where (b.blocker_id = viewer and b.blocked_id = subject) or (b.blocker_id = subject and b.blocked_id = viewer)); $$;
revoke all on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;
