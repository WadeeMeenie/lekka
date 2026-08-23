drop policy if exists "community managers can pin posts" on public.posts;
create policy "community managers can pin posts"
on public.posts
for update
to authenticated
using (
  community_id is not null
  and (
    exists (select 1 from public.communities c where c.id = posts.community_id and c.created_by = (select auth.uid()))
    or exists (select 1 from public.community_members cm where cm.community_id = posts.community_id and cm.user_id = (select auth.uid()) and cm.is_moderator = true)
  )
)
with check (community_id is not null);
