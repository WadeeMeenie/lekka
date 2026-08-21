-- Lekka Social Core V1: notification metadata and server-generated social events.
-- This migration deliberately keeps existing ownership policies intact.

alter table public.notifications
  add column if not exists actor_id uuid references public.profiles(id) on delete set null,
  add column if not exists target_type text,
  add column if not exists target_id uuid,
  add column if not exists dedupe_key text;

create index if not exists notifications_recipient_idx
  on public.notifications (user_id, created_at desc);

create unique index if not exists notifications_dedupe_key_idx
  on public.notifications (dedupe_key)
  where dedupe_key is not null;

create or replace function public.create_social_notification(
  recipient_id uuid,
  actor uuid,
  notification_kind text,
  notification_title text,
  notification_body text,
  target_kind text,
  target uuid,
  dedupe text
)
returns void
language plpgsql
security definer
set search_path = public
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

create or replace function public.notify_new_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_social_notification(
    new.following_id,
    new.follower_id,
    'follow',
    'New follower',
    'Someone started following you.',
    'profile',
    new.follower_id,
    concat('follow:', new.follower_id::text, ':', new.following_id::text)
  );
  return new;
end;
$$;

drop trigger if exists follows_notification_trigger on public.follows;
create trigger follows_notification_trigger
after insert on public.follows
for each row execute function public.notify_new_follow();

create or replace function public.notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
begin
  select p.author_id into recipient from public.posts p where p.id = new.post_id;
  perform public.create_social_notification(
    recipient,
    new.author_id,
    'comment',
    'New comment',
    'Someone commented on your post.',
    'post',
    new.post_id,
    concat('comment:', new.id::text)
  );
  return new;
end;
$$;

drop trigger if exists comments_notification_trigger on public.comments;
create trigger comments_notification_trigger
after insert on public.comments
for each row execute function public.notify_new_comment();

create or replace function public.notify_new_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
begin
  select p.author_id into recipient from public.posts p where p.id = new.post_id;
  perform public.create_social_notification(
    recipient,
    new.user_id,
    'reaction',
    'New reaction',
    'Someone reacted to your post.',
    'post',
    new.post_id,
    concat('reaction:', new.post_id::text, ':', new.user_id::text)
  );
  return new;
end;
$$;

drop trigger if exists reactions_notification_trigger on public.reactions;
create trigger reactions_notification_trigger
after insert on public.reactions
for each row execute function public.notify_new_reaction();

revoke all on function public.create_social_notification(uuid, uuid, text, text, text, text, uuid, text) from public;
revoke all on function public.notify_new_follow() from public;
revoke all on function public.notify_new_comment() from public;
revoke all on function public.notify_new_reaction() from public;
