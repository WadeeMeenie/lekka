drop policy if exists "conversation participants can send messages" on public.direct_messages;
create policy "conversation participants can send accepted messages" on public.direct_messages
for insert to authenticated
with check (
  (select auth.uid()) = sender_id
  and exists (
    select 1 from public.direct_conversations c
    where c.id = direct_messages.conversation_id
      and c.request_status = 'accepted'
      and ((select auth.uid()) = c.user_a or (select auth.uid()) = c.user_b)
  )
);

do $$
begin
  if not exists (select 1 from pg_publication_rel pr join pg_class c on c.oid = pr.prrelid join pg_namespace n on n.oid = c.relnamespace join pg_publication p on p.oid = pr.prpubid where p.pubname = 'supabase_realtime' and n.nspname = 'public' and c.relname = 'reactions') then
    alter publication supabase_realtime add table public.reactions;
  end if;
  if not exists (select 1 from pg_publication_rel pr join pg_class c on c.oid = pr.prrelid join pg_namespace n on n.oid = c.relnamespace join pg_publication p on p.oid = pr.prpubid where p.pubname = 'supabase_realtime' and n.nspname = 'public' and c.relname = 'community_members') then
    alter publication supabase_realtime add table public.community_members;
  end if;
  if not exists (select 1 from pg_publication_rel pr join pg_class c on c.oid = pr.prrelid join pg_namespace n on n.oid = c.relnamespace join pg_publication p on p.oid = pr.prpubid where p.pubname = 'supabase_realtime' and n.nspname = 'public' and c.relname = 'direct_conversations') then
    alter publication supabase_realtime add table public.direct_conversations;
  end if;
end $$;
