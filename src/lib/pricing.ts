import type {
  CartItem,
  CartLine,
  Coupon,
  Product,
  Store,
  StoreGroup,
  StoreId,
  Totals,
} from '../types';
import { round2 } from './format';

export interface StorePrice {
  storeId: StoreId;
  price: number;
}

/** Prices the store actually sells, in stock, sorted cheapest first. */
export function availablePrices(product: Product): StorePrice[] {
  return (Object.entries(product.prices) as [StoreId, { price: number; inStock: boolean } | undefined][])
    .filter((entry): entry is [StoreId, { price: number; inStock: boolean }] => Boolean(entry[1]?.inStock))
    .map(([storeId, value]) => ({ storeId, price: value.price }))
    .sort((a, b) => a.price - b.price || a.storeId.localeCompare(b.storeId));
}

export function bestPrice(product: Product): StorePrice | null {
  const prices = availablePrices(product);
  return prices[0] ?? null;
}

export function selectedPrice(product: Product, storeId: StoreId): number | null {
  const entry = product.prices[storeId];
  if (!entry || !entry.inStock) return null;
  return entry.price;
}

export function isStocked(product: Product, storeId: StoreId): boolean {
  return Boolean(product.prices[storeId]?.inStock);
}

/** Unit price in ₹/kg or ₹/L. Piece-priced goods return null. */
export function unitPrice(product: Product, price: number): { value: number; label: string } | null {
  if (!product.unitQty || !product.unit) return null;
  if (product.unit === 'g' && product.unitQty >= 100) {
    return { value: round2(price / (product.unitQty / 1000)), label: '₹/kg' };
  }
  if (product.unit === 'ml') {
    return { value: round2(price / (product.unitQty / 1000)), label: '₹/L' };
  }
  return null;
}

export function deliveryFeeFor(store: Store, subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= store.freeAbove ? 0 : store.deliveryFee;
}

export function groupByStore(items: CartItem[], products: Product[], stores: Store[]): StoreGroup[] {
  const productById = new Map(products.map((p) => [p.id, p]));
  const groups = new Map<StoreId, CartLine[]>();

  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product) continue;
    const price = selectedPrice(product, item.storeId) ?? bestPrice(product)?.price;
    if (price == null) continue;
    const line: CartLine = { product, quantity: item.quantity, unitPrice: price, mrp: product.mrp };
    const existing = groups.get(item.storeId);
    if (existing) existing.push(line);
    else groups.set(item.storeId, [line]);
  }

  return [...groups.entries()]
    .map(([storeId, lines]) => {
      const store = stores.find((s) => s.id === storeId);
      if (!store) return null;
      const subtotal = round2(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
      const mrpTotal = round2(lines.reduce((sum, line) => sum + line.mrp * line.quantity, 0));
      return { store, lines, subtotal, mrpTotal, deliveryFee: deliveryFeeFor(store, subtotal) };
    })
    .filter((group): group is StoreGroup => group !== null)
    .sort((a, b) => a.store.name.localeCompare(b.store.name));
}

export const COUPONS: Coupon[] = [
  { code: 'TOKRI10', minimum: 299, percent: 10, maxDiscount: 100 },
  { code: 'SAVE50', minimum: 799, percent: 100, maxDiscount: 50 },
];

export function applyCoupon(subtotal: number, coupon: Coupon | null | undefined): { discount: number; error: string | null } {
  if (!coupon) return { discount: 0, error: null };
  if (subtotal < coupon.minimum) {
    return { discount: 0, error: `Add ${Math.ceil(coupon.minimum - subtotal)} more to use ${coupon.code}.` };
  }
  return { discount: round2(Math.min(coupon.maxDiscount, (subtotal * coupon.percent) / 100)), error: null };
}

export function calculateTotals(
  items: CartItem[],
  products: Product[],
  stores: Store[],
  coupon?: Coupon | null,
): Totals {
  const groups = groupByStore(items, products, stores);
  const subtotal = round2(groups.reduce((sum, group) => sum + group.subtotal, 0));
  const mrpTotal = round2(groups.reduce((sum, group) => sum + group.mrpTotal, 0));
  const delivery = round2(groups.reduce((sum, group) => sum + group.deliveryFee, 0));
  const { discount, error } = applyCoupon(subtotal, coupon);
  return {
    groups,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    mrpTotal,
    savings: round2(Math.max(0, mrpTotal - subtotal)),
    delivery,
    discount,
    total: round2(Math.max(0, subtotal + delivery - discount)),
    couponError: error,
  };
}

export interface SplitPlan {
  assignments: { storeId: StoreId; items: CartLine[] }[];
  subtotal: number;
  delivery: number;
  total: number;
  /** Last store to arrive when every store is ordered at the same time. */
  etaMinutes: number;
  storeCount: number;
  /** Internal ranking score: total + time and store-count penalties. */
  score: number;
  /** Difference against the lowest-priced plan, even if that plan is slower. */
  saves: number;
}

/** Time is worth something: ₹2/min stops a 60-min basket winning for tiny savings. */
const TIME_VALUE_PER_MINUTE = 2;
/** A second or third store should earn its extra trip. */
const EXTRA_STORE_PENALTY = 10;

function planTotal(
  assignments: { storeId: StoreId; items: CartLine[] }[],
  stores: Store[],
): SplitPlan {
  const used = assignments.filter((assignment) => assignment.items.length > 0);
  let subtotal = 0;
  let delivery = 0;
  let etaMinutes = 0;
  for (const assignment of used) {
    const store = stores.find((candidate) => candidate.id === assignment.storeId);
    const groupSubtotal = round2(
      assignment.items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    );
    subtotal += groupSubtotal;
    if (store) {
      delivery += deliveryFeeFor(store, groupSubtotal);
      etaMinutes = Math.max(etaMinutes, store.deliveryMinutes);
    }
  }
  return {
    assignments: used,
    subtotal: round2(subtotal),
    delivery: round2(delivery),
    total: round2(subtotal + delivery),
    etaMinutes,
    storeCount: used.length,
    score: 0,
    saves: 0,
  };
}

/**
 * Builds honest basket strategies: one store, every pair/triple of stores,
 * and the absolute cheapest store per item. Each candidate is ranked by
 * price plus a delivery-time penalty and a small extra-store penalty, so the
 * recommendation is not allowed to buy a 60-minute basket for a few rupees.
 */
export function bestSplit(items: CartItem[], products: Product[], stores: Store[]): SplitPlan | null {
  if (!items.length) return null;
  const productById = new Map(products.map((product) => [product.id, product]));
  const lines = items
    .map((item) => {
      const product = productById.get(item.productId);
      if (!product) return null;
      return { product, quantity: item.quantity };
    })
    .filter((line): line is { product: Product; quantity: number } => line !== null);
  if (!lines.length || !stores.length) return null;

  const plans = new Map<string, SplitPlan>();
  const makeAssignment = (productId: number, quantity: number, storeId: StoreId) => {
    const product = productById.get(productId);
    const price = product ? selectedPrice(product, storeId) : null;
    if (!product || price == null) return null;
    return { product, quantity, unitPrice: price, mrp: product.mrp } satisfies CartLine;
  };
  const addPlan = (assignments: { storeId: StoreId; items: CartLine[] }[]) => {
    const plan = planTotal(assignments, stores);
    if (!plan.assignments.length) return;
    const signature = plan.assignments
      .map((assignment) => {
        const ids = assignment.items
          .map((line) => line.product.id)
          .sort((a, b) => a - b)
          .join(',');
        return `${assignment.storeId}:${ids}`;
      })
      .sort()
      .join('|');
    if (!plans.has(signature)) plans.set(signature, plan);
  };

  // 1. Absolute cheapest store for every item. This is allowed to use many
  // stores, but the score below makes it pay for the extra trips and time.
  const cheapestGroups = new Map<StoreId, CartLine[]>();
  let cheapestPossible = true;
  for (const { product, quantity } of lines) {
    const best = bestPrice(product);
    const line = best ? makeAssignment(product.id, quantity, best.storeId) : null;
    if (!best || !line) {
      cheapestPossible = false;
      break;
    }
    const list = cheapestGroups.get(best.storeId) ?? [];
    list.push(line);
    cheapestGroups.set(best.storeId, list);
  }
  if (cheapestPossible) {
    addPlan([...cheapestGroups.entries()].map(([storeId, list]) => ({ storeId, items: list })));
  }

  // 2. Every one-, two-, and three-store combination. Within a combination
  // each item goes to the cheapest store in that combination.
  const maxSubsetSize = Math.min(3, stores.length);
  for (let mask = 1; mask < (1 << stores.length); mask += 1) {
    const subset = stores.filter((_, index) => mask & (1 << index));
    if (subset.length > maxSubsetSize) continue;
    const groups = new Map<StoreId, CartLine[]>();
    let possible = true;
    for (const { product, quantity } of lines) {
      let bestStore: Store | null = null;
      let bestStorePrice = Number.POSITIVE_INFINITY;
      for (const store of subset) {
        const price = selectedPrice(product, store.id);
        if (price != null && price < bestStorePrice) {
          bestStore = store;
          bestStorePrice = price;
        }
      }
      if (!bestStore) {
        possible = false;
        break;
      }
      const line = makeAssignment(product.id, quantity, bestStore.id);
      if (!line) {
        possible = false;
        break;
      }
      const list = groups.get(bestStore.id) ?? [];
      list.push(line);
      groups.set(bestStore.id, list);
    }
    if (possible) {
      addPlan([...groups.entries()].map(([storeId, list]) => ({ storeId, items: list })));
    }
  }

  if (!plans.size) return null;
  const candidates = [...plans.values()];
  const fastestEta = Math.min(...candidates.map((plan) => plan.etaMinutes));
  for (const plan of candidates) {
    plan.score = round2(
      plan.total +
        Math.max(0, plan.etaMinutes - fastestEta) * TIME_VALUE_PER_MINUTE +
        Math.max(0, plan.storeCount - 1) * EXTRA_STORE_PENALTY,
    );
  }
  candidates.sort(
    (a, b) =>
      a.score - b.score ||
      a.total - b.total ||
      a.storeCount - b.storeCount ||
      a.etaMinutes - b.etaMinutes,
  );
  const winner = candidates[0];
  const cheapestTotal = Math.min(...candidates.map((plan) => plan.total));
  return { ...winner, saves: round2(Math.max(0, cheapestTotal - winner.total)) };
}
