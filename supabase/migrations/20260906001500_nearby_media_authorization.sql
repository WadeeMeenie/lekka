-- Nearby post media must use an explicit location-authorized server path.
-- Storage RLS cannot safely infer the caller's current coordinates from a request.

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
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = target_post_id
      and p.approximate_location is not null
      and public.st_dwithin(
        p.approximate_location,
        public.st_setsrid(public.st_makepoint(longitude, latitude), 4326)::public.geography,
        greatest(radius_meters, 500)
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
$$;

revoke execute on function public.can_access_nearby_post_media(uuid, uuid, double precision, double precision, integer) from public, anon, authenticated;
grant execute on function public.can_access_nearby_post_media(uuid, uuid, double precision, double precision, integer) to service_role;

drop policy if exists media_authenticated_read on storage.objects;
create policy media_authenticated_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'local-radar-media'
  and (
    owner_id = (select auth.uid()::text)
    or exists (
      select 1
      from public.post_media pm
      join public.posts p on p.id = pm.post_id
      where pm.storage_path = objects.name
        and p.visibility = 'public'
    )
    or exists (
      select 1
      from public.post_media pm
      join public.posts p on p.id = pm.post_id
      where pm.storage_path = objects.name
        and p.author_id = (select auth.uid())
    )
    or exists (
      select 1 from public.profiles profile where profile.profile_image_path = objects.name
    )
    or exists (
      select 1 from public.businesses business where business.logo_path = objects.name
    )
    or exists (
      select 1
      from public.communities community
      where (community.logo_path = objects.name or community.cover_path = objects.name)
        and (
          community.visibility = 'public'
          or community.created_by = (select auth.uid())
          or (select public.is_community_member(community.id, (select auth.uid())))
        )
    )
  )
);
