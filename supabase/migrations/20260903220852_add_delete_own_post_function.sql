create or replace function public.delete_own_post(target_post_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.posts
  where id = target_post_id
    and author_id = (select auth.uid())
  returning 1 into deleted_count;

  return deleted_count = 1;
end;
$$;

grant execute on function public.delete_own_post(uuid) to authenticated;
