-- ============================================================================
-- Tokri V2 — catalog, personal cart, orders, price history, watches, addresses
-- Run in Supabase → SQL Editor (or with `supabase db push`), once.
-- Idempotent where possible. Seed data lives in 0002_catalog_seed.sql.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- catalog --
create table if not exists public.stores (
  id text primary key,
  name text not null,
  delivery_minutes int not null,
  delivery_fee numeric(6,2) not null,
  free_above numeric(8,2) not null
);

create table if not exists public.products (
  id int primary key,
  name text not null,
  category text not null,
  weight text not null,
  mrp numeric(8,2) not null,
  barcode text,
  image_url text,
  image_credit_url text
);
alter table public.products add column if not exists unit_qty numeric(10,2);
alter table public.products add column if not exists unit text;

create table if not exists public.prices (
  product_id int references public.products(id) on delete cascade,
  store_id text references public.stores(id),
  price numeric(8,2) not null,
  in_stock boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (product_id, store_id)
);

alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.prices enable row level security;

drop policy if exists "read stores" on public.stores;
drop policy if exists "read products" on public.products;
drop policy if exists "read prices" on public.prices;
create policy "read stores" on public.stores for select using (true);
create policy "read products" on public.products for select using (true);
create policy "read prices" on public.prices for select using (true);
-- No write policies: prices change only through SECURITY DEFINER code or the dashboard.

-- ---------------------------------------------------------- personal cart --
create table if not exists public.personal_cart_items (
  user_id uuid not null references public.users(id) on delete cascade,
  product_id int not null references public.products(id),
  store_id text not null references public.stores(id),
  quantity int not null default 1 check (quantity > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
alter table public.personal_cart_items enable row level security;
drop policy if exists "own cart" on public.personal_cart_items;
create policy "own cart" on public.personal_cart_items
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------ orders + shipments --
alter table public.order_events enable row level security;
alter table public.order_events alter column community_id drop not null;
alter table public.order_events add column if not exists address_text text;
alter table public.order_events add column if not exists lat double precision;
alter table public.order_events add column if not exists lng double precision;

create table if not exists public.order_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.order_events(id) on delete cascade,
  store_id text not null references public.stores(id),
  eta_minutes int not null,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(6,2) not null default 0
);
create index if not exists order_shipments_order_idx on public.order_shipments (order_id);
alter table public.order_shipments enable row level security;

drop policy if exists "own shipments" on public.order_shipments;
create policy "own shipments" on public.order_shipments for select to authenticated
  using (exists (select 1 from public.order_events o where o.id = order_id and o.ordered_by = auth.uid()));

create or replace function public.is_community_member(p_community_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.community_members
    where community_id = p_community_id and user_id = p_user_id
  );
$$;

drop policy if exists "Members can record orders" on public.order_events;
drop policy if exists "place own order" on public.order_events;
create policy "place own order" on public.order_events for insert to authenticated
  with check (ordered_by = auth.uid()
    and (community_id is null or public.is_community_member(community_id, auth.uid())));

drop policy if exists "read own orders" on public.order_events;
create policy "read own orders" on public.order_events for select to authenticated
  using (ordered_by = auth.uid());

-- One atomic order: header + one shipment per store + cart rows removed.
create or replace function public.place_order(
  p_community_id uuid,
  p_items jsonb,
  p_amount numeric,
  p_address_text text,
  p_lat double precision,
  p_lng double precision
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_order uuid;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;
  if p_amount is null or p_amount < 0 then raise exception 'Invalid amount'; end if;
  if p_community_id is not null and not public.is_community_member(p_community_id, v_user) then
    raise exception 'Not a member of this community';
  end if;

  insert into public.order_events (community_id, ordered_by, items, amount, address_text, lat, lng)
  values (p_community_id, v_user, p_items, p_amount, p_address_text, p_lat, p_lng)
  returning id into v_order;

  with grouped as (
    select i->>'storeId' as store_id,
           sum((i->>'price')::numeric * (i->>'quantity')::int) as subtotal
    from jsonb_array_elements(p_items) i
    group by 1
  )
  insert into public.order_shipments (order_id, store_id, eta_minutes, subtotal, delivery_fee)
  select v_order, g.store_id, s.delivery_minutes, round(g.subtotal, 2),
         case when g.subtotal >= s.free_above then 0 else s.delivery_fee end
  from grouped g join public.stores s on s.id = g.store_id;

  if p_community_id is null then
    delete from public.personal_cart_items p
    where p.user_id = v_user
      and p.product_id in (select (i->>'productId')::int from jsonb_array_elements(p_items) i);
  else
    delete from public.shared_cart_items c
    where c.community_id = p_community_id
      and c.product_id in (select (i->>'productId')::int from jsonb_array_elements(p_items) i);
  end if;

  return v_order;
end;
$$;
revoke execute on function public.place_order(uuid, jsonb, numeric, text, double precision, double precision) from public;
grant execute on function public.place_order(uuid, jsonb, numeric, text, double precision, double precision) to authenticated;

create or replace function public.server_now() returns timestamptz
language sql stable as $$ select now(); $$;
grant execute on function public.server_now() to anon, authenticated;

-- Privacy: the feed intentionally carries no amount, address or coordinates.
drop view if exists public.community_activity_feed;
-- Deliberately a definer view: it exposes only the safe columns above, while
-- order_events itself keeps address, coordinates and amount owner-only.
create view public.community_activity_feed as
select id, community_id, ordered_by, items, created_at
from public.order_events
where community_id is not null
  and public.is_community_member(community_id, auth.uid());
grant select on public.community_activity_feed to authenticated;

-- ----------------------------------------------------------- price history --
create table if not exists public.price_snapshots (
  id bigint generated always as identity primary key,
  product_id int not null references public.products(id) on delete cascade,
  store_id text not null references public.stores(id),
  price numeric(8,2) not null,
  recorded_at timestamptz not null default now()
);
create index if not exists price_snapshots_lookup
  on public.price_snapshots (product_id, store_id, recorded_at desc);
alter table public.price_snapshots enable row level security;
drop policy if exists "read history" on public.price_snapshots;
create policy "read history" on public.price_snapshots for select using (true);

create table if not exists public.price_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id int not null references public.products(id) on delete cascade,
  store_id text references public.stores(id),
  target_price numeric(8,2) not null check (target_price > 0),
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.price_watches enable row level security;
drop policy if exists "own watches" on public.price_watches;
create policy "own watches" on public.price_watches
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 30 days of back-history, simulated. Clearly labelled "Simulated prices" in the UI.
do $$
begin
  if not exists (select 1 from public.price_snapshots limit 1) then
    insert into public.price_snapshots (product_id, store_id, price, recorded_at)
    select p.product_id, p.store_id,
           greatest(1, round(p.price * (1 + (random() - 0.5) * 0.12))),
           d
    from public.prices p,
         generate_series(now() - interval '30 days', now() - interval '1 day', interval '1 day') d;
  end if;
end $$;

create or replace function public.simulate_price_tick() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.prices p
  set price = least(m.mrp, greatest(1, round(p.price * (1 + (random() - 0.5) * 0.06)))),
      updated_at = now()
  from public.products m where m.id = p.product_id;

  insert into public.price_snapshots (product_id, store_id, price)
  select product_id, store_id, price from public.prices;
end $$;
revoke execute on function public.simulate_price_tick() from public;

-- Optional: schedule when pg_cron exists (verify it is available on your plan).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('tokri-price-tick', '0 3 * * *', 'select public.simulate_price_tick()');
  end if;
exception when others then
  raise notice 'pg_cron schedule skipped: %', sqlerrm;
end $$;

-- --------------------------------------------------------------- addresses --
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text not null default 'Home',
  line text not null,
  pincode text,
  lat double precision,
  lng double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.addresses enable row level security;
drop policy if exists "own addresses" on public.addresses;
create policy "own addresses" on public.addresses
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --------------------------------------------------------- shared cart shape --
-- The existing project already has this table. Create it for fresh projects and
-- normalise the price column so decimals survive the round trip.
create table if not exists public.shared_cart_items (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  product_id integer not null,
  product_name text not null,
  product_weight text,
  product_emoji text default '',
  selected_store text not null,
  selected_price numeric(8,2) not null,
  mrp numeric(8,2) not null default 0,
  qty integer not null default 1,
  added_by uuid not null references auth.users(id) on delete cascade,
  added_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shared_cart_items alter column selected_price type numeric(8,2) using selected_price::numeric;
alter table public.shared_cart_items alter column mrp type numeric(8,2) using mrp::numeric;
alter table public.shared_cart_items enable row level security;

drop policy if exists "Members can read shared cart" on public.shared_cart_items;
create policy "Members can read shared cart" on public.shared_cart_items for select to authenticated
  using (public.is_community_member(community_id, auth.uid()));

drop policy if exists "Members can add to shared cart" on public.shared_cart_items;
create policy "Members can add to shared cart" on public.shared_cart_items for insert to authenticated
  with check (added_by = auth.uid() and public.is_community_member(community_id, auth.uid()));

drop policy if exists "Users can update own shared cart items" on public.shared_cart_items;
create policy "Users can update own shared cart items" on public.shared_cart_items for update to authenticated
  using (added_by = auth.uid()) with check (added_by = auth.uid());

drop policy if exists "Users can delete shared cart items" on public.shared_cart_items;
create policy "Users can delete shared cart items" on public.shared_cart_items for delete to authenticated
  using (added_by = auth.uid() or exists (
    select 1 from public.communities c
    where c.id = community_id and c.leader_id = auth.uid()
  ));

-- ------------------------------------------------------------- account exit --
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  delete from public.users where id = v_user;
  delete from auth.users where id = v_user;
end;
$$;
revoke execute on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
