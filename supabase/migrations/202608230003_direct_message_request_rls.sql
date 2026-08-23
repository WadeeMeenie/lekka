drop policy if exists "conversation recipient can accept request" on public.direct_conversations;
create policy "conversation recipient can accept request"
on public.direct_conversations
for update
to authenticated
using (
  (select auth.uid()) = case when requested_by = user_a then user_b else user_a end
  and request_status = 'pending'
)
with check (
  (select auth.uid()) = case when requested_by = user_a then user_b else user_a end
  and request_status in ('accepted','rejected')
);

drop policy if exists "conversation participants can send messages" on public.direct_messages;
create policy "conversation participants can send messages"
on public.direct_messages
for insert
to authenticated
with check (
  (select auth.uid()) = sender_id
  and exists (
    select 1 from public.direct_conversations c
    where c.id = conversation_id
      and (c.request_status = 'accepted' or c.requested_by = (select auth.uid()))
      and ((select auth.uid()) = c.user_a or (select auth.uid()) = c.user_b)
  )
);
