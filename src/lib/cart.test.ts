import { describe, expect, it } from 'vitest';
import {
  MAX_QUANTITY,
  addCartLine,
  mergeCartItems,
  normalizeCartItems,
  selectCartLineStore,
  setCartLineQty,
} from './cart';

describe('mergeCartItems', () => {
  it('keeps the larger quantity for the same product', () => {
    const merged = mergeCartItems(
      [{ productId: 1, storeId: 'blinkit', quantity: 3 }],
      [{ productId: 1, storeId: 'zepto', quantity: 2 }],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].quantity).toBe(3);
  });

  it('keeps products present in either cart', () => {
    const merged = mergeCartItems(
      [{ productId: 1, storeId: 'blinkit', quantity: 1 }],
      [
        { productId: 2, storeId: 'zepto', quantity: 4 },
        { productId: 3, storeId: 'jiomart', quantity: 1 },
      ],
    );
    expect(merged.map((item) => item.productId).sort()).toEqual([1, 2, 3]);
    expect(merged.find((item) => item.productId === 2)?.quantity).toBe(4);
  });

  it('never produces a zero quantity', () => {
    const merged = mergeCartItems([], [{ productId: 1, storeId: 'blinkit', quantity: 0 }]);
    expect(merged[0].quantity).toBe(1);
  });
});

describe('one product, one cart line', () => {
  it('adding the same product twice gives quantity 2, not two lines', () => {
    let items = addCartLine([], 1, 'blinkit');
    items = addCartLine(items, 1, 'blinkit');
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it('two rapid taps on + do not create duplicate rows', () => {
    let items = addCartLine([], 7, 'zepto');
    items = addCartLine(items, 7, 'zepto');
    items = addCartLine(items, 7, 'zepto');
    expect(items.filter((item) => item.productId === 7)).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it('selectStore on an in-cart product keeps the quantity and creates no second line', () => {
    const before = [{ productId: 1, storeId: 'blinkit' as const, quantity: 3 }];
    const after = selectCartLineStore(before, 1, 'zepto');
    expect(after).toHaveLength(1);
    expect(after[0].storeId).toBe('zepto');
    expect(after[0].quantity).toBe(3);
  });

  it('selectStore on a product not in the cart changes only the selection', () => {
    const before = [{ productId: 1, storeId: 'blinkit' as const, quantity: 2 }];
    const after = selectCartLineStore(before, 99, 'zepto');
    expect(after).toBe(before);
  });

  it('caps quantity at 20 and removes the line at 0', () => {
    const items = [{ productId: 1, storeId: 'blinkit' as const, quantity: 5 }];
    expect(setCartLineQty(items, 1, 99)[0].quantity).toBe(MAX_QUANTITY);
    expect(setCartLineQty(items, 1, 0)).toHaveLength(0);
  });

  it('merges legacy duplicate rows into one line', () => {
    const merged = normalizeCartItems([
      { productId: 1, storeId: 'blinkit', quantity: 2, rowId: 'a' },
      { productId: 1, storeId: 'zepto', quantity: 3, rowId: 'b' },
      { productId: 2, storeId: 'swiggy', quantity: 1 },
    ]);
    expect(merged).toHaveLength(2);
    expect(merged.find((item) => item.productId === 1)?.quantity).toBe(5);
  });
});
