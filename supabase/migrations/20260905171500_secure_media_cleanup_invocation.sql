-- The cleanup worker is server-to-server. The publishable key must never authorize
-- privileged Storage deletion; pg_cron uses a Vault-backed private token instead.

select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'lekka_media_cleanup_token',
  'Private token used only by pg_cron to invoke the media cleanup Edge Function.'
)
where not exists (
  select 1 from vault.secrets where name = 'lekka_media_cleanup_token'
);

create or replace function public.authorize_media_cleanup(p_token text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from vault.decrypted_secrets
    where name = 'lekka_media_cleanup_token'
      and decrypted_secret = p_token
  );
$$;

revoke all on function public.authorize_media_cleanup(text) from public, anon, authenticated;
grant execute on function public.authorize_media_cleanup(text) to service_role;

select cron.unschedule(jobid)
from cron.job
where jobname = 'lekka-media-cleanup';

select cron.schedule(
  'lekka-media-cleanup',
  '* * * * *',
  $$select extensions.http_post(
    url := 'https://vnitwsjidlurlwlpsmtf.supabase.co/functions/v1/cleanup-media',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'lekka_media_cleanup_token'),
      'x-media-cleanup-token', (select decrypted_secret from vault.decrypted_secrets where name = 'lekka_media_cleanup_token')
    ),
    body := '{"source":"pg_cron"}'::jsonb,
    timeout_milliseconds := 5000
  )$$
);
