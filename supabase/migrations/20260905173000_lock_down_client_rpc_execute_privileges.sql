-- Restrict RPC execution to the roles that can legitimately invoke each operation.
-- RLS protects rows, but function EXECUTE is a separate Data API boundary.

revoke execute on function public.set_payment_order_status_from_yoco(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.set_payment_order_status_from_yoco(text, text, text, jsonb) to service_role;

revoke execute on function public.prevent_business_verification_tampering() from public, anon, authenticated;
revoke execute on function public.is_business_manager(uuid, uuid) from public, anon;
grant execute on function public.is_business_manager(uuid, uuid) to authenticated;

revoke execute on function public.get_or_create_direct_conversation(uuid) from public, anon;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

revoke execute on function public.create_community_post(uuid, uuid, text, text) from public, anon;
grant execute on function public.create_community_post(uuid, uuid, text, text) to authenticated;

revoke execute on function public.delete_own_post(uuid) from public, anon;
grant execute on function public.delete_own_post(uuid) to authenticated;

revoke execute on function public.toggle_follow(uuid) from public, anon;
grant execute on function public.toggle_follow(uuid) to authenticated;

revoke execute on function public.toggle_reaction(uuid) from public, anon;
grant execute on function public.toggle_reaction(uuid) to authenticated;
revoke execute on function public.toggle_reaction(uuid, text) from public, anon;
grant execute on function public.toggle_reaction(uuid, text) to authenticated;

revoke execute on function public.toggle_saved_post(uuid) from public, anon;
grant execute on function public.toggle_saved_post(uuid) to authenticated;
