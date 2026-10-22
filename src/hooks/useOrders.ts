import { useCallback, useEffect, useState } from 'react';
import { supabase, isMissingRelation } from '../lib/supabase';
import { DELETED_ORDERS_KEY, DEMO_ORDERS_KEY } from '../lib/cart';
import { parseOrderItems } from '../lib/orders';
import { deliveryFeeFor, selectedPrice } from '../lib/pricing';
import type { Json } from '../lib/database.types';
import type { Address, CartItem, Order, OrderItem, Product, Shipment, Store, StoreId } from '../types';
import { useAuth } from '../state/AuthContext';
import { useCatalog } from '../state/CatalogContext';

export interface PlaceOrderInput {
  communityId: string | null;
  items: CartItem[];
  products: Product[];
  address: Address | null;
  /** Total charged, including delivery and after coupon. */
  amount?: number;
}

function readDeletedOrderIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_ORDERS_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeDeletedOrderIds(ids: Set<string>): void {
  try {
    localStorage.setItem(DELETED_ORDERS_KEY, JSON.stringify([...ids].slice(-200)));
  } catch {
    // Ignore storage failures.
  }
}

function readLocalOrders(): Order[] {
  const hidden = readDeletedOrderIds();
  try {
    const raw = localStorage.getItem(DEMO_ORDERS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as Order[]).filter((order) => order && !hidden.has(order.id))
      : [];
  } catch {
    return [];
  }
}

function writeLocalOrders(orders: Order[]): void {
  try {
    localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(orders.slice(0, 30)));
  } catch {
    // Ignore storage failures.
  }
}

function shipmentsFor(items: OrderItem[], stores: Store[]): Shipment[] {
  const byStore = new Map<StoreId, number>();
  for (const item of items) {
    byStore.set(item.storeId, (byStore.get(item.storeId) ?? 0) + item.price * item.quantity);
  }
  return [...byStore.entries()].flatMap(([storeId, subtotal]) => {
    const store = stores.find((entry) => entry.id === storeId);
    if (!store) return [];
    return [
      {
        id: `${storeId}-${subtotal}`,
        storeId,
        etaMinutes: store.deliveryMinutes,
        subtotal,
        deliveryFee: deliveryFeeFor(store, subtotal),
      },
    ];
  });
}

export function useOrders() {
  const { user } = useAuth();
  const { stores } = useCatalog();
  const [orders, setOrders] = useState<Order[]>(() => readLocalOrders());
  const [loading, setLoading] = useState(false);
  const [nowOffset, setNowOffset] = useState(0);

  const load = useCallback(async () => {
    const local = readLocalOrders();
    if (!user) {
      setOrders(local);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_events')
        .select('id, community_id, ordered_by, items, amount, created_at, address_text')
        .eq('ordered_by', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        if (!isMissingRelation(error)) console.warn('[Tokri] orders:', error.message);
        setOrders(local);
        return;
      }

      const hidden = readDeletedOrderIds();
      const rows = (data ?? []).filter((row) => !hidden.has(row.id));
      let shipments: {
        id: string;
        order_id: string;
        store_id: string;
        eta_minutes: number;
        subtotal: number;
        delivery_fee: number;
      }[] = [];
      if (rows.length) {
        const { data: shipmentRows, error: shipmentError } = await supabase
          .from('order_shipments')
          .select('id, order_id, store_id, eta_minutes, subtotal, delivery_fee')
          .in('order_id', rows.map((row) => row.id));
        if (!shipmentError) shipments = shipmentRows ?? [];
      }

      const mapped: Order[] = rows.map((row) => ({
        id: row.id,
        communityId: row.community_id,
        orderedBy: row.ordered_by,
        items: parseOrderItems(row.items),
        amount: Number(row.amount),
        addressText: row.address_text,
        createdAt: row.created_at,
        source: 'db',
        shipments: shipments
          .filter((shipment) => shipment.order_id === row.id)
          .map((shipment) => ({
            id: shipment.id,
            storeId: shipment.store_id as StoreId,
            etaMinutes: shipment.eta_minutes,
            subtotal: Number(shipment.subtotal),
            deliveryFee: Number(shipment.delivery_fee),
          })),
      }));

      const known = new Set(mapped.map((order) => order.id));
      setOrders([...mapped, ...local.filter((order) => !known.has(order.id))]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc('server_now')
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setNowOffset(new Date(data).getTime() - Date.now());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const placeOrder = useCallback(
    async (input: PlaceOrderInput): Promise<Order> => {
      if (!input.items.length) throw new Error('Your cart is empty.');

      const orderItems: OrderItem[] = input.items.flatMap((item) => {
        const product = input.products.find((entry) => entry.id === item.productId);
        if (!product) return [];
        const price = selectedPrice(product, item.storeId) ?? 0;
        return [
          {
            productId: product.id,
            name: product.name,
            weight: product.weight,
            quantity: item.quantity,
            storeId: item.storeId,
            price,
          },
        ];
      });

      const itemsSubtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const amount = input.amount ?? itemsSubtotal;
      const orderAddress = input.address?.line ?? null;

      if (user) {
        const { data, error } = await supabase.rpc('place_order', {
          p_community_id: input.communityId,
          p_items: orderItems as unknown as Json,
          p_amount: amount,
          p_address_text: orderAddress,
          p_lat: input.address?.lat ?? null,
          p_lng: input.address?.lng ?? null,
        });
        if (!error && data) {
          const order: Order = {
            id: data,
            communityId: input.communityId,
            orderedBy: user.id,
            items: orderItems,
            amount,
            addressText: orderAddress,
            createdAt: new Date(Date.now() + nowOffset).toISOString(),
            source: 'db',
            shipments: shipmentsFor(orderItems, stores),
          };
          await load();
          return order;
        }
        if (error) console.warn('[Tokri] place_order fell back to device order:', error.message);
      }

      const localOrder: Order = {
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `local-${Date.now()}`,
        communityId: input.communityId,
        orderedBy: user?.id ?? 'guest',
        items: orderItems,
        amount,
        addressText: orderAddress,
        createdAt: new Date(Date.now() + nowOffset).toISOString(),
        source: 'local',
        shipments: shipmentsFor(orderItems, stores),
      };
      const next = [localOrder, ...readLocalOrders()];
      writeLocalOrders(next);
      setOrders(next);
      return localOrder;
    },
    [user, stores, nowOffset, load],
  );

  const deleteOrder = useCallback(
    async (order: Order): Promise<{ removed: boolean; remote: boolean }> => {
      // Remove the row from this device immediately, then try the server. A
      // hidden-id list keeps a DB order from flashing back if RLS needs the
      // 0005 delete policy applied first.
      const hidden = readDeletedOrderIds();
      hidden.add(order.id);
      writeDeletedOrderIds(hidden);
      const local = readLocalOrders().filter((entry) => entry.id !== order.id);
      writeLocalOrders(local);
      setOrders((current) => current.filter((entry) => entry.id !== order.id));

      if (order.source === 'db' && user) {
        const { error } = await supabase
          .from('order_events')
          .delete()
          .eq('id', order.id)
          .eq('ordered_by', user.id);
        if (error) {
          if (!isMissingRelation(error)) console.warn('[Tokri] delete order:', error.message);
          return { removed: true, remote: false };
        }
      }
      return { removed: true, remote: true };
    },
    [user],
  );

  return { orders, loading, placeOrder, deleteOrder, refresh: load, nowOffset };
}
