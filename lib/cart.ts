import type { ActiveCart, CartItem, StoreId } from '../types';
import { STORE_IDS } from '../types';

export const CART_KEY = 'tokri_cart_v2';
export const ACTIVE_CART_KEY = 'tokri_active_cart_v2';
/** Per-product store choice, independent of whether the product is in the cart. */
export const STORE_PICKS_KEY = 'tokri_store_picks';
/** Which account the local mirror belongs to; absent means a guest cart. */
export const CART_OWNER_KEY = 'tokri_cart_owner_v1';
export const DEMO_ORDERS_KEY = 'tokri_demo_orders_v1';
/** IDs hidden on this device, so a deleted DB order does not flash back. */
export const DELETED_ORDERS_KEY = 'tokri_deleted_orders_v1';
export const ADDRESSES_KEY = 'tokri_addresses_v1';
export const WATCHES_KEY = 'tokri_watches_v1';
export const ADDRESS_CACHE_KEY = 'tokri_geocode_cache_v1';

/** Matches the database check constraint for cart quantities. */
export const MAX_QUANTITY = 20;

/**
 * One product, one line. Older shared-cart rows could contain the same product
 * twice (one per member); merge them and keep the quantity honest.
 */
export function normalizeCartItems(items: CartItem[]): CartItem[] {
  const byProduct = new Map<number, CartItem>();
  for (const item of items) {
    if (!Number.isFinite(item.productId) || !Number.isFinite(item.quantity) || item.quantity <= 0) {
      continue;
    }
    const existing = byProduct.get(item.productId);
    if (!existing) {
      byProduct.set(item.productId, {
        ...item,
        quantity: Math.min(MAX_QUANTITY, Math.max(1, Math.round(item.quantity))),
      });
      continue;
    }
    byProduct.set(item.productId, {
      ...existing,
      quantity: Math.min(MAX_QUANTITY, existing.quantity + Math.round(item.quantity)),
    });
  }
  return [...byProduct.values()];
}

/** Adds a product, or raises the quantity of the single existing line. */
export function addCartLine(items: CartItem[], productId: number, storeId: StoreId, quantity = 1): CartItem[] {
  const amount = Math.max(1, Math.round(quantity));
  const existing = items.find((item) => item.productId === productId);
  if (!existing) {
    return [...items, { productId, storeId, quantity: Math.min(MAX_QUANTITY, amount) }];
  }
  return items.map((item) =>
    item.productId === productId
      ? {
          ...item,
          storeId,
          quantity: Math.min(MAX_QUANTITY, item.quantity + amount),
        }
      : item,
  );
}

/** Changes quantity on the single line; 0 or less removes it. Caps at 20. */
export function setCartLineQty(items: CartItem[], productId: number, quantity: number): CartItem[] {
  const nextQuantity = Math.min(MAX_QUANTITY, Math.round(quantity));
  if (nextQuantity <= 0) return items.filter((item) => item.productId !== productId);
  return items.map((item) => (item.productId === productId ? { ...item, quantity: nextQuantity } : item));
}

/** Moves the existing line to another store without changing its quantity. */
export function selectCartLineStore(items: CartItem[], productId: number, storeId: StoreId): CartItem[] {
  if (!items.some((item) => item.productId === productId)) return items;
  return items.map((item) => (item.productId === productId ? { ...item, storeId } : item));
}

export function readStorePicks(): Record<number, StoreId> {
  try {
    const raw = localStorage.getItem(STORE_PICKS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const picks: Record<number, StoreId> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const productId = Number(key);
      if (!Number.isInteger(productId) || productId <= 0) continue;
      if (typeof value === 'string' && STORE_IDS.includes(value as StoreId)) {
        picks[productId] = value as StoreId;
      }
    }
    return picks;
  } catch {
    return {};
  }
}

export function writeStorePicks(picks: Record<number, StoreId>): void {
  try {
    localStorage.setItem(STORE_PICKS_KEY, JSON.stringify(picks));
  } catch {
    // Ignore storage failures.
  }
}

/**
 * Sign-in merge rule: same product keeps the larger quantity, so a cart built
 * while signed out is never silently reduced by the server copy.
 */
export function mergeCartItems(local: CartItem[], remote: CartItem[]): CartItem[] {
  const merged = new Map<number, CartItem>();
  for (const item of [...remote, ...local]) {
    const existing = merged.get(item.productId);
    if (!existing) {
      merged.set(item.productId, { ...item, quantity: Math.max(1, item.quantity) });
      continue;
    }
    merged.set(item.productId, {
      ...existing,
      quantity: Math.max(existing.quantity, item.quantity),
    });
  }
  return [...merged.values()];
}

export function readLocalCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is CartItem =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as CartItem).productId === 'number' &&
          typeof (item as CartItem).storeId === 'string' &&
          typeof (item as CartItem).quantity === 'number' &&
          (item as CartItem).quantity > 0,
      )
      .map((item) => ({ productId: item.productId, storeId: item.storeId, quantity: item.quantity }));
  } catch {
    return [];
  }
}

export function writeLocalCart(items: CartItem[]): void {
  try {
    const payload = JSON.stringify(
      [...items]
        .sort((a, b) => a.productId - b.productId)
        .map(({ productId, storeId, quantity }) => ({ productId, storeId, quantity })),
    );
    // Avoid writing an identical value: that would broadcast a storage event
    // to other tabs (and could ping-pong them into refetching forever).
    if (localStorage.getItem(CART_KEY) === payload) return;
    localStorage.setItem(CART_KEY, payload);
  } catch {
    // Private browsing or a full quota: the in-memory cart still works.
  }
}

export function readActiveCart(): ActiveCart {
  try {
    const raw = localStorage.getItem(ACTIVE_CART_KEY);
    if (!raw) return { type: 'personal' };
    const parsed = JSON.parse(raw) as ActiveCart;
    if (parsed?.type === 'community' && typeof parsed.communityId === 'string') return parsed;
    return { type: 'personal' };
  } catch {
    return { type: 'personal' };
  }
}

export function writeActiveCart(active: ActiveCart): void {
  try {
    localStorage.setItem(ACTIVE_CART_KEY, JSON.stringify(active));
  } catch {
    // Ignore storage failures.
  }
}
