-- Social Core V1 security hardening: notification functions are trigger-only.
revoke execute on function public.create_social_notification(uuid, uuid, text, text, text, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.notify_new_follow() from public, anon, authenticated;
revoke execute on function public.notify_new_comment() from public, anon, authenticated;
revoke execute on function public.notify_new_reaction() from public, anon, authenticated;
