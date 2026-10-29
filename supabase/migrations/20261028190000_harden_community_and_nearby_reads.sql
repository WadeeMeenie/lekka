-- Forward-only production hardening; do not rewrite already-applied migration history.
-- Private communities are not self-joinable. Owners remain able to create/manage
-- their own membership; public communities retain the existing join experience.
drop policy if exists community_members_self_insert on public.community_members;
create policy community_members_self_insert
  on public.community_members
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      is_moderator = false
      or (select public.is_community_owner(community_id, (select auth.uid())))
    )
    and exists (
      select 1
      from public.communities c
      where c.id = community_id
        and (c.visibility = 'public' or c.created_by = (select auth.uid()))
    )
  );

-- The feed is already viewer-aware in the previous migration. Bound the radius
-- again at the database boundary so direct RPC calls cannot expand it arbitrarily.
create or replace function public.nearby_feed_posts_page(
  latitude double precision,
  longitude double precision,
  radius_meters integer,
  cursor_created_at timestamp with time zone default null,
  cursor_id uuid default null,
  page_size integer default 20
)
returns table(
  id uuid,
  author_id uuid,
  kind public.post_kind,
  category text,
  title text,
  body text,
  area text,
  trust_score numeric,
  created_at timestamp with time zone,
  distance_label text,
  author_name text,
  profile_image_path text,
  reaction_count bigint,
  comment_count bigint
)
language sql
stable
security definer
set search_path = ''
as $function$
  with user_point as (
    select public.st_setsrid(public.st_makepoint(longitude, latitude), 4326)::public.geography as point
    where latitude between -90 and 90 and longitude between -180 and 180
  )
  select
    p.id,
    p.author_id,
    p.kind,
    p.category,
    p.title,
    p.body,
    p.area,
    p.trust_score,
    p.created_at,
    pg_catalog.concat(pg_catalog.round(public.st_distance(p.approximate_location, u.point)::numeric / 1000, 1), ' km'),
    pg_catalog.coalesce(pr.display_name, 'Local neighbour'),
    case when not pr.is_private or public.can_view_full_profile((select auth.uid()), p.author_id) then pr.profile_image_path else null end,
    (select pg_catalog.count(*) from public.reactions r where r.post_id = p.id),
    (select pg_catalog.count(*) from public.comments c where c.post_id = p.id)
  from public.posts p
  cross join user_point u
  left join public.profiles pr on pr.id = p.author_id
  where (select auth.uid()) is not null
    and p.approximate_location is not null
    and public.st_dwithin(
      p.approximate_location,
      u.point,
      pg_catalog.least(pg_catalog.greatest(pg_catalog.coalesce(radius_meters, 5000), 500), 50000)
    )
    and (not public.is_profile_private(p.author_id) or public.can_view_full_profile((select auth.uid()), p.author_id))
    and not public.is_blocked_between((select auth.uid()), p.author_id)
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
$function$;
revoke all on function public.nearby_feed_posts_page(double precision, double precision, integer, timestamp with time zone, uuid, integer) from public, anon;
grant execute on function public.nearby_feed_posts_page(double precision, double precision, integer, timestamp with time zone, uuid, integer) to authenticated;

create or replace function public.nearby_feed_posts(
  latitude double precision,
  longitude double precision,
  radius_meters integer
)
returns table(
  id uuid,
  author_id uuid,
  kind public.post_kind,
  category text,
  title text,
  body text,
  area text,
  trust_score numeric,
  created_at timestamp with time zone,
  distance_label text,
  author_name text,
  profile_image_path text
)
language sql
stable
security definer
set search_path = ''
as $function$
  with user_point as (
    select public.st_setsrid(public.st_makepoint(longitude, latitude), 4326)::public.geography as point
    where latitude between -90 and 90 and longitude between -180 and 180
  )
  select
    p.id,
    p.author_id,
    p.kind,
    p.category,
    p.title,
    p.body,
    p.area,
    p.trust_score,
    p.created_at,
    pg_catalog.concat(pg_catalog.round(public.st_distance(p.approximate_location, u.point)::numeric / 1000, 1), ' km'),
    pg_catalog.coalesce(pr.display_name, 'Local neighbour'),
    case when not pr.is_private or public.can_view_full_profile((select auth.uid()), p.author_id) then pr.profile_image_path else null end
  from public.posts p
  cross join user_point u
  left join public.profiles pr on pr.id = p.author_id
  where (select auth.uid()) is not null
    and p.approximate_location is not null
    and public.st_dwithin(
      p.approximate_location,
      u.point,
      pg_catalog.least(pg_catalog.greatest(pg_catalog.coalesce(radius_meters, 5000), 500), 50000)
    )
    and (not public.is_profile_private(p.author_id) or public.can_view_full_profile((select auth.uid()), p.author_id))
    and not public.is_blocked_between((select auth.uid()), p.author_id)
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
  order by public.st_distance(p.approximate_location, u.point), p.created_at desc
  limit 50;
$function$;
revoke all on function public.nearby_feed_posts(double precision, double precision, integer) from public, anon;
grant execute on function public.nearby_feed_posts(double precision, double precision, integer) to authenticated;

-- Keep the callable authenticated detail RPC consistent with feed privacy and
-- block rules; SECURITY DEFINER functions must enforce these checks themselves.
create or replace function public.nearby_post_detail(
  target_post_id uuid,
  latitude double precision,
  longitude double precision,
  radius_meters integer default 5000
)
returns public.posts
language sql
stable
security definer
set search_path = ''
as $function$
  with user_point as (
    select public.st_setsrid(public.st_makepoint(longitude, latitude), 4326)::public.geography as point
    where latitude between -90 and 90 and longitude between -180 and 180
  )
  select p
  from public.posts p
  cross join user_point u
  where (select auth.uid()) is not null
    and p.id = target_post_id
    and p.approximate_location is not null
    and public.st_dwithin(
      p.approximate_location,
      u.point,
      pg_catalog.least(pg_catalog.greatest(pg_catalog.coalesce(radius_meters, 5000), 500), 50000)
    )
    and (not public.is_profile_private(p.author_id) or public.can_view_full_profile((select auth.uid()), p.author_id))
    and not public.is_blocked_between((select auth.uid()), p.author_id)
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
    );
$function$;

revoke execute on function public.nearby_post_detail(uuid, double precision, double precision, integer) from public, anon;
grant execute on function public.nearby_post_detail(uuid, double precision, double precision, integer) to authenticated;

-- Called only by authenticated Edge Functions using their verified user ID.
-- Since the helper is invoked by service_role, do not rely on auth.uid() here:
-- evaluate the target user's block and accepted-buddy relationships explicitly.
create or replace function public.can_access_nearby_post_media(
  target_user_id uuid,
  target_post_id uuid,
  latitude double precision,
  longitude double precision,
  radius_meters integer
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  with user_point as (
    select case
      when latitude between -90 and 90 and longitude between -180 and 180
      then public.st_setsrid(public.st_makepoint(longitude, latitude), 4326)::public.geography
      else null::public.geography
    end as point
  )
  select target_user_id is not null
    and target_post_id is not null
    and exists (
      select 1
      from public.posts p
      join public.profiles author on author.id = p.author_id
      cross join user_point u
      where p.id = target_post_id
        and p.approximate_location is not null
        and u.point is not null
        and public.st_dwithin(
          p.approximate_location,
          u.point,
          pg_catalog.least(pg_catalog.greatest(pg_catalog.coalesce(radius_meters, 5000), 500), 50000)
        )
        and not exists (
          select 1
          from public.blocks b
          where (b.blocker_id = target_user_id and b.blocked_id = p.author_id)
             or (b.blocker_id = p.author_id and b.blocked_id = target_user_id)
        )
        and (
          p.author_id = target_user_id
          or not author.is_private
          or exists (
            select 1
            from public.buddy_requests br
            where br.status = 'accepted'
              and (
                (br.sender_id = target_user_id and br.recipient_id = p.author_id)
                or (br.sender_id = p.author_id and br.recipient_id = target_user_id)
              )
          )
        )
        and (
          p.author_id = target_user_id
          or (
            p.visibility = 'nearby'::public.visibility_scope
            and (
              p.community_id is null
              or exists (
                select 1
                from public.communities c
                where c.id = p.community_id
                  and (
                    c.visibility = 'public'
                    or c.created_by = target_user_id
                    or exists (
                      select 1
                      from public.community_members cm
                      where cm.community_id = c.id
                        and cm.user_id = target_user_id
                    )
                  )
              )
            )
          )
        )
    );
$function$;

revoke execute on function public.can_access_nearby_post_media(uuid, uuid, double precision, double precision, integer) from public, anon, authenticated;
grant execute on function public.can_access_nearby_post_media(uuid, uuid, double precision, double precision, integer) to service_role;
