drop function if exists public.set_payment_order_status_from_yoco(text,text,text,jsonb);

create function public.set_payment_order_status_from_yoco(
  p_checkout_id text,
  p_status text,
  p_provider_payment_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns public.payment_orders
language plpgsql security definer set search_path = public
as $$
declare v_order public.payment_orders;
begin
  if p_status not in ('paid','failed','refunded') then raise exception 'invalid_provider_status'; end if;
  update public.payment_orders
  set status = p_status,
      provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      metadata = metadata || coalesce(p_metadata,'{}'::jsonb),
      paid_at = case when p_status = 'paid' then coalesce(paid_at,now()) else paid_at end,
      updated_at = now()
  where provider_checkout_id = p_checkout_id
  returning * into v_order;
  return v_order;
end;
$$;

revoke all on function public.set_payment_order_status_from_yoco(text,text,text,jsonb) from public;
grant execute on function public.set_payment_order_status_from_yoco(text,text,text,jsonb) to service_role;
