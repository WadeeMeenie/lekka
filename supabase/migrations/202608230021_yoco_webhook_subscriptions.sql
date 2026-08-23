create table if not exists public.yoco_webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  provider_subscription_id text not null unique,
  name text not null,
  notification_url text not null,
  event_types text[] not null default '{}',
  status text not null default 'active',
  environment text not null default 'test' check (environment in ('test','live')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.yoco_webhook_subscriptions enable row level security;

drop policy if exists yoco_webhook_subscriptions_admin_read on public.yoco_webhook_subscriptions;
create policy yoco_webhook_subscriptions_admin_read
  on public.yoco_webhook_subscriptions
  for select to authenticated
  using (public.is_platform_admin((select auth.uid())));

create index if not exists yoco_webhook_subscriptions_status_idx
  on public.yoco_webhook_subscriptions(status, created_at desc);
