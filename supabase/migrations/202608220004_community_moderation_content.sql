-- Allow the community owner or an active moderator to remove community content.
create policy community_moderators_delete_posts on public.posts
for delete
using (
  community_id is not null and (
    exists (select 1 from public.communities c where c.id = community_id and c.created_by = auth.uid())
    or exists (select 1 from public.community_members cm where cm.community_id = community_id and cm.user_id = auth.uid() and cm.is_moderator)
  )
);

create policy community_moderators_delete_comments on public.comments
for delete
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
);
