-- Pin security-definer business/payment functions to an empty search_path.
-- All relations/functions are explicitly schema-qualified so caller-controlled
-- search_path state cannot influence privileged execution.

create or replace function public.is_business_manager(target_business_id uuid, target_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = target_business_id
      and bm.user_id = target_user
      and bm.role = any(array['owner','admin','manager'])
  );
$$;

create or replace function public.can_manage_business(target_business uuid, target_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = target_business
      and bm.user_id = target_user
      and bm.role in ('owner','admin','manager')
  );
$$;

create or replace function public.is_platform_admin(target_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.platform_admins where user_id = target_user);
$$;

create or replace function public.prevent_business_verification_tampering()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.verification_state is distinct from old.verification_state
     and not public.is_platform_admin(auth.uid()) then
    raise exception 'Business verification can only be changed by Lekka administrators';
  end if;
  return new;
end;
$$;

create or replace function public.create_business_profile(
  p_name text, p_category text, p_description text, p_area text, p_address text,
  p_phone text, p_email text, p_website text, p_business_type text,
  p_location_mode text, p_service_areas text[], p_opening_hours jsonb,
  p_latitude double precision default null, p_longitude double precision default null
)
returns public.businesses
language plpgsql security definer set search_path = ''
as $$
declare
  created_business public.businesses;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if pg_catalog.char_length(pg_catalog.btrim(coalesce(p_name, ''))) = 0
     or pg_catalog.char_length(pg_catalog.btrim(coalesce(p_category, ''))) = 0
     or pg_catalog.char_length(pg_catalog.btrim(coalesce(p_area, ''))) = 0 then
    raise exception 'Business name, category, and area are required';
  end if;
  if p_location_mode not in ('physical', 'service', 'both') then raise exception 'Invalid business location mode'; end if;

  insert into public.businesses (
    owner_id, name, category, description, area, address, phone, business_email, website,
    business_type, location_mode, service_areas, opening_hours, approximate_location
  ) values (
    auth.uid(), pg_catalog.btrim(p_name), pg_catalog.btrim(p_category), pg_catalog.btrim(coalesce(p_description, '')), pg_catalog.btrim(p_area),
    nullif(pg_catalog.btrim(coalesce(p_address, '')), ''), nullif(pg_catalog.btrim(coalesce(p_phone, '')), ''),
    nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, ''))), ''), nullif(pg_catalog.btrim(coalesce(p_website, '')), ''),
    nullif(pg_catalog.btrim(coalesce(p_business_type, '')), ''), p_location_mode, coalesce(p_service_areas, '{}'), coalesce(p_opening_hours, '{}'::jsonb),
    case when p_latitude is null or p_longitude is null then null
      else public.st_setsrid(public.st_makepoint(p_longitude, p_latitude), 4326)::public.geography end
  ) returning * into created_business;

  insert into public.business_members (business_id, user_id, role)
  values (created_business.id, auth.uid(), 'owner')
  on conflict (business_id, user_id) do update set role = excluded.role;

  update public.profiles set account_intent = 'business', updated_at = pg_catalog.now() where id = auth.uid();
  return created_business;
end;
$$;

create or replace function public.update_business_profile(
  p_business_id uuid, p_name text, p_category text, p_description text, p_area text,
  p_address text, p_phone text, p_email text, p_website text, p_business_type text,
  p_location_mode text, p_service_areas text[], p_opening_hours jsonb
)
returns public.businesses
language plpgsql security definer set search_path = ''
as $$
declare updated_business public.businesses;
begin
  if auth.uid() is null or not exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id and bm.user_id = auth.uid() and bm.role in ('owner','admin','manager')
  ) then raise exception 'You are not allowed to edit this business'; end if;
  if p_location_mode not in ('physical','service','both') then raise exception 'Invalid business location mode'; end if;
  update public.businesses set
    name = pg_catalog.btrim(p_name), category = pg_catalog.btrim(p_category), description = pg_catalog.btrim(coalesce(p_description,'')),
    area = pg_catalog.btrim(p_area), address = nullif(pg_catalog.btrim(coalesce(p_address,'')), ''),
    phone = nullif(pg_catalog.btrim(coalesce(p_phone,'')), ''), business_email = nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_email,''))), ''),
    website = nullif(pg_catalog.btrim(coalesce(p_website,'')), ''), business_type = nullif(pg_catalog.btrim(coalesce(p_business_type,'')), ''),
    location_mode = p_location_mode, service_areas = coalesce(p_service_areas,'{}'), opening_hours = coalesce(p_opening_hours,'{}'::jsonb), updated_at = pg_catalog.now()
  where id = p_business_id returning * into updated_business;
  return updated_business;
end;
$$;

create or replace function public.attach_yoco_checkout(p_order_id uuid, p_checkout_id text)
returns public.payment_orders
language plpgsql security definer set search_path = ''
as $$
declare v_order public.payment_orders;
begin
  update public.payment_orders set provider_checkout_id = p_checkout_id, updated_at = pg_catalog.now()
  where id = p_order_id and user_id = auth.uid() and status = 'pending'
  returning * into v_order;
  if v_order.id is null then raise exception 'payment_order_not_found'; end if;
  return v_order;
end;
$$;

create or replace function public.create_yoco_payment_order(
  p_business_id uuid, p_purpose text, p_reference_id uuid, p_amount_cents integer, p_metadata jsonb default '{}'
)
returns public.payment_orders
language plpgsql security definer set search_path = ''
as $$
declare v_order public.payment_orders; v_user uuid := auth.uid(); v_idempotency text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_amount_cents < 200 then raise exception 'invalid_amount'; end if;
  if p_purpose not in ('verification','boost') then raise exception 'invalid_purpose'; end if;
  if p_business_id is not null and not exists (
    select 1 from public.business_members bm where bm.business_id = p_business_id and bm.user_id = v_user and bm.role in ('owner','admin','manager')
  ) then raise exception 'not_business_manager'; end if;
  v_idempotency := extensions.gen_random_uuid()::text;
  insert into public.payment_orders(user_id,business_id,purpose,reference_id,amount_cents,idempotency_key,metadata)
  values(v_user,p_business_id,p_purpose,p_reference_id,p_amount_cents,v_idempotency,coalesce(p_metadata,'{}'::jsonb)) returning * into v_order;
  return v_order;
end;
$$;

create or replace function public.submit_business_verification(p_business_id uuid, p_evidence_note text default '')
returns public.business_verification_requests
language plpgsql security definer set search_path = ''
as $$
declare result public.business_verification_requests;
begin
  if auth.uid() is null or not public.can_manage_business(p_business_id, auth.uid()) then raise exception 'You are not allowed to request verification for this business'; end if;
  if exists (select 1 from public.business_verification_requests where business_id = p_business_id and status = 'pending') then raise exception 'A verification request is already pending'; end if;
  insert into public.business_verification_requests (business_id, requested_by, evidence_note)
  values (p_business_id, auth.uid(), left(coalesce(p_evidence_note,''), 4000)) returning * into result;
  return result;
end;
$$;

create or replace function public.create_business_invitation(p_business_id uuid, p_email text, p_role text)
returns table(id uuid, token uuid, expires_at timestamptz, business_name text)
language plpgsql security definer set search_path = ''
as $$
declare invitation public.business_invitations; selected_business public.businesses;
begin
  if auth.uid() is null or not exists (select 1 from public.business_members bm where bm.business_id=p_business_id and bm.user_id=auth.uid() and bm.role in ('owner','admin','manager')) then raise exception 'You are not allowed to invite members for this business'; end if;
  if p_role not in ('admin','staff') then raise exception 'Only admin or staff invitations are supported'; end if;
  if pg_catalog.lower(pg_catalog.btrim(coalesce(p_email,''))) !~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$' then raise exception 'Enter a valid email address'; end if;
  select * into selected_business from public.businesses where id=p_business_id;
  if selected_business.id is null then raise exception 'Business not found'; end if;
  insert into public.business_invitations (business_id,email,role,created_by)
  values(p_business_id,pg_catalog.lower(pg_catalog.btrim(p_email)),p_role,auth.uid())
  on conflict (business_id, pg_catalog.lower(email)) where status='pending'
  do update set role=excluded.role,created_by=excluded.created_by,token=extensions.gen_random_uuid(),expires_at=pg_catalog.now()+interval '14 days',created_at=pg_catalog.now()
  returning * into invitation;
  return query select invitation.id, invitation.token, invitation.expires_at, selected_business.name;
end;
$$;

create or replace function public.accept_business_invitation(p_token uuid)
returns table(business_id uuid, business_name text, role text)
language plpgsql security definer set search_path = ''
as $$
declare invitation public.business_invitations; selected_business public.businesses; current_email text;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  current_email := pg_catalog.lower(coalesce(auth.jwt() ->> 'email',''));
  if current_email='' then raise exception 'A verified email address is required to accept an invitation'; end if;
  select * into invitation from public.business_invitations where token=p_token for update;
  if invitation.id is null then raise exception 'This invitation could not be found'; end if;
  if invitation.status <> 'pending' then raise exception 'This invitation is no longer pending'; end if;
  if invitation.expires_at < pg_catalog.now() then update public.business_invitations set status='expired' where id=invitation.id; raise exception 'This invitation has expired'; end if;
  if current_email <> pg_catalog.lower(invitation.email) then raise exception 'Sign in with the invited email address to accept this invitation'; end if;
  insert into public.business_members(business_id,user_id,role) values(invitation.business_id,auth.uid(),invitation.role)
  on conflict (business_id,user_id) do update set role=excluded.role;
  update public.business_invitations set status='accepted',accepted_by=auth.uid(),accepted_at=pg_catalog.now() where id=invitation.id;
  select * into selected_business from public.businesses where id=invitation.business_id;
  return query select selected_business.id,selected_business.name,invitation.role;
end;
$$;

create or replace function public.review_business_verification(p_request_id uuid, p_status text, p_review_note text default '')
returns public.business_verification_requests
language plpgsql security definer set search_path = ''
as $$
declare result public.business_verification_requests;
begin
  if auth.uid() is null or not public.is_platform_admin(auth.uid()) then raise exception 'Only Lekka administrators can review verification requests'; end if;
  if p_status not in ('approved','rejected') then raise exception 'Invalid verification review status'; end if;
  update public.business_verification_requests set status=p_status,reviewed_by=auth.uid(),reviewed_at=pg_catalog.now(),review_note=left(coalesce(p_review_note,''),4000),updated_at=pg_catalog.now()
  where id=p_request_id and status='pending' returning * into result;
  if result.id is null then raise exception 'Verification request is unavailable'; end if;
  update public.businesses set verification_state=case when p_status='approved' then 'verified' else 'rejected' end,updated_at=pg_catalog.now() where id=result.business_id;
  return result;
end;
$$;
