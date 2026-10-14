create or replace function public.nearby_radar(
  latitude double precision,
  longitude double precision,
  radius_meters integer,
  category_filter text default null
)
returns table(id uuid, category text, title text, subtitle text, area text, distance text, "time" text, accent text, icon text)
language sql stable set search_path = public, extensions
as $function$
  with user_point as (
    select st_setsrid(st_makepoint(longitude, latitude), 4326)::geography as point
  ),
  post_items as (
    select p.id,
      coalesce(p.category, p.kind::text) as category,
      coalesce(p.title, left(p.body, 60)) as title,
      p.body as subtitle,
      p.area,
      concat(round(st_distance(p.approximate_location, u.point)::numeric / 1000, 1), ' km') as distance,
      to_char(p.created_at, 'DD Mon · HH24:MI') as "time",
      case when p.kind = 'alert' then '#D95D4F' else '#2F7D67' end as accent,
      case when p.kind = 'alert' then 'campaign' else 'place' end as icon,
      p.created_at as sort_time
    from public.posts p cross join user_point u
    where p.approximate_location is not null
      and st_dwithin(p.approximate_location, u.point, greatest(radius_meters, 500))
      and (
        category_filter is null or lower(category_filter) = 'all'
        or lower(coalesce(p.category, p.kind::text)) =
          case lower(category_filter) when 'deals' then 'deal' when 'events' then 'event'
            when 'jobs' then 'job' when 'services' then 'service' else lower(category_filter) end
      )
      and (
        lower(coalesce(p.category, '')) <> 'marketplace'
        or lower(coalesce(category_filter, '')) <> 'marketplace'
        or p.marketplace_status = 'available'
      )
  ),
  business_items as (
    select b.id, b.category, b.name as title, b.description as subtitle, b.area,
      concat(round(st_distance(b.approximate_location, u.point)::numeric / 1000, 1), ' km') as distance,
      case when b.verification_state = 'verified' then 'Verified' else 'Business' end as "time",
      '#E9A23B' as accent, 'restaurant' as icon, b.created_at as sort_time
    from public.businesses b cross join user_point u
    where b.approximate_location is not null
      and st_dwithin(b.approximate_location, u.point, greatest(radius_meters, 500))
      and (category_filter is null or lower(category_filter) = 'all' or lower(b.category) = lower(category_filter))
  )
  select id, category, title, subtitle, area, distance, "time", accent, icon
  from (select * from post_items union all select * from business_items) nearby
  order by sort_time desc
  limit 100;
$function$;
