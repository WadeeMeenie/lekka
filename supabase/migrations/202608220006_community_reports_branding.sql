alter table public.communities add column if not exists logo_path text;
alter table public.communities add column if not exists cover_path text;

create policy community_moderators_read_reports on public.reports
for select
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
      and p.community_id is not null
      and (
        exists (select 1 from public.communities c where c.id = p.community_id and c.created_by = auth.uid())
        or exists (select 1 from public.community_members cm where cm.community_id = p.community_id and cm.user_id = auth.uid() and cm.is_moderator)
      )
  )
  or exists (
    select 1 from public.comments comment_row
    join public.posts comment_post on comment_post.id = comment_row.post_id
    where comment_row.id = comment_id
      and comment_post.community_id is not null
      and (
        exists (select 1 from public.communities c where c.id = comment_post.community_id and c.created_by = auth.uid())
        or exists (select 1 from public.community_members cm where cm.community_id = comment_post.community_id and cm.user_id = auth.uid() and cm.is_moderator)
      )
  )
);

create policy community_moderators_update_reports on public.reports
for update
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
      and p.community_id is not null
      and (exists (select 1 from public.communities c where c.id = p.community_id and c.created_by = auth.uid()) or exists (select 1 from public.community_members cm where cm.community_id = p.community_id and cm.user_id = auth.uid() and cm.is_moderator))
  )
  or exists (
    select 1 from public.comments comment_row
    join public.posts comment_post on comment_post.id = comment_row.post_id
    where comment_row.id = comment_id
      and comment_post.community_id is not null
      and (exists (select 1 from public.communities c where c.id = comment_post.community_id and c.created_by = auth.uid()) or exists (select 1 from public.community_members cm where cm.community_id = comment_post.community_id and cm.user_id = auth.uid() and cm.is_moderator))
  )
)
with check (status in ('open', 'reviewing', 'resolved', 'dismissed'));
