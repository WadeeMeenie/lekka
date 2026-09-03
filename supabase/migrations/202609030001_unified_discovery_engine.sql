create or replace function public.discover_nearby(
  latitude double precision,
  longitude double precision,
  radius_meters integer,
  content_type_filter text default null,
  category_filter text default null,
  search_query text default null,
  result_limit integer default 100
)
returns table (
  source_type text,
  id uuid,
  business_id uuid,
  category text,
  title text,
  description text,
  area text,
  distance_meters double precision,
  created_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  verified boolean
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with user_point as (
    select st_setsrid(st_makepoint(longitude, latitude), 4326)::geography as point
  ),
  normalized as (
    select nullif(lower(trim(content_type_filter)), '') as content_type,
           nullif(lower(trim(category_filter)), '') as category,
           nullif(trim(search_query), '') as search
  ),
  post_items as (
    select case when p.kind = 'alert' then 'alert' else 'post' end,
           p.id, p.business_id, coalesce(p.category, p.kind::text),
           coalesce(p.title, left(p.body, 80)), p.body, p.area,
           st_distance(p.approximate_location, u.point), p.created_at,
           null::timestamptz, null::timestamptz, false
    from public.posts p cross join user_point u cross join normalized n
    where p.approximate_location is not null
      and st_dwithin(p.approximate_location, u.point, greatest(coalesce(radius_meters, 500), 500))
      and (n.content_type is null or n.content_type in ('all', 'post', 'alert', 'job', 'marketplace', 'service', 'deal', 'event'))
      and (n.content_type is null or n.content_type in ('all', 'post', 'alert') or p.kind::text = n.content_type)
      and (n.category is null or n.category = 'all' or lower(coalesce(p.category, p.kind::text)) = n.category)
      and (n.search is null or to_tsvector('english', coalesce(p.title, '') || ' ' || p.body || ' ' || p.area) @@ websearch_to_tsquery('english', n.search))
  ),
  business_items as (
    select 'business', b.id, b.id, b.category, b.name, b.description, b.area,
           st_distance(b.approximate_location, u.point), b.created_at,
           null::timestamptz, null::timestamptz, b.verification_state = 'verified'
    from public.businesses b cross join user_point u cross join normalized n
    where b.approximate_location is not null
      and st_dwithin(b.approximate_location, u.point, greatest(coalesce(radius_meters, 500), 500))
      and (n.content_type is null or n.content_type in ('all', 'business'))
      and (n.category is null or n.category = 'all' or lower(b.category) = n.category)
      and (n.search is null or to_tsvector('english', b.name || ' ' || b.description || ' ' || b.category || ' ' || b.area) @@ websearch_to_tsquery('english', n.search))
  ),
  event_items as (
    select 'event', e.id, e.business_id, e.category, e.title, e.description, e.area,
           st_distance(e.approximate_location, u.point), e.created_at,
           e.start_time, e.end_time, false
    from public.events e cross join user_point u cross join normalized n
    where e.approximate_location is not null
      and st_dwithin(e.approximate_location, u.point, greatest(coalesce(radius_meters, 500), 500))
      and (n.content_type is null or n.content_type in ('all', 'event'))
      and (n.category is null or n.category = 'all' or lower(e.category) = n.category)
      and (n.search is null or to_tsvector('english', e.title || ' ' || e.description || ' ' || e.area) @@ websearch_to_tsquery('english', n.search))
      and e.start_time >= now() - interval '1 hour'
  ),
  deal_items as (
    select 'deal', d.id, d.business_id, 'Deal', d.title, d.description, d.area,
           st_distance(d.approximate_location, u.point), d.created_at,
           d.start_time, d.end_time, false
    from public.deals d cross join user_point u cross join normalized n
    where d.approximate_location is not null
      and st_dwithin(d.approximate_location, u.point, greatest(coalesce(radius_meters, 500), 500))
      and (n.content_type is null or n.content_type in ('all', 'deal'))
      and (n.category is null or n.category = 'all' or n.category = 'deal')
      and (n.search is null or to_tsvector('english', d.title || ' ' || d.description || ' ' || d.area) @@ websearch_to_tsquery('english', n.search))
      and (d.end_time is null or d.end_time >= now())
  )
  select * from (
    select * from post_items
    union all select * from business_items
    union all select * from event_items
    union all select * from deal_items
  ) items
  order by distance_meters asc, created_at desc
  limit greatest(coalesce(result_limit, 100), 1);
$$;

grant execute on function public.discover_nearby(double precision, double precision, integer, text, text, text, integer) to anon, authenticated;
