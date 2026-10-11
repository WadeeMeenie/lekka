-- Restore only the SECURITY DEFINER helpers that existing RLS and Storage
-- policies require, while making caller-supplied user IDs self-scoped.
-- Revoking EXECUTE from a helper used in a policy causes the policy itself to
-- fail with 42501 before its row predicate can be evaluated.

create or replace function public.is_community_member(target_community uuid, target_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null
     and target_user = auth.uid()
     and exists (
       select 1 from public.community_members cm
       where cm.community_id = target_community
         and cm.user_id = auth.uid()
     );
$$;

create or replace function public.is_community_owner(target_community uuid, target_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null
     and target_user = auth.uid()
     and exists (
       select 1 from public.communities c
       where c.id = target_community
         and c.created_by = auth.uid()
     );
$$;

create or replace function public.is_business_manager(target_business_id uuid, target_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null
     and target_user = auth.uid()
     and exists (
       select 1 from public.business_members bm
       where bm.business_id = target_business_id
         and bm.user_id = auth.uid()
         and bm.role = any(array['owner','admin','manager'])
     );
$$;

create or replace function public.can_manage_business(target_business uuid, target_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null
     and target_user = auth.uid()
     and exists (
       select 1 from public.business_members bm
       where bm.business_id = target_business
         and bm.user_id = auth.uid()
         and bm.role in ('owner','admin','manager')
     );
$$;

create or replace function public.is_blocked_between(viewer uuid, subject uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null
     and viewer = auth.uid()
     and exists (
       select 1 from public.blocks b
       where (b.blocker_id = auth.uid() and b.blocked_id = subject)
          or (b.blocker_id = subject and b.blocked_id = auth.uid())
     );
$$;

create or replace function public.can_view_full_profile(viewer_id uuid, owner_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null
     and viewer_id = auth.uid()
     and owner_id is not null
     and not public.is_blocked_between(auth.uid(), owner_id)
     and (
       owner_id = auth.uid()
       or exists (
         select 1 from public.buddy_requests br
         where br.status = 'accepted'
           and (
             (br.sender_id = auth.uid() and br.recipient_id = owner_id)
             or (br.sender_id = owner_id and br.recipient_id = auth.uid())
           )
       )
     );
$$;

-- RLS policies and Storage object policies invoke these helpers as the caller.
-- Their bodies now reject cross-account probes; never grant them to PUBLIC.
revoke execute on function public.is_community_member(uuid, uuid) from public;
revoke execute on function public.is_community_owner(uuid, uuid) from public;
revoke execute on function public.is_business_manager(uuid, uuid) from public;
revoke execute on function public.can_manage_business(uuid, uuid) from public;
revoke execute on function public.is_blocked_between(uuid, uuid) from public;
revoke execute on function public.can_view_full_profile(uuid, uuid) from public;
revoke execute on function public.is_profile_private(uuid) from public;

grant execute on function public.is_community_member(uuid, uuid) to anon, authenticated;
grant execute on function public.is_community_owner(uuid, uuid) to anon, authenticated;
grant execute on function public.is_business_manager(uuid, uuid) to authenticated;
grant execute on function public.can_manage_business(uuid, uuid) to authenticated;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.can_view_full_profile(uuid, uuid) to authenticated;
grant execute on function public.is_profile_private(uuid) to authenticated;

-- Profile media cannot be written through direct table UPDATE privileges.
-- Keep profile_image_path behind an authenticated, owner-scoped RPC.
create or replace function public.update_my_profile_avatar(p_profile_image_path text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_path text := pg_catalog.btrim(coalesce(p_profile_image_path, ''));
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if pg_catalog.char_length(v_path) > 255
     or v_path !~ ('^' || v_user_id::text || '/profile/avatar-[0-9]+\.jpg$')
     or v_path like '%..%' then
    raise exception 'invalid profile avatar path' using errcode = '22023';
  end if;

  update public.profiles
  set profile_image_path = v_path,
      updated_at = pg_catalog.now()
  where id = v_user_id;

  if not found then
    raise exception 'profile not found';
  end if;
  return v_path;
end;
$$;

revoke all on function public.update_my_profile_avatar(text) from public, anon, authenticated;
grant execute on function public.update_my_profile_avatar(text) to authenticated;

-- Community creation and owner membership must succeed or fail together.
create or replace function public.create_community(
  p_name text,
  p_description text,
  p_area text,
  p_category text,
  p_visibility text default 'public',
  p_rules text[] default '{}'::text[]
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_community_id uuid;
  v_name text := pg_catalog.btrim(coalesce(p_name, ''));
  v_description text := pg_catalog.btrim(coalesce(p_description, ''));
  v_area text := pg_catalog.btrim(coalesce(p_area, ''));
  v_rules text[] := coalesce(p_rules, '{}'::text[]);
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if pg_catalog.char_length(v_name) < 3 or pg_catalog.char_length(v_name) > 80 then
    raise exception 'Community name must be between 3 and 80 characters' using errcode = '22023';
  end if;
  if pg_catalog.char_length(v_description) > 500 then
    raise exception 'Description must be 500 characters or fewer' using errcode = '22023';
  end if;
  if pg_catalog.char_length(v_area) = 0 then
    raise exception 'Choose an area for your community' using errcode = '22023';
  end if;
  if p_visibility not in ('public', 'private') then
    raise exception 'Invalid community visibility' using errcode = '22023';
  end if;
  if pg_catalog.cardinality(v_rules) > 12
     or exists (
       select 1 from pg_catalog.unnest(v_rules) as rule
       where pg_catalog.char_length(pg_catalog.btrim(rule)) > 200
     ) then
    raise exception 'Communities may have up to 12 guidelines, each 200 characters or fewer' using errcode = '22023';
  end if;

  insert into public.communities(name, description, area, category, visibility, rules, created_by)
  values (v_name, v_description, v_area, pg_catalog.btrim(coalesce(p_category, 'General')), p_visibility,
          coalesce((select pg_catalog.array_agg(pg_catalog.btrim(rule)) from pg_catalog.unnest(v_rules) as rule where pg_catalog.btrim(rule) <> ''), '{}'::text[]),
          v_user_id)
  returning id into v_community_id;

  insert into public.community_members(community_id, user_id, is_moderator)
  values (v_community_id, v_user_id, true)
  on conflict (community_id, user_id) do update set is_moderator = true;

  return v_community_id;
end;
$$;

revoke all on function public.create_community(text, text, text, text, text, text[]) from public, anon;
grant execute on function public.create_community(text, text, text, text, text, text[]) to authenticated;
