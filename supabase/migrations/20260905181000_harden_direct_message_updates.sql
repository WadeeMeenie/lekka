-- Restrict client updates to the exact columns each messaging flow needs.
-- RLS determines which rows a participant may touch; column privileges prevent
-- an otherwise-authorized UPDATE from rewriting conversation ownership or message content.

revoke update on table public.direct_conversations from authenticated;
grant update (request_status) on table public.direct_conversations to authenticated;

revoke update on table public.direct_messages from authenticated;
grant update (read_at) on table public.direct_messages to authenticated;

-- A sender must never be able to mark their own message as read.
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
