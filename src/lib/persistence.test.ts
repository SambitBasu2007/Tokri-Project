import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readLocalCart, writeLocalCart, CART_KEY } from './cart';
import {
  CATALOG_CACHE_KEY,
  newestPriceUpdate,
  readCatalogCache,
  writeCatalogCache,
} from './catalog';
import type { PriceRow } from './database.types';
import type { Product, Store } from '../types';

class MemoryStorage {
  private data = new Map<string, string>();
  writes = 0;

  get length() {
    return this.data.size;
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes += 1;
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  clear(): void {
    this.data.clear();
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { localStorage: storage, sessionStorage: new MemoryStorage() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const product: Product = {
  id: 1,
  name: 'Milk',
  category: 'dairy',
  weight: '500 ml',
  mrp: 30,
  imageUrl: null,
  imageCreditUrl: null,
  barcode: null,
  unitQty: 500,
  unit: 'ml',
  prices: { blinkit: { price: 28, inStock: true } },
};

const store: Store = {
  id: 'blinkit',
  name: 'Blinkit',
  deliveryMinutes: 10,
  deliveryFee: 25,
  freeAbove: 199,
};

describe('local cart mirror', () => {
  it('round-trips the lean cart shape and drops extra fields', () => {
    writeLocalCart([
      { productId: 2, storeId: 'zepto', quantity: 1, rowId: 'row-from-community' },
      { productId: 1, storeId: 'blinkit', quantity: 3 },
    ]);
    expect(readLocalCart()).toEqual([
      { productId: 1, storeId: 'blinkit', quantity: 3 },
      { productId: 2, storeId: 'zepto', quantity: 1 },
    ]);
  });

  it('does not rewrite an identical value (no cross-tab event storm)', () => {
    writeLocalCart([{ productId: 1, storeId: 'blinkit', quantity: 3 }]);
    const writes = storage.writes;
    writeLocalCart([{ productId: 1, storeId: 'blinkit', quantity: 3 }]);
    expect(storage.writes).toBe(writes);
  });

  it('ignores malformed entries instead of throwing', () => {
    storage.setItem(
      CART_KEY,
      JSON.stringify([{ productId: 'nope' }, null, { productId: 1, storeId: 'blinkit', quantity: 2 }]),
    );
    expect(readLocalCart()).toEqual([{ productId: 1, storeId: 'blinkit', quantity: 2 }]);
    storage.setItem(CART_KEY, '{not json');
    expect(readLocalCart()).toEqual([]);
  });
});

describe('catalog cache', () => {
  it('round-trips public catalog rows', () => {
    writeCatalogCache([store], [product], '2026-01-01T00:00:00Z');
    const cached = readCatalogCache();
    expect(cached?.products[0].name).toBe('Milk');
    expect(cached?.stores[0].id).toBe('blinkit');
    expect(cached?.updatedAt).toBe('2026-01-01T00:00:00Z');
  });

  it('drops a malformed or empty cache', () => {
    storage.setItem(CATALOG_CACHE_KEY, '{"savedAt":1,"stores":[],"products":[]}');
    expect(readCatalogCache()).toBeNull();
    storage.setItem(CATALOG_CACHE_KEY, 'not json');
    expect(readCatalogCache()).toBeNull();
  });

  it('reads the newest price timestamp', () => {
    const rows = [
      { product_id: 1, store_id: 'blinkit', price: 10, in_stock: true, updated_at: '2026-01-01T00:00:00Z' },
      { product_id: 2, store_id: 'zepto', price: 12, in_stock: true, updated_at: '2026-02-03T04:05:06Z' },
    ] satisfies PriceRow[];
    expect(newestPriceUpdate(rows)).toBe('2026-02-03T04:05:06Z');
    expect(newestPriceUpdate([])).toBeNull();
  });
});
