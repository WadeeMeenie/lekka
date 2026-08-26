-- Community posts inherit the required area from their community.
create or replace function public.create_community_post(
  p_community_id uuid,
  p_author_id uuid,
  p_body text,
  p_title text default null
)
returns public.posts
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_area text;
  v_post public.posts;
begin
  if auth.uid() is null or auth.uid() <> p_author_id then
    raise exception 'Not authorized to create this post';
  end if;

  select area into v_area
  from public.communities
  where id = p_community_id;

  if v_area is null then
    raise exception 'Community not found or has no area';
  end if;

  insert into public.posts (author_id, title, body, area, community_id)
  values (p_author_id, p_title, p_body, v_area, p_community_id)
  returning * into v_post;

  return v_post;
end;
$$;
