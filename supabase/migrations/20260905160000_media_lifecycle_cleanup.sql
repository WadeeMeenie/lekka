-- Make media deletion transactional at the database boundary and asynchronous at the
-- Storage boundary. Database deletes enqueue Storage paths in the same transaction;
-- an Edge Function removes the actual Storage objects with retries.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.media_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (bucket_id, storage_path)
);

alter table public.media_cleanup_queue enable row level security;
revoke all on public.media_cleanup_queue from anon, authenticated;
grant all on public.media_cleanup_queue to service_role;
create index if not exists media_cleanup_queue_pending_idx
  on public.media_cleanup_queue (status, next_attempt_at, created_at);

create or replace function private.enqueue_media_cleanup(p_bucket_id text, p_storage_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_bucket_id is null or p_storage_path is null or btrim(p_storage_path) = '' then
    return;
  end if;

  insert into public.media_cleanup_queue (bucket_id, storage_path)
  values (p_bucket_id, p_storage_path)
  on conflict (bucket_id, storage_path) do update
    set status = 'pending',
        next_attempt_at = now(),
        last_error = null,
        updated_at = now();
end;
$$;
revoke all on function private.enqueue_media_cleanup(text, text) from public, anon, authenticated;

create or replace function private.enqueue_deleted_post_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue_media_cleanup('local-radar-media', old.storage_path);
  if old.thumbnail_path is not null then
    perform private.enqueue_media_cleanup('local-radar-media', old.thumbnail_path);
  end if;
  return old;
end;
$$;
revoke all on function private.enqueue_deleted_post_media() from public, anon, authenticated;
drop trigger if exists enqueue_post_media_cleanup on public.post_media;
create trigger enqueue_post_media_cleanup
after delete on public.post_media
for each row execute function private.enqueue_deleted_post_media();

create or replace function private.enqueue_replaced_post_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.storage_path is distinct from new.storage_path then
    perform private.enqueue_media_cleanup('local-radar-media', old.storage_path);
  end if;
  if old.thumbnail_path is distinct from new.thumbnail_path and old.thumbnail_path is not null then
    perform private.enqueue_media_cleanup('local-radar-media', old.thumbnail_path);
  end if;
  return new;
end;
$$;
revoke all on function private.enqueue_replaced_post_media() from public, anon, authenticated;
drop trigger if exists enqueue_replaced_post_media_cleanup on public.post_media;
create trigger enqueue_replaced_post_media_cleanup
after update of storage_path, thumbnail_path on public.post_media
for each row execute function private.enqueue_replaced_post_media();

create or replace function private.enqueue_profile_media_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.profile_image_path is distinct from new.profile_image_path and old.profile_image_path is not null then
    perform private.enqueue_media_cleanup('local-radar-media', old.profile_image_path);
  end if;
  return new;
end;
$$;
revoke all on function private.enqueue_profile_media_cleanup() from public, anon, authenticated;
drop trigger if exists enqueue_profile_media_cleanup on public.profiles;
create trigger enqueue_profile_media_cleanup
after update of profile_image_path on public.profiles
for each row execute function private.enqueue_profile_media_cleanup();

create or replace function private.enqueue_deleted_profile_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.profile_image_path is not null then
    perform private.enqueue_media_cleanup('local-radar-media', old.profile_image_path);
  end if;
  return old;
end;
$$;
revoke all on function private.enqueue_deleted_profile_media() from public, anon, authenticated;
drop trigger if exists enqueue_deleted_profile_media_cleanup on public.profiles;
create trigger enqueue_deleted_profile_media_cleanup
after delete on public.profiles
for each row execute function private.enqueue_deleted_profile_media();

-- The cleanup function is intentionally idempotent and contains no user data API.
-- The publishable key is not a secret; it is only used to reach the function gateway.
select cron.unschedule(jobid)
from cron.job
where jobname = 'lekka-media-cleanup';

select cron.schedule(
  'lekka-media-cleanup',
  '* * * * *',
  $$select net.http_post(
    url := 'https://vnitwsjidlurlwlpsmtf.supabase.co/functions/v1/cleanup-media',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_hy1yuUGTdhl8fEnR4jAIIg_kWJ3JQdX"}'::jsonb,
    body := '{"source":"pg_cron"}'::jsonb,
    timeout_milliseconds := 5000
  )$$
);
