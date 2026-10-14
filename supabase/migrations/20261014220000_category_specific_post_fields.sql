alter table public.posts
  add column if not exists details jsonb not null default '{}'::jsonb,
  add column if not exists marketplace_price_cents bigint,
  add column if not exists marketplace_condition text,
  add column if not exists marketplace_status text not null default 'available';

alter table public.posts
  drop constraint if exists posts_marketplace_price_cents_nonnegative,
  add constraint posts_marketplace_price_cents_nonnegative
    check (marketplace_price_cents is null or marketplace_price_cents >= 0),
  drop constraint if exists posts_marketplace_condition_valid,
  add constraint posts_marketplace_condition_valid
    check (marketplace_condition is null or marketplace_condition in ('new','like_new','good','fair','for_parts')),
  drop constraint if exists posts_marketplace_status_valid,
  add constraint posts_marketplace_status_valid
    check (marketplace_status in ('available','reserved','sold'));

create index if not exists posts_marketplace_available_idx
  on public.posts (created_at desc)
  where category = 'marketplace' and marketplace_status = 'available';

comment on column public.posts.details is
  'Category-specific structured data for local posts (events, deals, jobs, services, and business announcements).';
comment on column public.posts.marketplace_price_cents is
  'Marketplace asking price in cents of ZAR; null when the post is not a priced listing.';
comment on column public.posts.marketplace_condition is
  'Marketplace item condition: new, like_new, good, fair, or for_parts.';
comment on column public.posts.marketplace_status is
  'Persisted Marketplace lifecycle: available, reserved, or sold.';
