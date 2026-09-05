-- pg_net is installed in the net schema on the production project.
-- Keep the Vault-backed token as the only authorization credential for cleanup;
-- the publishable key is only the public gateway routing credential.

select cron.unschedule(jobid)
from cron.job
where jobname = 'lekka-media-cleanup';

select cron.schedule(
  'lekka-media-cleanup',
  '* * * * *',
  $$select net.http_post(
    url := 'https://vnitwsjidlurlwlpsmtf.supabase.co/functions/v1/cleanup-media',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_hy1yuUGTdhl8EnR4jAIIg_kWJ3JQdX',
      'x-media-cleanup-token', (select decrypted_secret from vault.decrypted_secrets where name = 'lekka_media_cleanup_token')
    ),
    body := '{"source":"pg_cron"}'::jsonb,
    timeout_milliseconds := 5000
  )$$
);
