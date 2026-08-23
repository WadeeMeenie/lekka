-- Lekka social hardening: friend-request/message notifications and server-side rate limits.
-- Keeps the existing Facebook-like social model aligned with Lekka's local-first purpose.

create index if not exists direct_messages_created_sender_idx
  on public.direct_messages (sender_id, created_at desc);

-- Friend-request notifications.
create or replace function public.notify_buddy_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' then
    perform public.create_social_notification(
      new.recipient_id,
      new.sender_id,
      'friend_request',
      'New Buddy request',
      'Someone wants to connect with you on Lekka.',
      'profile',
      new.sender_id,
      concat('buddy-request:', new.id::text, ':', new.status)
    );
  elsif new.status = 'accepted' and old.status is distinct from 'accepted' then
    perform public.create_social_notification(
      new.sender_id,
      new.recipient_id,
      'friend_request',
      'Buddy request accepted',
      'Your Buddy request was accepted.',
      'profile',
      new.recipient_id,
      concat('buddy-accepted:', new.id::text)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists buddy_request_notification_trigger on public.buddy_requests;
create trigger buddy_request_notification_trigger
after insert or update of status on public.buddy_requests
for each row execute function public.notify_buddy_request();

-- Direct-message notifications. The recipient is derived from the conversation,
-- so clients cannot choose who receives the notification.
create or replace function public.notify_direct_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare recipient uuid;
begin
  select case when c.user_a = new.sender_id then c.user_b else c.user_a end
    into recipient
  from public.direct_conversations c
  where c.id = new.conversation_id;

  perform public.create_social_notification(
    recipient,
    new.sender_id,
    'message',
    'New message',
    'You have a new private message.',
    'conversation',
    new.conversation_id,
    concat('message:', new.id::text)
  );
  return new;
end;
$$;

drop trigger if exists direct_message_notification_trigger on public.direct_messages;
create trigger direct_message_notification_trigger
after insert on public.direct_messages
for each row execute function public.notify_direct_message();

-- Realtime notifications: RLS on notifications remains authoritative.
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- Simple server-side abuse controls. These apply regardless of which client is used.
create or replace function public.enforce_social_rate_limit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare recent_count integer;
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_table_name = 'posts' then
    select count(*) into recent_count
    from public.posts
    where author_id = auth.uid()
      and created_at > now() - interval '1 hour';
    if recent_count >= 30 then
      raise exception 'Post rate limit reached. Please try again later.';
    end if;
  elsif tg_table_name = 'direct_messages' then
    select count(*) into recent_count
    from public.direct_messages
    where sender_id = auth.uid()
      and created_at > now() - interval '1 hour';
    if recent_count >= 300 then
      raise exception 'Message rate limit reached. Please try again later.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists posts_social_rate_limit on public.posts;
create trigger posts_social_rate_limit
before insert on public.posts
for each row execute function public.enforce_social_rate_limit();

drop trigger if exists direct_messages_social_rate_limit on public.direct_messages;
create trigger direct_messages_social_rate_limit
before insert on public.direct_messages
for each row execute function public.enforce_social_rate_limit();

revoke all on function public.notify_buddy_request() from public;
revoke all on function public.notify_direct_message() from public;
revoke all on function public.enforce_social_rate_limit() from public;
