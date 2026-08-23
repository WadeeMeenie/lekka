-- Atomic social interaction mutations.
-- These functions serialize concurrent toggles for the same user/target pair so
-- rapid taps and multi-device requests cannot both observe the same pre-state.

create or replace function public.toggle_reaction(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_exists boolean;
begin
  if v_user_id is null then
    raise exception 'Please sign in' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and (
        p.visibility = 'public'
        or p.author_id = v_user_id
        or (p.visibility = 'nearby' and v_user_id is not null)
      )
  ) then
    raise exception 'Post is not available';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':reaction:' || p_post_id::text, 0));

  select exists (
    select 1 from public.reactions
    where post_id = p_post_id and user_id = v_user_id
  ) into v_exists;

  if v_exists then
    delete from public.reactions
    where post_id = p_post_id and user_id = v_user_id;
    return false;
  end if;

  insert into public.reactions(post_id, user_id, reaction)
  values (p_post_id, v_user_id, 'like');
  return true;
end;
$$;

grant execute on function public.toggle_reaction(uuid) to authenticated;

create or replace function public.toggle_saved_post(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_exists boolean;
begin
  if v_user_id is null then
    raise exception 'Please sign in' using errcode = '42501';
  end if;

  if not exists (select 1 from public.posts where id = p_post_id) then
    raise exception 'Post is not available';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':save:' || p_post_id::text, 0));

  select exists (
    select 1 from public.saved_posts
    where post_id = p_post_id and user_id = v_user_id
  ) into v_exists;

  if v_exists then
    delete from public.saved_posts
    where post_id = p_post_id and user_id = v_user_id;
    return false;
  end if;

  insert into public.saved_posts(post_id, user_id)
  values (p_post_id, v_user_id);
  return true;
end;
$$;

grant execute on function public.toggle_saved_post(uuid) to authenticated;

create or replace function public.toggle_follow(p_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_exists boolean;
begin
  if v_user_id is null then
    raise exception 'Please sign in' using errcode = '42501';
  end if;
  if v_user_id = p_profile_id then
    raise exception 'You cannot follow yourself';
  end if;
  if not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'Profile is not available';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':follow:' || p_profile_id::text, 0));

  select exists (
    select 1 from public.follows
    where follower_id = v_user_id and following_id = p_profile_id
  ) into v_exists;

  if v_exists then
    delete from public.follows
    where follower_id = v_user_id and following_id = p_profile_id;
    return false;
  end if;

  insert into public.follows(follower_id, following_id)
  values (v_user_id, p_profile_id);
  return true;
end;
$$;

grant execute on function public.toggle_follow(uuid) to authenticated;

comment on function public.toggle_reaction(uuid) is 'Atomically toggles a like reaction for the authenticated user.';
comment on function public.toggle_saved_post(uuid) is 'Atomically toggles a saved post for the authenticated user.';
comment on function public.toggle_follow(uuid) is 'Atomically toggles a follow relationship for the authenticated user.';
