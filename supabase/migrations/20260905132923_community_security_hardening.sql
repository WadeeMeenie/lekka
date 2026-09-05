create schema if not exists private;

-- Remove the legacy self-write policy that allowed members to assign themselves moderator status.
drop policy if exists community_members_self_write on public.community_members;
drop policy if exists community_members_self_insert on public.community_members;
drop policy if exists community_members_self_delete on public.community_members;

create policy community_members_self_insert
  on public.community_members
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      is_moderator = false
      or (select public.is_community_owner(community_id, (select auth.uid())))
    )
  );

create policy community_members_self_delete
  on public.community_members
  for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and not (select public.is_community_owner(community_id, (select auth.uid())))
  );

create index if not exists community_members_user_idx
  on public.community_members (user_id, community_id);

-- Community moderators may remove posts and set pin state, but must never be able to edit
-- the underlying post content/ownership/business relationship through that moderation path.
drop policy if exists "community managers can pin posts" on public.posts;
create policy "community managers can pin posts"
  on public.posts
  for update
  to authenticated
  using (
    community_id is not null
    and (
      exists (
        select 1 from public.communities c
        where c.id = posts.community_id
          and c.created_by = (select auth.uid())
      )
      or exists (
        select 1 from public.community_members cm
        where cm.community_id = posts.community_id
          and cm.user_id = (select auth.uid())
          and cm.is_moderator = true
      )
    )
  )
  with check (community_id is not null);

create or replace function private.enforce_community_post_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.community_pinned_by is not null
     and new.community_pinned_by is distinct from (select auth.uid()) then
    raise exception 'Only the user performing the moderation action may be recorded as the pin owner';
  end if;

  if (new.community_pinned_at is null) <> (new.community_pinned_by is null) then
    raise exception 'Pinned timestamp and pin owner must be set or cleared together';
  end if;

  if tg_op = 'UPDATE' and old.author_id is distinct from (select auth.uid()) then
    if old.community_id is null
       or not (
         exists (
           select 1 from public.communities c
           where c.id = old.community_id
             and c.created_by = (select auth.uid())
         )
         or exists (
           select 1 from public.community_members cm
           where cm.community_id = old.community_id
             and cm.user_id = (select auth.uid())
             and cm.is_moderator = true
         )
       ) then
      raise exception 'Only a community owner or moderator may perform community moderation';
    end if;

    if new.id is distinct from old.id
       or new.author_id is distinct from old.author_id
       or new.business_id is distinct from old.business_id
       or new.community_id is distinct from old.community_id
       or new.kind is distinct from old.kind
       or new.category is distinct from old.category
       or new.title is distinct from old.title
       or new.body is distinct from old.body
       or new.visibility is distinct from old.visibility
       or new.area is distinct from old.area
       or new.approximate_location is distinct from old.approximate_location
       or new.alert_status is distinct from old.alert_status
       or new.engagement_count is distinct from old.engagement_count
       or new.trust_score is distinct from old.trust_score
       or new.created_at is distinct from old.created_at
       or new.updated_at is distinct from old.updated_at then
      raise exception 'Community moderation may only change pin state';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_community_post_moderation() from public, anon, authenticated;

drop trigger if exists enforce_community_post_moderation on public.posts;
create trigger enforce_community_post_moderation
before update on public.posts
for each row execute function private.enforce_community_post_moderation();

-- Community moderators may update report status, but cannot rewrite the report target,
-- reporter, reason, or timestamps.
create or replace function private.enforce_community_report_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.reporter_id is distinct from old.reporter_id
     or new.post_id is distinct from old.post_id
     or new.business_id is distinct from old.business_id
     or new.reason is distinct from old.reason
     or new.created_at is distinct from old.created_at
     or new.comment_id is distinct from old.comment_id
     or new.profile_id is distinct from old.profile_id then
    raise exception 'Community moderation may only change report status';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_community_report_update() from public, anon, authenticated;

drop trigger if exists enforce_community_report_update on public.reports;
create trigger enforce_community_report_update
before update on public.reports
for each row execute function private.enforce_community_report_update();

-- Pin ownership is a real relationship, not free-form client metadata.
alter table public.posts
  drop constraint if exists posts_community_pinned_by_fkey;
alter table public.posts
  add constraint posts_community_pinned_by_fkey
  foreign key (community_pinned_by) references public.profiles(id) on delete set null;

-- Use explicit authenticated targeting rather than the deprecated auth.role() check.
drop policy if exists media_authenticated_read on storage.objects;
create policy media_authenticated_read
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'local-radar-media');
