import type { Json } from './database.types';
import type { OrderItem, StoreId } from '../types';

/**
 * Order items are stored as JSON in `order_events` and read back through the
 * community activity view. Keep one tolerant parser for both paths so a
 * malformed row can never break the whole history page.
 */
export function parseOrderItems(value: Json): OrderItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const row = entry as Record<string, Json | undefined>;
    const productId = Number(row.productId);
    const quantity = Number(row.quantity);
    const price = Number(row.price);
    const storeId = String(row.storeId ?? '') as StoreId;
    if (!productId || !quantity || !storeId) return [];
    return [
      {
        productId,
        name: String(row.name ?? `Product ${productId}`),
        weight: row.weight ? String(row.weight) : undefined,
        quantity,
        storeId,
        price: Number.isFinite(price) ? price : 0,
      },
    ];
  });
}

export function countItems(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
