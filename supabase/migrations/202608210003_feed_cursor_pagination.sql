-- Location-first cursor pagination. The cursor is (created_at, id), ordered newest-first.
create or replace function public.nearby_feed_posts_page(
  latitude double precision,
  longitude double precision,
  radius_meters integer,
  cursor_created_at timestamptz default null,
  cursor_id uuid default null,
  page_size integer default 20
)
returns table (
  id uuid,
  kind public.post_kind,
  category text,
  title text,
  body text,
  area text,
  trust_score numeric,
  created_at timestamptz,
  distance_label text,
  author_name text,
  reaction_count bigint,
  comment_count bigint
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with user_point as (
    select st_setsrid(st_makepoint(longitude, latitude), 4326)::geography as point
  )
  select p.id,
         p.kind,
         p.category,
         p.title,
         p.body,
         p.area,
         p.trust_score,
         p.created_at,
         concat(round(st_distance(p.approximate_location, u.point)::numeric / 1000, 1), ' km') as distance_label,
         coalesce(pr.display_name, 'Local neighbour') as author_name,
         (select count(*) from public.reactions r where r.post_id = p.id) as reaction_count,
         (select count(*) from public.comments c where c.post_id = p.id) as comment_count
  from public.posts p
  cross join user_point u
  left join public.profiles pr on pr.id = p.author_id
  where p.approximate_location is not null
    and st_dwithin(p.approximate_location, u.point, greatest(radius_meters, 500))
    and (cursor_created_at is null or p.created_at < cursor_created_at or (p.created_at = cursor_created_at and p.id < cursor_id))
  order by p.created_at desc, p.id desc
  limit least(greatest(page_size, 1), 50);
$$;

grant execute on function public.nearby_feed_posts_page(double precision, double precision, integer, timestamptz, uuid, integer) to anon, authenticated;
