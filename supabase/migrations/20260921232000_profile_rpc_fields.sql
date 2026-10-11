-- Complete the viewer-aware profile RPC with the private fields the owner/buddy may see.
drop function if exists public.get_profile_for_viewer(uuid);

create or replace function public.get_profile_for_viewer(owner_id uuid)
returns table (
  id uuid,
  display_name text,
  username text,
  profile_image_path text,
  bio text,
  interests text[],
  home_area text,
  is_private boolean,
  friends_list_visibility text,
  can_view_full boolean,
  mutual_friend_count bigint
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p.id,
    p.display_name,
    p.username,
    p.profile_image_path,
    case
      when not p.is_private or public.can_view_full_profile(auth.uid(), p.id)
      then p.bio
      else null
    end,
    case
      when not p.is_private or public.can_view_full_profile(auth.uid(), p.id)
      then p.interests
      else '{}'::text[]
    end,
    case
      when not p.is_private or public.can_view_full_profile(auth.uid(), p.id)
      then p.home_area
      else null
    end,
    p.is_private,
    p.friends_list_visibility,
    (not p.is_private or public.can_view_full_profile(auth.uid(), p.id)),
    (
      select count(*)::bigint
      from public.buddy_requests br1
      join public.buddy_requests br2
        on br1.status = 'accepted'
       and br2.status = 'accepted'
      where br1.sender_id = auth.uid()
        and br1.recipient_id <> auth.uid()
        and br2.sender_id = p.id
        and br2.recipient_id = br1.recipient_id
    )
  from public.profiles p
  where auth.uid() is not null
    and (
      not p.is_private
      or public.can_view_full_profile(auth.uid(), p.id)
    );
$function$;

revoke all on function public.get_profile_for_viewer(uuid) from public, anon;
grant execute on function public.get_profile_for_viewer(uuid) to authenticated;
