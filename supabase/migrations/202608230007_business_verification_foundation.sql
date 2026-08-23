create table if not exists public.platform_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
drop policy if exists platform_admins_self_read on public.platform_admins;
create policy platform_admins_self_read on public.platform_admins for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.is_platform_admin(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.platform_admins where user_id = target_user); $$;
revoke execute on function public.is_platform_admin(uuid) from public, anon;
grant execute on function public.is_platform_admin(uuid) to authenticated;

create table if not exists public.business_verification_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','approved','rejected','withdrawn')),
  evidence_note text not null default '',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.business_verification_requests enable row level security;
create unique index if not exists business_verification_one_pending_idx on public.business_verification_requests(business_id) where status = 'pending';
create index if not exists business_verification_requests_business_idx on public.business_verification_requests(business_id, created_at desc);
create index if not exists business_verification_requests_status_idx on public.business_verification_requests(status, created_at desc);

create or replace function public.can_manage_business(target_business uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = target_business and bm.user_id = target_user and bm.role in ('owner','admin','manager')
  );
$$;
revoke execute on function public.can_manage_business(uuid,uuid) from public, anon;
grant execute on function public.can_manage_business(uuid,uuid) to authenticated;

create policy business_verification_requester_read on public.business_verification_requests
  for select to authenticated
  using ((select auth.uid()) = requested_by or public.can_manage_business(business_id, (select auth.uid())) or public.is_platform_admin((select auth.uid())));
create policy business_verification_requester_create on public.business_verification_requests
  for insert to authenticated
  with check ((select auth.uid()) = requested_by and public.can_manage_business(business_id, (select auth.uid())) and status = 'pending');
create policy business_verification_requester_withdraw on public.business_verification_requests
  for update to authenticated
  using ((select auth.uid()) = requested_by and status = 'pending')
  with check ((select auth.uid()) = requested_by and status = 'withdrawn');
create policy business_verification_admin_review on public.business_verification_requests
  for update to authenticated
  using (public.is_platform_admin((select auth.uid())))
  with check (public.is_platform_admin((select auth.uid())) and status in ('approved','rejected','pending','withdrawn'));

create or replace function public.prevent_business_verification_tampering()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.verification_state is distinct from old.verification_state and not public.is_platform_admin(auth.uid()) then
    raise exception 'Business verification can only be changed by Lekka administrators';
  end if;
  return new;
end;
$$;
drop trigger if exists business_verification_state_guard on public.businesses;
create trigger business_verification_state_guard before update on public.businesses
for each row execute function public.prevent_business_verification_tampering();

create or replace function public.submit_business_verification(p_business_id uuid, p_evidence_note text default '')
returns public.business_verification_requests language plpgsql security definer set search_path = public
as $$
declare result public.business_verification_requests;
begin
  if auth.uid() is null or not public.can_manage_business(p_business_id, auth.uid()) then
    raise exception 'You are not allowed to request verification for this business';
  end if;
  if exists (select 1 from public.business_verification_requests where business_id = p_business_id and status = 'pending') then
    raise exception 'A verification request is already pending';
  end if;
  insert into public.business_verification_requests (business_id, requested_by, evidence_note)
  values (p_business_id, auth.uid(), left(coalesce(p_evidence_note,''), 4000))
  returning * into result;
  return result;
end;
$$;
revoke execute on function public.submit_business_verification(uuid,text) from public, anon;
grant execute on function public.submit_business_verification(uuid,text) to authenticated;

create or replace function public.review_business_verification(p_request_id uuid, p_status text, p_review_note text default '')
returns public.business_verification_requests language plpgsql security definer set search_path = public
as $$
declare result public.business_verification_requests;
begin
  if auth.uid() is null or not public.is_platform_admin(auth.uid()) then
    raise exception 'Only Lekka administrators can review verification requests';
  end if;
  if p_status not in ('approved','rejected') then raise exception 'Invalid verification review status'; end if;
  update public.business_verification_requests
  set status = p_status, reviewed_by = auth.uid(), reviewed_at = now(), review_note = left(coalesce(p_review_note,''), 4000), updated_at = now()
  where id = p_request_id and status = 'pending'
  returning * into result;
  if result.id is null then raise exception 'Verification request is unavailable'; end if;
  update public.businesses set verification_state = case when p_status = 'approved' then 'verified' else 'rejected' end, updated_at = now()
  where id = result.business_id;
  return result;
end;
$$;
revoke execute on function public.review_business_verification(uuid,text,text) from public, anon;
grant execute on function public.review_business_verification(uuid,text,text) to authenticated;
