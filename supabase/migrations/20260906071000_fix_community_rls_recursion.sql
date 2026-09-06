-- The previous community read policy queried community_members directly while
-- community_members policies queried communities. Under authenticated RLS that
-- creates a recursive policy evaluation cycle. Keep public community discovery
-- independent, and route private-member access through the SECURITY DEFINER helper.

drop policy if exists communities_public_read on public.communities;
drop policy if exists "community members can read private communities" on public.communities;

create policy communities_public_read
on public.communities
for select
to public
using (visibility = 'public');

create policy communities_member_read
on public.communities
for select
to authenticated
using (
  created_by = (select auth.uid())
  or public.is_community_member(id, (select auth.uid()))
);
