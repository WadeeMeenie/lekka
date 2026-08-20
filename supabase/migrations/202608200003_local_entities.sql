create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'manager', 'owner')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  community_id uuid references public.communities(id) on delete set null,
  title text not null,
  description text not null default '',
  category text not null default 'Event',
  area text not null,
  approximate_location geography(Point, 4326),
  start_time timestamptz not null,
  end_time timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  description text not null default '',
  area text not null,
  approximate_location geography(Point, 4326),
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists events_location_gix on public.events using gist (approximate_location);
create index if not exists events_start_idx on public.events (start_time);
create index if not exists deals_location_gix on public.deals using gist (approximate_location);
create index if not exists deals_end_idx on public.deals (end_time);

alter table public.business_members enable row level security;
alter table public.events enable row level security;
alter table public.deals enable row level security;

create policy business_members_public_read on public.business_members for select using (true);
create policy business_members_owner_write on public.business_members for all using (
  exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
) with check (
  exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
);
create policy events_public_read on public.events for select using (true);
create policy events_owner_write on public.events for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy deals_public_read on public.deals for select using (true);
create policy deals_business_write on public.deals for all using (
  exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
) with check (
  exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
);

create or replace function public.nearby_events(
  latitude double precision,
  longitude double precision,
  radius_meters integer
)
returns table (id uuid, title text, description text, area text, distance text, start_time timestamptz)
language sql stable security invoker set search_path = public, extensions
as $$
  with user_point as (select st_setsrid(st_makepoint(longitude, latitude), 4326)::geography as point)
  select e.id, e.title, e.description, e.area,
         concat(round(st_distance(e.approximate_location, u.point)::numeric / 1000, 1), ' km') as distance,
         e.start_time
  from public.events e cross join user_point u
  where e.approximate_location is not null
    and st_dwithin(e.approximate_location, u.point, greatest(radius_meters, 500))
  order by st_distance(e.approximate_location, u.point), e.start_time
  limit 100;
$$;

grant execute on function public.nearby_events(double precision, double precision, integer) to anon, authenticated;

create or replace function public.nearby_deals(
  latitude double precision,
  longitude double precision,
  radius_meters integer
)
returns table (id uuid, business_id uuid, title text, description text, area text, distance text, end_time timestamptz)
language sql stable security invoker set search_path = public, extensions
as $$
  with user_point as (select st_setsrid(st_makepoint(longitude, latitude), 4326)::geography as point)
  select d.id, d.business_id, d.title, d.description, d.area,
         concat(round(st_distance(d.approximate_location, u.point)::numeric / 1000, 1), ' km') as distance,
         d.end_time
  from public.deals d cross join user_point u
  where d.approximate_location is not null
    and st_dwithin(d.approximate_location, u.point, greatest(radius_meters, 500))
  order by st_distance(d.approximate_location, u.point), d.end_time nulls last
  limit 100;
$$;

grant execute on function public.nearby_deals(double precision, double precision, integer) to anon, authenticated;
