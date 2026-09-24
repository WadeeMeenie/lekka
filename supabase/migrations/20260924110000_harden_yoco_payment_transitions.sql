-- Keep provider-driven payment transitions server-only and monotonic.
create or replace function public.set_payment_order_status_from_yoco(
  p_checkout_id text,
  p_status text,
  p_provider_payment_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.payment_orders
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.payment_orders;
begin
  if p_status not in ('paid', 'failed', 'refunded') then
    raise exception 'invalid_provider_status';
  end if;

  update public.payment_orders
  set status = p_status,
      provider_payment_id = pg_catalog.coalesce(p_provider_payment_id, provider_payment_id),
      metadata = metadata || pg_catalog.coalesce(p_metadata, '{}'::jsonb),
      paid_at = case when p_status = 'paid' then pg_catalog.coalesce(paid_at, pg_catalog.now()) else paid_at end,
      updated_at = pg_catalog.now()
  where provider_checkout_id = p_checkout_id
    and (
      status = p_status
      or (status = 'pending' and p_status in ('paid', 'failed'))
      or (status = 'paid' and p_status = 'refunded')
    )
  returning * into v_order;

  if v_order.id is null then
    raise exception 'invalid_payment_transition';
  end if;

  return v_order;
end;
$function$;

revoke all on function public.set_payment_order_status_from_yoco(text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.set_payment_order_status_from_yoco(text,text,text,jsonb) to service_role;
