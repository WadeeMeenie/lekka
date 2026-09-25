-- Prevent authenticated users from probing whether arbitrary accounts are platform admins.
drop policy if exists business_verification_admin_review on public.business_verification_requests;
drop policy if exists business_verification_requester_read on public.business_verification_requests;
drop policy if exists yoco_webhook_subscriptions_admin_read on public.yoco_webhook_subscriptions;

drop function if exists public.is_platform_admin(uuid);

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
    and exists (
      select 1
      from public.platform_admins
      where user_id = auth.uid()
    );
$function$;

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

create policy business_verification_admin_review
  on public.business_verification_requests
  for update
  to authenticated
  using (public.is_platform_admin())
  with check (
    public.is_platform_admin()
    and status in ('approved','rejected','pending','withdrawn')
  );

create policy business_verification_requester_read
  on public.business_verification_requests
  for select
  to authenticated
  using (
    auth.uid() = requested_by
    or public.can_manage_business(business_id, auth.uid())
    or public.is_platform_admin()
  );

create policy yoco_webhook_subscriptions_admin_read
  on public.yoco_webhook_subscriptions
  for select
  to authenticated
  using (public.is_platform_admin());

create or replace function public.review_business_verification(
  p_request_id uuid,
  p_status text,
  p_review_note text default null
)
returns public.business_verification_requests
language plpgsql
security definer
set search_path = ''
as $function$
declare
  result public.business_verification_requests;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Only Lekka administrators can review verification requests';
  end if;
  if p_status not in ('approved','rejected') then
    raise exception 'Invalid verification review status';
  end if;

  update public.business_verification_requests
  set status = p_status,
      reviewed_by = auth.uid(),
      reviewed_at = pg_catalog.now(),
      review_note = left(coalesce(p_review_note,''),4000),
      updated_at = pg_catalog.now()
  where id = p_request_id
    and status = 'pending'
  returning * into result;

  if result.id is null then
    raise exception 'Verification request is unavailable';
  end if;

  update public.businesses
  set verification_state = case when p_status='approved' then 'verified' else 'rejected' end,
      updated_at = pg_catalog.now()
  where id = result.business_id;

  return result;
end;
$function$;

revoke all on function public.review_business_verification(uuid,text,text) from public, anon;
grant execute on function public.review_business_verification(uuid,text,text) to authenticated;

create or replace function public.prevent_business_verification_tampering()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.verification_state is distinct from old.verification_state
     and not public.is_platform_admin() then
    raise exception 'Business verification can only be changed by Lekka administrators';
  end if;
  return new;
end;
$function$;

revoke all on function public.prevent_business_verification_tampering() from public, anon, authenticated;
grant execute on function public.prevent_business_verification_tampering() to authenticated;
