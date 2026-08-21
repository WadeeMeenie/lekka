create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('bug_report', 'feature_request')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null check (char_length(btrim(description)) between 1 and 1000),
  app_version text not null check (char_length(btrim(app_version)) between 1 and 64),
  created_at timestamptz not null default now()
);

alter table public.beta_feedback enable row level security;

create policy beta_feedback_authenticated_insert on public.beta_feedback
  for insert to authenticated
  with check (auth.uid() = user_id);

create index if not exists beta_feedback_created_at_idx on public.beta_feedback (created_at desc);
