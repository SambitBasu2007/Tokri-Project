-- Let a signed-in shopper delete their own order history entry.
-- order_shipments has ON DELETE CASCADE, so the shipment rows go with it.
--
-- Apply after 0001_v2_schema.sql. The client removes the row from the device
-- immediately and keeps the ID hidden if this policy has not been applied yet.

drop policy if exists "delete own orders" on public.order_events;
create policy "delete own orders" on public.order_events
  for delete to authenticated
  using (ordered_by = auth.uid());
