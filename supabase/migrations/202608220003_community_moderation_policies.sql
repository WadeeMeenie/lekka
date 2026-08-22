-- Allow only a community owner to update moderator flags or remove members.
create policy community_members_owner_update on public.community_members
for update
using (exists (
  select 1 from public.communities c
  where c.id = community_id and c.created_by = auth.uid()
))
with check (exists (
  select 1 from public.communities c
  where c.id = community_id and c.created_by = auth.uid()
));

create policy community_members_owner_delete on public.community_members
for delete
using (exists (
  select 1 from public.communities c
  where c.id = community_id and c.created_by = auth.uid()
));
