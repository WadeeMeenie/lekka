create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  business_id uuid references public.businesses(id) on delete restrict,
  purpose text not null check (purpose in ('verification','boost')),
  reference_id uuid,
  amount_cents integer not null check (amount_cents >= 200),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled','refunded')),
  provider text not null default 'yoco' check (provider = 'yoco'),
  provider_checkout_id text unique,
  provider_payment_id text,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_orders_user_id_idx on public.payment_orders(user_id);
create index if not exists payment_orders_business_id_idx on public.payment_orders(business_id);
create index if not exists payment_orders_status_idx on public.payment_orders(status);
create index if not exists payment_orders_provider_checkout_id_idx on public.payment_orders(provider_checkout_id);

alter table public.payment_orders enable row level security;

create policy payment_orders_select_own
on public.payment_orders for select to authenticated
using (user_id = auth.uid() or exists (
  select 1 from public.business_members bm
  where bm.business_id = payment_orders.business_id
    and bm.user_id = auth.uid()
    and bm.role in ('owner','admin','manager')
));

create or replace function public.create_yoco_payment_order(
  p_business_id uuid,
  p_purpose text,
  p_reference_id uuid,
  p_amount_cents integer,
  p_metadata jsonb default '{}'::jsonb
) returns public.payment_orders
language plpgsql security definer set search_path = public
as $$
declare v_order public.payment_orders; v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_amount_cents < 200 then raise exception 'invalid_amount'; end if;
  if p_purpose not in ('verification','boost') then raise exception 'invalid_purpose'; end if;
  if p_business_id is not null and not exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id and bm.user_id = v_user and bm.role in ('owner','admin','manager')
  ) then raise exception 'not_business_manager'; end if;
  insert into public.payment_orders(user_id,business_id,purpose,reference_id,amount_cents,idempotency_key,metadata)
  values(v_user,p_business_id,p_purpose,p_reference_id,p_amount_cents,gen_random_uuid()::text,coalesce(p_metadata,'{}'::jsonb))
  returning * into v_order;
  return v_order;
end;
$$;

revoke all on function public.create_yoco_payment_order(uuid,text,uuid,integer,jsonb) from public;
grant execute on function public.create_yoco_payment_order(uuid,text,uuid,integer,jsonb) to authenticated;

create or replace function public.attach_yoco_checkout(p_order_id uuid, p_checkout_id text)
returns public.payment_orders
language plpgsql security definer set search_path = public
as $$
declare v_order public.payment_orders;
begin
  update public.payment_orders
  set provider_checkout_id = p_checkout_id, updated_at = now()
  where id = p_order_id and user_id = auth.uid() and status = 'pending'
  returning * into v_order;
  if v_order.id is null then raise exception 'payment_order_not_found'; end if;
  return v_order;
end;
$$;

revoke all on function public.attach_yoco_checkout(uuid,text) from public;
grant execute on function public.attach_yoco_checkout(uuid,text) to authenticated;

create or replace function public.set_payment_order_status_from_yoco(
  p_checkout_id text,
  p_status text,
  p_provider_payment_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_status not in ('paid','failed') then raise exception 'invalid_provider_status'; end if;
  update public.payment_orders
  set status = p_status,
      provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      metadata = metadata || coalesce(p_metadata,'{}'::jsonb),
      paid_at = case when p_status = 'paid' then coalesce(paid_at,now()) else paid_at end,
      updated_at = now()
  where provider_checkout_id = p_checkout_id;
end;
$$;

revoke all on function public.set_payment_order_status_from_yoco(text,text,text,jsonb) from public;
grant execute on function public.set_payment_order_status_from_yoco(text,text,text,jsonb) to service_role;

create table if not exists public.yoco_webhook_events (
  webhook_id text primary key,
  event_type text,
  received_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

alter table public.yoco_webhook_events enable row level security;
revoke all on public.yoco_webhook_events from anon, authenticated;
