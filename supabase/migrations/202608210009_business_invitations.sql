create table if not exists public.business_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null check (char_length(btrim(email)) between 3 and 254),
  role text not null check (role in ('admin', 'staff')),
  token uuid not null unique default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  accepted_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index if not exists business_invitations_pending_email_idx
  on public.business_invitations (business_id, lower(email)) where status = 'pending';

alter table public.business_invitations enable row level security;

create policy business_invitations_inviter_read on public.business_invitations for select using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id = business_invitations.business_id and bm.user_id = auth.uid() and bm.role in ('owner', 'admin', 'manager')
  )
);

create policy business_invitations_invitee_read on public.business_invitations for select using (
  lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
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

create or replace function public.create_business_invitation(
  p_business_id uuid,
  p_email text,
  p_role text
)
returns table (id uuid, token uuid, expires_at timestamptz, business_name text)
language plpgsql security definer set search_path = public
as $$
declare
  invitation public.business_invitations;
  selected_business public.businesses;
begin
  if auth.uid() is null or not exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id and bm.user_id = auth.uid() and bm.role in ('owner', 'admin', 'manager')
  ) then
    raise exception 'You are not allowed to invite members for this business';
  end if;

  if p_role not in ('admin', 'staff') then
    raise exception 'Only admin or staff invitations are supported';
  end if;

  if lower(btrim(coalesce(p_email, ''))) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address';
  end if;

  select * into selected_business from public.businesses where id = p_business_id;
  if selected_business.id is null then raise exception 'Business not found'; end if;

  insert into public.business_invitations (business_id, email, role, created_by)
  values (p_business_id, lower(btrim(p_email)), p_role, auth.uid())
  on conflict (business_id, lower(email)) where status = 'pending'
  do update set role = excluded.role, created_by = excluded.created_by, token = gen_random_uuid(), expires_at = now() + interval '14 days', created_at = now()
  returning * into invitation;

  return query select invitation.id, invitation.token, invitation.expires_at, selected_business.name;
end;
$$;

create or replace function public.accept_business_invitation(p_token uuid)
returns table (business_id uuid, business_name text, role text)
language plpgsql security definer set search_path = public
as $$
declare
  invitation public.business_invitations;
  selected_business public.businesses;
  current_email text;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  current_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if current_email = '' then raise exception 'A verified email address is required to accept an invitation'; end if;

  select * into invitation from public.business_invitations where token = p_token for update;
  if invitation.id is null then raise exception 'This invitation could not be found'; end if;
  if invitation.status <> 'pending' then raise exception 'This invitation is no longer pending'; end if;
  if invitation.expires_at < now() then
    update public.business_invitations set status = 'expired' where id = invitation.id;
    raise exception 'This invitation has expired';
  end if;
  if current_email <> lower(invitation.email) then raise exception 'Sign in with the invited email address to accept this invitation'; end if;

  insert into public.business_members (business_id, user_id, role)
  values (invitation.business_id, auth.uid(), invitation.role)
  on conflict (business_id, user_id) do update set role = excluded.role;

  update public.business_invitations set status = 'accepted', accepted_by = auth.uid(), accepted_at = now() where id = invitation.id;
  select * into selected_business from public.businesses where id = invitation.business_id;
  return query select selected_business.id, selected_business.name, invitation.role;
end;
$$;

revoke all on function public.create_business_invitation(uuid, text, text) from public, anon;
revoke all on function public.accept_business_invitation(uuid) from public, anon;
grant execute on function public.create_business_invitation(uuid, text, text) to authenticated;
grant execute on function public.accept_business_invitation(uuid) to authenticated;
