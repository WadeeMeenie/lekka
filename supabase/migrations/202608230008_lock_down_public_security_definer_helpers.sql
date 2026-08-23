revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.is_community_member(uuid, uuid) from anon, authenticated;
revoke execute on function public.is_community_owner(uuid, uuid) from anon, authenticated;
revoke execute on function public.request_buddy(uuid) from anon;
revoke execute on function public.respond_to_buddy_request(uuid, text) from anon;
revoke execute on function public.remove_buddy(uuid) from anon;
