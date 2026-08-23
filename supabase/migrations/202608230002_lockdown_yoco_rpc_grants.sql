revoke execute on function public.create_yoco_payment_order(uuid,text,uuid,integer,jsonb) from anon, public;
grant execute on function public.create_yoco_payment_order(uuid,text,uuid,integer,jsonb) to authenticated;

revoke execute on function public.attach_yoco_checkout(uuid,text) from anon, public;
grant execute on function public.attach_yoco_checkout(uuid,text) to authenticated;

revoke execute on function public.set_payment_order_status_from_yoco(text,text,text,jsonb) from anon, authenticated, public;
grant execute on function public.set_payment_order_status_from_yoco(text,text,text,jsonb) to service_role;
