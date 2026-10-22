-- V14 — one product, one cart line in a shared cart.
-- Run after 0001_v2_schema.sql and 0002_catalog_seed.sql.
--
-- Personal carts are already keyed by (user_id, product_id). Shared carts used
-- to allow one row per member per product, so first collapse those duplicates,
-- then enforce the same rule with a unique index.

-- 1) Keep the earliest row per (community, product), summing quantities.
with ranked as (
  select
    id,
    row_number() over (
      partition by community_id, product_id
      order by created_at, id
    ) as rn,
    sum(qty) over (partition by community_id, product_id) as total_qty
  from public.shared_cart_items
)
update public.shared_cart_items item
set qty = greatest(1, least(20, ranked.total_qty))
from ranked
where item.id = ranked.id
  and ranked.rn = 1;

-- 2) Drop the now-redundant duplicate rows.
with ranked as (
  select
    id,
    row_number() over (
      partition by community_id, product_id
      order by created_at, id
    ) as rn
  from public.shared_cart_items
)
delete from public.shared_cart_items item
using ranked
where item.id = ranked.id
  and ranked.rn > 1;

-- 3) Enforce one line per product. The client upserts with
--    onConflict: 'community_id,product_id', which needs this index.
create unique index if not exists shared_cart_one_line
  on public.shared_cart_items (community_id, product_id);

-- 4) The line is shared, so any member may adjust its quantity, store or
--    remove it. added_by stays as an audit field for who added it first.
drop policy if exists "Users can update own shared cart items" on public.shared_cart_items;
drop policy if exists "Members can update shared cart" on public.shared_cart_items;
create policy "Members can update shared cart" on public.shared_cart_items
  for update to authenticated
  using (public.is_community_member(community_id, auth.uid()))
  with check (public.is_community_member(community_id, auth.uid()));

drop policy if exists "Users can delete shared cart items" on public.shared_cart_items;
drop policy if exists "Members can delete shared cart" on public.shared_cart_items;
create policy "Members can delete shared cart" on public.shared_cart_items
  for delete to authenticated
  using (public.is_community_member(community_id, auth.uid()));
