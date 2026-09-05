-- Business logos live in the same private media bucket as post/profile media.
-- Treat logo replacement/deletion as a media lifecycle event so Storage objects
-- cannot accumulate as unreachable or stale files.

create or replace function private.enqueue_business_logo_media_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' or old.logo_path is distinct from new.logo_path then
    if old.logo_path is not null then
      perform private.enqueue_media_cleanup('local-radar-media', old.logo_path);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

revoke execute on function private.enqueue_business_logo_media_cleanup() from public, anon, authenticated;

drop trigger if exists enqueue_business_logo_media_delete on public.businesses;
create trigger enqueue_business_logo_media_delete
after delete on public.businesses
for each row execute function private.enqueue_business_logo_media_cleanup();

drop trigger if exists enqueue_business_logo_media_replace on public.businesses;
create trigger enqueue_business_logo_media_replace
after update of logo_path on public.businesses
for each row execute function private.enqueue_business_logo_media_cleanup();

-- Business profiles are public-read, so their referenced logo objects should be
-- readable to authenticated users while remaining inaccessible by default.
drop policy if exists media_authenticated_read on storage.objects;
create policy media_authenticated_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'local-radar-media'
  and (
    owner_id = (select auth.uid()::text)
    or exists (
      select 1
      from public.post_media pm
      join public.posts p on p.id = pm.post_id
      where pm.storage_path = objects.name
        and (p.visibility = 'public' or p.author_id = (select auth.uid()) or p.visibility = 'nearby')
    )
    or exists (
      select 1
      from public.profiles profile
      where profile.profile_image_path = objects.name
    )
    or exists (
      select 1
      from public.businesses business
      where business.logo_path = objects.name
    )
  )
);
