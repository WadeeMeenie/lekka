alter table public.profiles
  add column if not exists account_intent text not null default 'personal'
  check (account_intent in ('personal', 'business'));

create table if not exists public.personal_identities (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  surname text not null check (char_length(btrim(surname)) between 1 and 80),
  date_of_birth date not null check (date_of_birth >= date '1900-01-01'),
  gender text check (gender in ('male', 'female', 'prefer_not_to_say')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.personal_identities enable row level security;
create policy personal_identities_self_read on public.personal_identities for select using (auth.uid() = user_id);
create policy personal_identities_self_insert on public.personal_identities for insert with check (auth.uid() = user_id);
create policy personal_identities_self_update on public.personal_identities for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.businesses
  add column if not exists business_email text,
  add column if not exists business_type text,
  add column if not exists location_mode text not null default 'physical' check (location_mode in ('physical', 'service', 'both')),
  add column if not exists service_areas text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now();

create index if not exists business_members_user_idx on public.business_members (user_id, created_at desc);

create or replace function public.create_business_profile(
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
  p_opening_hours jsonb,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns public.businesses
language plpgsql security definer set search_path = public, extensions
as $$
declare
  created_business public.businesses;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if char_length(btrim(coalesce(p_name, ''))) = 0 or char_length(btrim(coalesce(p_category, ''))) = 0 or char_length(btrim(coalesce(p_area, ''))) = 0 then
    raise exception 'Business name, category, and area are required';
  end if;

  if p_location_mode not in ('physical', 'service', 'both') then
    raise exception 'Invalid business location mode';
  end if;

  insert into public.businesses (
    owner_id, name, category, description, area, address, phone, business_email, website,
    business_type, location_mode, service_areas, opening_hours, approximate_location
  ) values (
    auth.uid(), btrim(p_name), btrim(p_category), btrim(coalesce(p_description, '')), btrim(p_area),
    nullif(btrim(coalesce(p_address, '')), ''), nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(lower(btrim(coalesce(p_email, ''))), ''), nullif(btrim(coalesce(p_website, '')), ''),
    nullif(btrim(coalesce(p_business_type, '')), ''), p_location_mode, coalesce(p_service_areas, '{}'),
    coalesce(p_opening_hours, '{}'::jsonb),
    case when p_latitude is null or p_longitude is null then null else st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography end
  ) returning * into created_business;

  insert into public.business_members (business_id, user_id, role)
  values (created_business.id, auth.uid(), 'owner')
  on conflict (business_id, user_id) do update set role = excluded.role;

  update public.profiles set account_intent = 'business', updated_at = now() where id = auth.uid();
  return created_business;
end;
$$;

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
    where bm.business_id = p_business_id and bm.user_id = auth.uid() and bm.role in ('owner', 'manager')
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

revoke all on function public.create_business_profile(text, text, text, text, text, text, text, text, text, text, text[], jsonb, double precision, double precision) from public, anon;
revoke all on function public.update_business_profile(uuid, text, text, text, text, text, text, text, text, text, text, text[], jsonb) from public, anon;
grant execute on function public.create_business_profile(text, text, text, text, text, text, text, text, text, text, text[], jsonb, double precision, double precision) to authenticated;
grant execute on function public.update_business_profile(uuid, text, text, text, text, text, text, text, text, text, text, text[], jsonb) to authenticated;
