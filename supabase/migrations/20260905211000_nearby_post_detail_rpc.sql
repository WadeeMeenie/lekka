-- Preserve post-detail access for nearby posts without reopening the posts table.
-- The function applies the same location and community authorization boundary
-- as the nearby feed RPCs and is intentionally authenticated-only.

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
as $$
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
$$;

revoke execute on function public.nearby_post_detail(uuid, double precision, double precision, integer) from public, anon;
grant execute on function public.nearby_post_detail(uuid, double precision, double precision, integer) to authenticated;
