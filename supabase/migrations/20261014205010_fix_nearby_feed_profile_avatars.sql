drop function if exists public.nearby_feed_posts_page(double precision, double precision, integer, timestamp with time zone, uuid, integer);
create function public.nearby_feed_posts_page(
  latitude double precision, longitude double precision, radius_meters integer,
  cursor_created_at timestamp with time zone default null, cursor_id uuid default null, page_size integer default 20
)
returns table(id uuid, author_id uuid, kind public.post_kind, category text, title text, body text, area text,
  trust_score numeric, created_at timestamp with time zone, distance_label text, author_name text,
  profile_image_path text, reaction_count bigint, comment_count bigint)
language sql stable security definer set search_path = ''
as $function$
  with user_point as (select public.st_setsrid(public.st_makepoint(longitude,latitude),4326)::public.geography as point)
  select p.id,p.author_id,p.kind,p.category,p.title,p.body,p.area,p.trust_score,p.created_at,
    concat(round(public.st_distance(p.approximate_location,u.point)::numeric/1000,1),' km'),
    coalesce(pr.display_name,'Local neighbour'),pr.profile_image_path,
    (select count(*) from public.reactions r where r.post_id=p.id),
    (select count(*) from public.comments c where c.post_id=p.id)
  from public.posts p cross join user_point u left join public.profiles pr on pr.id=p.author_id
  where (select auth.uid()) is not null and p.approximate_location is not null
    and public.st_dwithin(p.approximate_location,u.point,greatest(radius_meters,500))
    and (p.author_id=(select auth.uid()) or (
      p.visibility in ('public'::public.visibility_scope,'nearby'::public.visibility_scope)
      and (p.community_id is null or exists (select 1 from public.communities c where c.id=p.community_id
        and (c.visibility='public' or c.created_by=(select auth.uid()) or (select public.is_community_member(c.id,(select auth.uid()))))))))
    and (cursor_created_at is null or p.created_at<cursor_created_at or (p.created_at=cursor_created_at and p.id<cursor_id))
  order by p.created_at desc,p.id desc limit least(greatest(page_size,1),50);
$function$;
drop function if exists public.nearby_feed_posts(double precision, double precision, integer);
create function public.nearby_feed_posts(latitude double precision, longitude double precision, radius_meters integer)
returns table(id uuid, author_id uuid, kind public.post_kind, category text, title text, body text, area text,
  trust_score numeric, created_at timestamp with time zone, distance_label text, author_name text, profile_image_path text)
language sql stable security definer set search_path = ''
as $function$
  with user_point as (select public.st_setsrid(public.st_makepoint(longitude,latitude),4326)::public.geography as point)
  select p.id,p.author_id,p.kind,p.category,p.title,p.body,p.area,p.trust_score,p.created_at,
    concat(round(public.st_distance(p.approximate_location,u.point)::numeric/1000,1),' km'),
    coalesce(pr.display_name,'Local neighbour'),pr.profile_image_path
  from public.posts p cross join user_point u left join public.profiles pr on pr.id=p.author_id
  where (select auth.uid()) is not null and p.approximate_location is not null
    and public.st_dwithin(p.approximate_location,u.point,greatest(radius_meters,500))
    and (p.author_id=(select auth.uid()) or (
      p.visibility in ('public'::public.visibility_scope,'nearby'::public.visibility_scope)
      and (p.community_id is null or exists (select 1 from public.communities c where c.id=p.community_id
        and (c.visibility='public' or c.created_by=(select auth.uid()) or (select public.is_community_member(c.id,(select auth.uid()))))))))
  order by public.st_distance(p.approximate_location,u.point),p.created_at desc limit 50;
$function$;
revoke all on function public.nearby_feed_posts_page(double precision,double precision,integer,timestamp with time zone,uuid,integer) from public, anon;
grant execute on function public.nearby_feed_posts_page(double precision,double precision,integer,timestamp with time zone,uuid,integer) to authenticated;
revoke all on function public.nearby_feed_posts(double precision,double precision,integer) from public, anon;
grant execute on function public.nearby_feed_posts(double precision,double precision,integer) to authenticated;
