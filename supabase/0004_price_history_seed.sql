-- ============================================================================
-- Tokri V2 — generate 30 days of demo price history after the catalog seed.
--
-- 0001 contains a similar block, but on a fresh database it runs before 0002
-- has inserted any prices, so it has nothing to copy. This file runs after the
-- catalog seed and is idempotent: if snapshots already exist it does nothing.
-- ============================================================================

do $$
begin
  if exists (select 1 from public.price_snapshots limit 1) then
    return;
  end if;

  insert into public.price_snapshots (product_id, store_id, price, recorded_at)
  select
    p.product_id,
    p.store_id,
    greatest(1, round(p.price * (1 + (random() - 0.5) * 0.12))),
    d
  from public.prices p
  cross join generate_series(
    now() - interval '30 days',
    now() - interval '1 day',
    interval '1 day'
  ) as d;
end $$;
