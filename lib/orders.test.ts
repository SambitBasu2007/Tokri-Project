import { describe, expect, it } from 'vitest';
import { countItems, parseOrderItems } from './orders';

describe('parseOrderItems', () => {
  it('keeps valid rows and normalizes numbers', () => {
    const items = parseOrderItems([
      {
        productId: 4,
        name: 'Shimla Apples',
        weight: '1 kg',
        quantity: 2,
        storeId: 'blinkit',
        price: 165,
      },
    ]);

    expect(items).toEqual([
      {
        productId: 4,
        name: 'Shimla Apples',
        weight: '1 kg',
        quantity: 2,
        storeId: 'blinkit',
        price: 165,
      },
    ]);
  });

  it('drops malformed entries instead of throwing', () => {
    const items = parseOrderItems([
      null,
      'nope',
      { productId: 0, quantity: 1, storeId: 'zepto' },
      { productId: 2, quantity: 0, storeId: 'zepto' },
      { productId: 3, quantity: 1, storeId: '' },
      { productId: 4, quantity: 1, storeId: 'zepto', price: 'free' },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ productId: 4, price: 0, name: 'Product 4' });
  });

  it('returns an empty list for non-array JSON', () => {
    expect(parseOrderItems(null)).toEqual([]);
    expect(parseOrderItems({ productId: 1 })).toEqual([]);
  });
});

describe('countItems', () => {
  it('counts quantity, not lines', () => {
    expect(
      countItems([
        { productId: 1, name: 'Milk', quantity: 2, storeId: 'blinkit', price: 30 },
        { productId: 2, name: 'Atta', quantity: 3, storeId: 'blinkit', price: 260 },
      ]),
    ).toBe(5);
  });
});
