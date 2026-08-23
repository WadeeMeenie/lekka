create or replace function public.toggle_reaction(p_post_id uuid, p_reaction text default '👍') returns text language plpgsql security invoker set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_existing text;
begin
  if v_user_id is null then raise exception 'Please sign in' using errcode = '42501'; end if;
  if not exists (select 1 from public.posts p where p.id = p_post_id and (p.visibility = 'public' or p.author_id = v_user_id or (p.visibility = 'nearby' and v_user_id is not null))) then raise exception 'Post is not available'; end if;
  if p_reaction not in ('👍','❤️','😂','😮','😢','😡') then raise exception 'Unsupported reaction'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':reaction:' || p_post_id::text, 0));
  select reaction into v_existing from public.reactions where post_id = p_post_id and user_id = v_user_id;
  if v_existing = p_reaction then
    delete from public.reactions where post_id = p_post_id and user_id = v_user_id;
    return null;
  end if;
  insert into public.reactions(post_id, user_id, reaction) values (p_post_id, v_user_id, p_reaction)
  on conflict (post_id, user_id) do update set reaction = excluded.reaction;
  return p_reaction;
end;
$$;
grant execute on function public.toggle_reaction(uuid, text) to authenticated;
