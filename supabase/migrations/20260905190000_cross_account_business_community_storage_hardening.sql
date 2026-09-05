-- Continue the cross-account authorization audit across community membership and Storage.
-- Also pin the remaining application-owned SECURITY DEFINER functions to an empty search_path.

create or replace function public.create_social_notification(
  recipient_id uuid, actor uuid, notification_kind text, notification_title text,
  notification_body text, target_kind text, target uuid, dedupe text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if recipient_id is null or actor is null or recipient_id = actor then
    return;
  end if;
  insert into public.notifications (user_id, actor_id, kind, title, body, target_type, target_id, dedupe_key)
  values (recipient_id, actor, notification_kind, notification_title, notification_body, target_kind, target, dedupe)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    pg_catalog.coalesce(new.raw_user_meta_data->>'display_name', ''),
    pg_catalog.nullif(new.raw_user_meta_data->>'username', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.is_community_member(target_community uuid, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_members cm
    where cm.community_id = target_community
      and cm.user_id = target_user
  );
$$;

create or replace function public.is_community_owner(target_community uuid, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.communities c
    where c.id = target_community
      and c.created_by = target_user
  );
$$;

create or replace function public.notify_buddy_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pending' then
    perform public.create_social_notification(
      new.recipient_id, new.sender_id, 'friend_request', 'New Buddy request',
      'Someone wants to connect with you on Lekka.', 'profile', new.sender_id,
      pg_catalog.concat('buddy-request:', new.id::text, ':', new.status)
    );
  elsif new.status = 'accepted' and old.status is distinct from 'accepted' then
    perform public.create_social_notification(
      new.sender_id, new.recipient_id, 'friend_request', 'Buddy request accepted',
      'Your Buddy request was accepted.', 'profile', new.recipient_id,
      pg_catalog.concat('buddy-accepted:', new.id::text)
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_direct_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  select case when c.user_a = new.sender_id then c.user_b else c.user_a end
    into recipient
    from public.direct_conversations c
    where c.id = new.conversation_id;

  perform public.create_social_notification(
    recipient, new.sender_id, 'message', 'New message',
    'You have a new private message.', 'conversation', new.conversation_id,
    pg_catalog.concat('message:', new.id::text)
  );
  return new;
end;
$$;

create or replace function public.notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  select p.author_id into recipient
    from public.posts p
    where p.id = new.post_id;

  perform public.create_social_notification(
    recipient, new.author_id, 'comment', 'New comment',
    'Someone commented on your post.', 'post', new.post_id,
    pg_catalog.concat('comment:', new.id::text)
  );
  return new;
end;
$$;

create or replace function public.notify_new_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.create_social_notification(
    new.following_id, new.follower_id, 'follow', 'New follower',
    'Someone started following you.', 'profile', new.follower_id,
    pg_catalog.concat('follow:', new.follower_id::text, ':', new.following_id::text)
  );
  return new;
end;
$$;

create or replace function public.notify_new_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  select p.author_id into recipient
    from public.posts p
    where p.id = new.post_id;

  perform public.create_social_notification(
    recipient, new.user_id, 'reaction', 'New reaction',
    'Someone reacted to your post.', 'post', new.post_id,
    pg_catalog.concat('reaction:', new.post_id::text, ':', new.user_id::text)
  );
  return new;
end;
$$;

create or replace function public.remove_buddy(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Please sign in';
  end if;
  update public.buddy_requests
  set status = 'cancelled', updated_at = pg_catalog.now()
  where status in ('pending', 'accepted')
    and ((sender_id = auth.uid() and recipient_id = p_profile_id)
      or (sender_id = p_profile_id and recipient_id = auth.uid()));
end;
$$;

create or replace function public.request_buddy(p_recipient_id uuid)
returns public.buddy_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.buddy_requests;
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  if auth.uid() = p_recipient_id then raise exception 'You cannot add yourself as a Buddy'; end if;

  select * into result
    from public.buddy_requests
    where sender_id = auth.uid() and recipient_id = p_recipient_id;
  if found then
    if result.status = 'cancelled' or result.status = 'declined' then
      update public.buddy_requests
      set status = 'pending', updated_at = pg_catalog.now()
      where id = result.id
      returning * into result;
    end if;
    return result;
  end if;

  select * into result
    from public.buddy_requests
    where sender_id = p_recipient_id and recipient_id = auth.uid();
  if found and result.status = 'pending' then
    update public.buddy_requests
    set status = 'accepted', updated_at = pg_catalog.now()
    where id = result.id
    returning * into result;
    return result;
  end if;
  if found and result.status = 'accepted' then
    return result;
  end if;

  insert into public.buddy_requests (sender_id, recipient_id)
  values (auth.uid(), p_recipient_id)
  returning * into result;
  return result;
end;
$$;

create or replace function public.respond_to_buddy_request(p_request_id uuid, p_status text)
returns public.buddy_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.buddy_requests;
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  if p_status not in ('accepted', 'declined') then raise exception 'Invalid Buddy response'; end if;

  update public.buddy_requests
  set status = p_status, updated_at = pg_catalog.now()
  where id = p_request_id
    and recipient_id = auth.uid()
    and status = 'pending'
  returning * into result;

  if not found then raise exception 'Buddy request is unavailable'; end if;
  return result;
end;
$$;

create or replace function public.set_payment_order_status_from_yoco(
  p_checkout_id text,
  p_status text,
  p_provider_payment_id text default null,
  p_metadata jsonb default '{}'
)
returns public.payment_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.payment_orders;
begin
  if p_status not in ('paid', 'failed', 'refunded') then
    raise exception 'invalid_provider_status';
  end if;

  update public.payment_orders
  set status = p_status,
      provider_payment_id = pg_catalog.coalesce(p_provider_payment_id, provider_payment_id),
      metadata = metadata || pg_catalog.coalesce(p_metadata, '{}'::jsonb),
      paid_at = case when p_status = 'paid' then pg_catalog.coalesce(paid_at, pg_catalog.now()) else paid_at end,
      updated_at = pg_catalog.now()
  where provider_checkout_id = p_checkout_id
  returning * into v_order;
  return v_order;
end;
$$;

-- Private communities must not leak their complete membership graph to unrelated users.
-- Public communities retain their existing public member-list UX.
drop policy if exists community_members_read on public.community_members;
create policy community_members_read
on public.community_members
for select
to public
using (
  exists (
    select 1
    from public.communities c
    where c.id = community_members.community_id
      and c.visibility = 'public'
  )
  or community_members.user_id = (select auth.uid())
  or (select public.is_community_owner(community_members.community_id, (select auth.uid())))
  or (select public.is_community_member(community_members.community_id, (select auth.uid())))
);

-- Community branding is stored in the private media bucket. Permit reads only when
-- the corresponding community is public, owned by the caller, or the caller is a member.
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
        and (
          p.visibility = 'public'
          or p.author_id = (select auth.uid())
          or p.visibility = 'nearby'
        )
    )
    or exists (
      select 1 from public.profiles profile where profile.profile_image_path = objects.name
    )
    or exists (
      select 1
      from public.businesses business
      where business.logo_path = objects.name
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
