-- Ensure community posts inherit their required area from the selected community.
-- This is intentionally additive: posts.area remains NOT NULL.

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
