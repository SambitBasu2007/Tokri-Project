import { describe, expect, it } from 'vitest';
import type { CartItem, Product, Store } from '../types';
import { bestPrice, bestSplit, calculateTotals, groupByStore, unitPrice } from './pricing';

const stores: Store[] = [
  { id: 'blinkit', name: 'Blinkit', deliveryMinutes: 10, deliveryFee: 25, freeAbove: 199 },
  { id: 'zepto', name: 'Zepto', deliveryMinutes: 10, deliveryFee: 25, freeAbove: 199 },
];

function product(id: number, prices: Product['prices'], mrp = 200, unitQty: number | null = null, unit: string | null = null): Product {
  return {
    id,
    name: `Product ${id}`,
    category: 'dairy',
    weight: '1 kg',
    mrp,
    imageUrl: null,
    imageCreditUrl: null,
    barcode: null,
    unitQty,
    unit,
    prices,
  };
}

const products: Product[] = [
  product(1, { blinkit: { price: 100, inStock: true }, zepto: { price: 90, inStock: false } }),
  product(2, { blinkit: { price: 200, inStock: true }, zepto: { price: 100, inStock: true } }),
];

describe('bestPrice', () => {
  it('ignores out-of-stock and missing stores', () => {
    expect(bestPrice(products[0])).toEqual({ storeId: 'blinkit', price: 100 });
  });

  it('returns null when nothing is stocked', () => {
    expect(bestPrice(product(9, {}))).toBeNull();
  });
});

describe('unitPrice', () => {
  it('scales grams to a kilogram rate', () => {
    expect(unitPrice(product(1, {}, 200, 500, 'g'), 100)).toEqual({ value: 200, label: '₹/kg' });
  });

  it('returns null for piece counts', () => {
    expect(unitPrice(product(1, {}, 200, 12, 'pc'), 60)).toBeNull();
  });
});

describe('calculateTotals', () => {
  const items: CartItem[] = [{ productId: 1, storeId: 'blinkit', quantity: 3 }];

  it('applies coupons above the minimum', () => {
    const totals = calculateTotals(
      items,
      products,
      stores,
      { code: 'TOKRI10', minimum: 299, percent: 10, maxDiscount: 100 },
    );
    expect(totals.subtotal).toBe(300);
    expect(totals.discount).toBe(30);
    expect(totals.delivery).toBe(0);
    expect(totals.total).toBe(270);
    expect(totals.couponError).toBeNull();
  });

  it('explains why a coupon does not apply', () => {
    const totals = calculateTotals(
      items,
      products,
      stores,
      { code: 'SAVE50', minimum: 799, percent: 100, maxDiscount: 50 },
    );
    expect(totals.discount).toBe(0);
    expect(totals.couponError).toContain('Add 499 more');
  });

  it('charges delivery per store below its free threshold', () => {
    const totals = calculateTotals([{ productId: 2, storeId: 'zepto', quantity: 1 }], products, stores);
    expect(totals.delivery).toBe(25);
    expect(totals.total).toBe(125);
  });
});

describe('groupByStore', () => {
  it('groups lines and keeps store-specific prices', () => {
    const groups = groupByStore(
      [
        { productId: 1, storeId: 'blinkit', quantity: 1 },
        { productId: 2, storeId: 'zepto', quantity: 2 },
      ],
      products,
      stores,
    );
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.store.id === 'zepto')?.subtotal).toBe(200);
  });
});

describe('bestSplit', () => {
  it('splits across stores when fees still leave a cheaper basket', () => {
    const items: CartItem[] = [
      { productId: 1, storeId: 'blinkit', quantity: 1 },
      { productId: 2, storeId: 'blinkit', quantity: 1 },
    ];
    const plan = bestSplit(items, products, stores);
    expect(plan?.assignments).toHaveLength(2);
    expect(plan?.subtotal).toBe(200);
    expect(plan?.delivery).toBe(50);
    expect(plan?.total).toBe(250);
  });

  it('returns null for an empty basket', () => {
    expect(bestSplit([], products, stores)).toBeNull();
  });
});
