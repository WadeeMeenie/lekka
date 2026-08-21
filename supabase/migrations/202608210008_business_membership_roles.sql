alter table public.business_members drop constraint if exists business_members_role_check;
alter table public.business_members add constraint business_members_role_check
  check (role in ('owner', 'admin', 'staff', 'manager', 'member'));

create or replace function public.update_business_profile(
  p_business_id uuid,
  p_name text,
  p_category text,
  p_description text,
  p_area text,
  p_address text,
  p_phone text,
  p_email text,
  p_website text,
  p_business_type text,
  p_location_mode text,
  p_service_areas text[],
  p_opening_hours jsonb
)
returns public.businesses
language plpgsql security definer set search_path = public
as $$
declare
  updated_business public.businesses;
begin
  if auth.uid() is null or not exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id and bm.user_id = auth.uid() and bm.role in ('owner', 'admin', 'manager')
  ) then
    raise exception 'You are not allowed to edit this business';
  end if;

  if p_location_mode not in ('physical', 'service', 'both') then
    raise exception 'Invalid business location mode';
  end if;

  update public.businesses set
    name = btrim(p_name), category = btrim(p_category), description = btrim(coalesce(p_description, '')),
    area = btrim(p_area), address = nullif(btrim(coalesce(p_address, '')), ''),
    phone = nullif(btrim(coalesce(p_phone, '')), ''), business_email = nullif(lower(btrim(coalesce(p_email, ''))), ''),
    website = nullif(btrim(coalesce(p_website, '')), ''), business_type = nullif(btrim(coalesce(p_business_type, '')), ''),
    location_mode = p_location_mode, service_areas = coalesce(p_service_areas, '{}'),
    opening_hours = coalesce(p_opening_hours, '{}'::jsonb), updated_at = now()
  where id = p_business_id
  returning * into updated_business;

  return updated_business;
end;
$$;

drop policy if exists posts_author_write on public.posts;
drop policy if exists posts_author_update on public.posts;

create policy posts_author_write on public.posts for insert with check (
  auth.uid() = author_id and (
    business_id is null or exists (
      select 1 from public.business_members bm
      where bm.business_id = posts.business_id and bm.user_id = auth.uid() and bm.role in ('owner', 'admin', 'manager')
    )
  )
);

create policy posts_author_update on public.posts for update using (auth.uid() = author_id) with check (
  auth.uid() = author_id and (
    business_id is null or exists (
      select 1 from public.business_members bm
      where bm.business_id = posts.business_id and bm.user_id = auth.uid() and bm.role in ('owner', 'admin', 'manager')
    )
  )
);
