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
  /** Difference against the naive "cheapest store for every item" plan. */
  saves: number;
}

function planTotal(assignments: { storeId: StoreId; items: CartLine[] }[], stores: Store[]): SplitPlan {
  let subtotal = 0;
  let delivery = 0;
  for (const assignment of assignments) {
    if (!assignment.items.length) continue;
    const store = stores.find((s) => s.id === assignment.storeId);
    const groupSubtotal = round2(
      assignment.items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    );
    subtotal += groupSubtotal;
    if (store) delivery += deliveryFeeFor(store, groupSubtotal);
  }
  return { assignments, subtotal: round2(subtotal), delivery: round2(delivery), total: round2(subtotal + delivery), saves: 0 };
}

/**
 * Compares the three honest basket strategies:
 * 1. every item at its cheapest store, 2. each store that stocks everything,
 * 3. all 15 store pairs with each item at the cheaper of the two.
 */
export function bestSplit(items: CartItem[], products: Product[], stores: Store[]): SplitPlan | null {
  if (!items.length) return null;
  const productById = new Map(products.map((p) => [p.id, p]));
  const lines = items
    .map((item) => {
      const product = productById.get(item.productId);
      if (!product) return null;
      return { product, quantity: item.quantity };
    })
    .filter((line): line is { product: Product; quantity: number } => line !== null);
  if (!lines.length) return null;

  const plans: SplitPlan[] = [];
  const makeAssignment = (productId: number, quantity: number, storeId: StoreId) => {
    const product = productById.get(productId);
    const price = product ? selectedPrice(product, storeId) : null;
    if (!product || price == null) return null;
    return { product, quantity, unitPrice: price, mrp: product.mrp } satisfies CartLine;
  };

  // 1. Cheapest per item.
  const cheapest = lines
    .map(({ product, quantity }) => {
      const best = bestPrice(product);
      if (!best) return null;
      return { storeId: best.storeId, line: makeAssignment(product.id, quantity, best.storeId) };
    })
    .filter((entry): entry is { storeId: StoreId; line: CartLine } => entry !== null && entry.line !== null);
  if (cheapest.length === lines.length) {
    const grouped = new Map<StoreId, CartLine[]>();
    for (const entry of cheapest) {
      const list = grouped.get(entry.storeId) ?? [];
      list.push(entry.line);
      grouped.set(entry.storeId, list);
    }
    plans.push(
      planTotal(
        [...grouped.entries()].map(([storeId, list]) => ({ storeId, items: list })),
        stores,
      ),
    );
  }

  // 2. Single store that stocks everything.
  for (const store of stores) {
    const assigned = lines
      .map(({ product, quantity }) => makeAssignment(product.id, quantity, store.id))
      .filter((line): line is CartLine => line !== null);
    if (assigned.length === lines.length) {
      plans.push(planTotal([{ storeId: store.id, items: assigned }], stores));
    }
  }

  // 3. Every pair of stores.
  if (stores.length > 1) {
    for (let i = 0; i < stores.length; i += 1) {
      for (let j = i + 1; j < stores.length; j += 1) {
        const a = stores[i];
        const b = stores[j];
        const groups: { storeId: StoreId; items: CartLine[] }[] = [
          { storeId: a.id, items: [] },
          { storeId: b.id, items: [] },
        ];
        let possible = true;
        for (const { product, quantity } of lines) {
          const priceA = selectedPrice(product, a.id);
          const priceB = selectedPrice(product, b.id);
          if (priceA == null && priceB == null) {
            possible = false;
            break;
          }
          const useA = priceA != null && (priceB == null || priceA < priceB);
          const storeId = useA ? a.id : b.id;
          const line = makeAssignment(product.id, quantity, storeId);
          if (!line) {
            possible = false;
            break;
          }
          groups.find((g) => g.storeId === storeId)?.items.push(line);
        }
        if (!possible) continue;
        plans.push(planTotal(groups.filter((g) => g.items.length > 0), stores));
      }
    }
  }

  if (!plans.length) return null;
  plans.sort((x, y) => x.total - y.total);
  const winner = plans[0];
  const baseline = plans.find((plan) => plan.assignments.length > 1) ?? plans[0];
  return { ...winner, saves: round2(Math.max(0, baseline.total - winner.total)) };
}
