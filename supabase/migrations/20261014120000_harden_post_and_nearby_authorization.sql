-- Follow-up authorization repair for the current schema.
-- Apply only after the migration replay review has been validated on an isolated
-- database. This file is deliberately not applied to production by CI.
--
-- A post with both a business_id and community_id must satisfy BOTH membership
-- boundaries. PostgreSQL permissive policies combine with OR, so keep one
-- canonical INSERT policy rather than two independently permissive policies.

drop policy if exists posts_author_write on public.posts;
drop policy if exists "community members can create community posts" on public.posts;

create policy posts_author_write
on public.posts
for insert
to authenticated
with check (
  (select auth.uid()) = author_id
  and (
    business_id is null
    or exists (
      select 1
      from public.business_members bm
      where bm.business_id = posts.business_id
        and bm.user_id = (select auth.uid())
        and bm.role in ('owner', 'admin', 'manager')
    )
  )
  and (
    community_id is null
    or exists (
      select 1
      from public.community_members cm
      where cm.community_id = posts.community_id
        and cm.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.communities c
      where c.id = posts.community_id
        and c.created_by = (select auth.uid())
    )
  )
);

-- The mobile client does not call nearby_post_detail; its return type is the
-- entire posts row, including approximate_location. Revoke this unused RPC
-- rather than keep an alternate location-scoped path that returns private
-- columns and omits block/private-profile checks. Post detail is read through
-- the posts RLS policy instead.
revoke execute on function public.nearby_post_detail(uuid, double precision, double precision, integer)
  from public, anon, authenticated;

comment on function public.nearby_post_detail(uuid, double precision, double precision, integer)
  is 'Disabled for client roles: returns the full posts row including location. Use RLS-protected post detail reads.';

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
    and latitude between -90 and 90
    and longitude between -180 and 180
    and p.approximate_location is not null
    and extensions.st_dwithin(
      p.approximate_location,
      u.point,
      pg_catalog.least(pg_catalog.greatest(radius_meters, 500), 50000)
    )
    and (
      p.author_id = (select auth.uid())
      or (
        p.visibility in ('public'::public.visibility_scope, 'nearby'::public.visibility_scope)
        and not public.is_blocked_between((select auth.uid()), p.author_id)
        and (
          not public.is_profile_private(p.author_id)
          or public.can_view_full_profile((select auth.uid()), p.author_id)
        )
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
    and latitude between -90 and 90
    and longitude between -180 and 180
    and p.approximate_location is not null
    and extensions.st_dwithin(
      p.approximate_location,
      u.point,
      pg_catalog.least(pg_catalog.greatest(radius_meters, 500), 50000)
    )
    and (
      p.author_id = (select auth.uid())
      or (
        p.visibility in ('public'::public.visibility_scope, 'nearby'::public.visibility_scope)
        and not public.is_blocked_between((select auth.uid()), p.author_id)
        and (
          not public.is_profile_private(p.author_id)
          or public.can_view_full_profile((select auth.uid()), p.author_id)
        )
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

-- Fail closed if these critical routines are accidentally made public again.
revoke execute on function public.nearby_post_detail(uuid, double precision, double precision, integer) from public, anon, authenticated;
