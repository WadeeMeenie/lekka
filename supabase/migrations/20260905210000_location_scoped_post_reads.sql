-- Location-scoped post reads: nearby posts must never be directly selectable.
-- Direct table access is reserved for public posts, permitted community posts,
-- and the caller's own posts. Nearby discovery is exposed through SECURITY DEFINER
-- functions that explicitly apply the caller-supplied location/radius.

drop policy if exists posts_public_read on public.posts;

create policy posts_public_read
on public.posts
for select
to public
using (
  (select auth.uid()) = author_id
  or (
    visibility = 'public'::public.visibility_scope
    and (
      community_id is null
      or exists (
        select 1
        from public.communities c
        where c.id = posts.community_id
          and (
            c.visibility = 'public'
            or c.created_by = (select auth.uid())
            or (select public.is_community_member(c.id, (select auth.uid())))
          )
      )
    )
  )
);

create or replace function public.nearby_feed_posts(
  latitude double precision,
  longitude double precision,
  radius_meters integer
)
returns table(
  id uuid,
  kind public.post_kind,
  category text,
  title text,
  body text,
  area text,
  trust_score numeric,
  created_at timestamptz,
  distance_label text,
  author_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  with user_point as (
    select extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography as point
  )
  select p.id,
         p.kind,
         p.category,
         p.title,
         p.body,
         p.area,
         p.trust_score,
         p.created_at,
         pg_catalog.concat(
           pg_catalog.round(extensions.st_distance(p.approximate_location, u.point)::numeric / 1000, 1),
           ' km'
         ) as distance_label,
         pg_catalog.coalesce(pr.display_name, 'Local neighbour') as author_name
  from public.posts p
  cross join user_point u
  left join public.profiles pr on pr.id = p.author_id
  where (select auth.uid()) is not null
    and p.approximate_location is not null
    and extensions.st_dwithin(
      p.approximate_location,
      u.point,
      pg_catalog.greatest(radius_meters, 500)
    )
    and (
      p.author_id = (select auth.uid())
      or (
        p.visibility in ('public'::public.visibility_scope, 'nearby'::public.visibility_scope)
        and (
          p.community_id is null
          or exists (
            select 1
            from public.communities c
            where c.id = p.community_id
              and (
                c.visibility = 'public'
                or c.created_by = (select auth.uid())
                or (select public.is_community_member(c.id, (select auth.uid())))
              )
          )
        )
      )
    )
  order by extensions.st_distance(p.approximate_location, u.point), p.created_at desc
  limit 50;
$$;

create or replace function public.nearby_feed_posts_page(
  latitude double precision,
  longitude double precision,
  radius_meters integer,
  cursor_created_at timestamptz default null,
  cursor_id uuid default null,
  page_size integer default 20
)
returns table(
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
security definer
set search_path = ''
as $$
  with user_point as (
    select extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography as point
  )
  select
    p.id,
    p.kind,
    p.category,
    p.title,
    p.body,
    p.area,
    p.trust_score,
    p.created_at,
    pg_catalog.concat(
      pg_catalog.round(extensions.st_distance(p.approximate_location, u.point)::numeric / 1000, 1),
      ' km'
    ),
    pg_catalog.coalesce(pr.display_name, 'Local neighbour'),
    (select pg_catalog.count(*) from public.reactions r where r.post_id = p.id),
    (select pg_catalog.count(*) from public.comments c where c.post_id = p.id)
  from public.posts p
  cross join user_point u
  left join public.profiles pr on pr.id = p.author_id
  where (select auth.uid()) is not null
    and p.approximate_location is not null
    and extensions.st_dwithin(
      p.approximate_location,
      u.point,
      pg_catalog.greatest(radius_meters, 500)
    )
    and (
      p.author_id = (select auth.uid())
      or (
        p.visibility in ('public'::public.visibility_scope, 'nearby'::public.visibility_scope)
        and (
          p.community_id is null
          or exists (
            select 1
            from public.communities c
            where c.id = p.community_id
              and (
                c.visibility = 'public'
                or c.created_by = (select auth.uid())
                or (select public.is_community_member(c.id, (select auth.uid())))
              )
          )
        )
      )
    )
    and (
      cursor_created_at is null
      or p.created_at < cursor_created_at
      or (p.created_at = cursor_created_at and p.id < cursor_id)
    )
  order by p.created_at desc, p.id desc
  limit pg_catalog.least(pg_catalog.greatest(page_size, 1), 50);
$$;

revoke execute on function public.nearby_feed_posts(double precision, double precision, integer) from public, anon;
grant execute on function public.nearby_feed_posts(double precision, double precision, integer) to authenticated;

revoke execute on function public.nearby_feed_posts_page(double precision, double precision, integer, timestamptz, uuid, integer) from public, anon;
grant execute on function public.nearby_feed_posts_page(double precision, double precision, integer, timestamptz, uuid, integer) to authenticated;

-- Private communities require membership; nearby discovery must not become a
-- side channel around community membership rules.
