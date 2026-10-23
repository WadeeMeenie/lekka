-- Move profile-privacy metadata lookup out of the PostgREST-exposed public schema.
-- Keep all three authorization call sites in this same migration to avoid breaking
-- post reads or either nearby-feed RPC during rollout.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_profile_private(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce((select p.is_private from public.profiles p where p.id = owner_id), false);
$function$;

revoke all on function private.is_profile_private(uuid) from public, anon;
grant execute on function private.is_profile_private(uuid) to authenticated;

drop policy if exists posts_public_read on public.posts;
create policy posts_public_read
  on public.posts
  for select
  to authenticated
  using (
    author_id = (select auth.uid())
    or (
      visibility = 'public'
      and not public.is_blocked_between((select auth.uid()), author_id)
      and (
        not private.is_profile_private(author_id)
        or public.can_view_full_profile((select auth.uid()), author_id)
      )
      and (
        community_id is null
        or exists (
          select 1
          from public.communities c
          where c.id = posts.community_id
            and (
              c.visibility = 'public'
              or c.created_by = (select auth.uid())
              or public.is_community_member(c.id, (select auth.uid()))
            )
        )
      )
    )
  );

create or replace function public.nearby_feed_posts_page(
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
    coalesce(pr.display_name,'Local neighbour'),
    case when not pr.is_private or public.can_view_full_profile((select auth.uid()),p.author_id) then pr.profile_image_path else null end,
    (select count(*) from public.reactions r where r.post_id=p.id),
    (select count(*) from public.comments c where c.post_id=p.id)
  from public.posts p cross join user_point u left join public.profiles pr on pr.id=p.author_id
  where (select auth.uid()) is not null and p.approximate_location is not null
    and public.st_dwithin(p.approximate_location,u.point,greatest(radius_meters,500))
    and (not private.is_profile_private(p.author_id) or public.can_view_full_profile((select auth.uid()),p.author_id))
    and not public.is_blocked_between((select auth.uid()),p.author_id)
    and (p.author_id=(select auth.uid()) or (
      p.visibility in ('public'::public.visibility_scope,'nearby'::public.visibility_scope)
      and (p.community_id is null or exists (select 1 from public.communities c where c.id=p.community_id
        and (c.visibility='public' or c.created_by=(select auth.uid()) or (select public.is_community_member(c.id,(select auth.uid()))))))))
    and (cursor_created_at is null or p.created_at<cursor_created_at or (p.created_at=cursor_created_at and p.id<cursor_id))
  order by p.created_at desc,p.id desc limit least(greatest(page_size,1),50);
$function$;

create or replace function public.nearby_feed_posts(latitude double precision, longitude double precision, radius_meters integer)
returns table(id uuid, author_id uuid, kind public.post_kind, category text, title text, body text, area text,
  trust_score numeric, created_at timestamp with time zone, distance_label text, author_name text, profile_image_path text)
language sql stable security definer set search_path = ''
as $function$
  with user_point as (select public.st_setsrid(public.st_makepoint(longitude,latitude),4326)::public.geography as point)
  select p.id,p.author_id,p.kind,p.category,p.title,p.body,p.area,p.trust_score,p.created_at,
    concat(round(public.st_distance(p.approximate_location,u.point)::numeric/1000,1),' km'),
    coalesce(pr.display_name,'Local neighbour'),
    case when not pr.is_private or public.can_view_full_profile((select auth.uid()),p.author_id) then pr.profile_image_path else null end
  from public.posts p cross join user_point u left join public.profiles pr on pr.id=p.author_id
  where (select auth.uid()) is not null and p.approximate_location is not null
    and public.st_dwithin(p.approximate_location,u.point,greatest(radius_meters,500))
    and (not private.is_profile_private(p.author_id) or public.can_view_full_profile((select auth.uid()),p.author_id))
    and not public.is_blocked_between((select auth.uid()),p.author_id)
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


-- The detail RPC must enforce the same profile privacy and block boundary as
-- nearby feeds; otherwise a caller could bypass feed filtering with a known post ID.
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
  )
  select p
  from public.posts p
  cross join user_point u
  where (select auth.uid()) is not null
    and p.id = target_post_id
    and p.approximate_location is not null
    and public.st_dwithin(p.approximate_location, u.point, greatest(radius_meters, 500))
    and not public.is_blocked_between((select auth.uid()), p.author_id)
    and (
      p.author_id = (select auth.uid())
      or (
        p.visibility in ('public'::public.visibility_scope, 'nearby'::public.visibility_scope)
        and (
          not private.is_profile_private(p.author_id)
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
    );
$function$;

revoke all on function public.nearby_post_detail(uuid, double precision, double precision, integer) from public, anon;
grant execute on function public.nearby_post_detail(uuid, double precision, double precision, integer) to authenticated;

-- All direct helper dependencies have been replaced above. Remove the directly callable
-- public helper so the privacy flag cannot be queried as a standalone RPC.
drop function public.is_profile_private(uuid);
