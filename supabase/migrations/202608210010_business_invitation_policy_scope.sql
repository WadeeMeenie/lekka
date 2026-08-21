drop policy if exists business_invitations_inviter_read on public.business_invitations;
drop policy if exists business_invitations_inviter_update on public.business_invitations;

create policy business_invitations_inviter_read on public.business_invitations for select using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id = business_invitations.business_id and bm.user_id = auth.uid() and bm.role in ('owner', 'admin', 'manager')
  )
);

create policy business_invitations_inviter_update on public.business_invitations for update using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id = business_invitations.business_id and bm.user_id = auth.uid() and bm.role in ('owner', 'admin', 'manager')
  )
) with check (
  exists (
    select 1 from public.business_members bm
    where bm.business_id = business_invitations.business_id and bm.user_id = auth.uid() and bm.role in ('owner', 'admin', 'manager')
  )
);
