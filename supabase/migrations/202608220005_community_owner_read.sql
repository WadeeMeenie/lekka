-- Keep private community management accessible to the community owner.
create policy communities_owner_read on public.communities
for select
using (auth.uid() = created_by);
