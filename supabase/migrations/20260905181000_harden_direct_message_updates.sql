-- Lock down direct conversation and message updates to their intended state transitions.
-- RLS determines which rows a participant may touch; these triggers enforce which
-- columns may actually change after a row is selected for update.

create or replace function public.enforce_direct_conversation_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_a is distinct from old.user_a
     or new.user_b is distinct from old.user_b
     or new.requested_by is distinct from old.requested_by then
    raise exception 'Conversation participants and requester are immutable';
  end if;

  if old.request_status <> 'pending' then
    raise exception 'Conversation request is no longer pending';
  end if;

  if new.request_status not in ('accepted', 'rejected') then
    raise exception 'Invalid conversation request status';
  end if;

  if (select auth.uid()) is null
     or (select auth.uid()) <> case
       when old.requested_by = old.user_a then old.user_b
       else old.user_a
     end then
    raise exception 'Only the conversation recipient can respond to a request';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_direct_conversation_update() from public, anon, authenticated;

drop trigger if exists enforce_direct_conversation_update on public.direct_conversations;
create trigger enforce_direct_conversation_update
before update on public.direct_conversations
for each row execute function public.enforce_direct_conversation_update();

create or replace function public.enforce_direct_message_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.conversation_id is distinct from old.conversation_id
     or new.sender_id is distinct from old.sender_id
     or new.body is distinct from old.body
     or new.created_at is distinct from old.created_at then
    raise exception 'Message content and ownership are immutable';
  end if;

  if (select auth.uid()) is null or (select auth.uid()) = old.sender_id then
    raise exception 'Only the message recipient can update read status';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_direct_message_update() from public, anon, authenticated;

drop trigger if exists enforce_direct_message_update on public.direct_messages;
create trigger enforce_direct_message_update
before update on public.direct_messages
for each row execute function public.enforce_direct_message_update();

-- A sender must never be able to mark their own message as read, and the
-- resulting row must remain a message in the same conversation owned by the
-- original sender.
drop policy if exists "message recipients can mark read" on public.direct_messages;
create policy "message recipients can mark read"
on public.direct_messages
for update
to authenticated
using (
  is_conversation_member(conversation_id)
  and (select auth.uid()) <> sender_id
)
with check (
  is_conversation_member(conversation_id)
  and (select auth.uid()) <> sender_id
);
