-- Harden media authorization without breaking the upload -> attach flow.
-- Uploading to Storage returns object metadata, so the uploader must retain
-- read access to their own newly-created object until it is attached to content.
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
        where pm.storage_path = storage.objects.name
          and (
            p.visibility = 'public'
            or p.author_id = (select auth.uid())
            or p.visibility = 'nearby'
          )
      )
      or exists (
        select 1
        from public.profiles profile
        where profile.profile_image_path = storage.objects.name
      )
    )
  );

drop policy if exists media_user_upload on storage.objects;
create policy media_user_upload
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'local-radar-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists media_user_update on storage.objects;
create policy media_user_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'local-radar-media'
    and owner_id = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'local-radar-media'
    and owner_id = (select auth.uid()::text)
  );

drop policy if exists media_user_delete on storage.objects;
create policy media_user_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'local-radar-media'
    and owner_id = (select auth.uid()::text)
  );

-- A post-media row must point into the authenticated post author's storage
-- namespace. This prevents attaching another user's object by path.
create or replace function private.validate_post_media_storage_path()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_author uuid;
begin
  select p.author_id into post_author
  from public.posts p
  where p.id = new.post_id;

  if post_author is null then
    raise exception 'Post media must reference an existing post';
  end if;

  if (storage.foldername(new.storage_path))[1] is distinct from post_author::text then
    raise exception 'Post media must belong to the post author storage namespace';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_post_media_storage_path() from public, anon, authenticated;

drop trigger if exists validate_post_media_storage_path on public.post_media;
create trigger validate_post_media_storage_path
before insert or update on public.post_media
for each row execute function private.validate_post_media_storage_path();

create index if not exists post_media_storage_path_idx
  on public.post_media (storage_path);
