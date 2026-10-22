import fallbackJson from '../data/catalog.fallback.json';
import type { Product, ProductPrice, Store, StoreId } from '../types';
import type { PriceRow, ProductRow, StoreRow } from './database.types';
import { readJson, writeJson } from './storage';

interface FallbackProduct {
  id: number;
  name: string;
  category: string;
  weight: string;
  mrp: number;
  unitQty: number | null;
  unit: string | null;
  barcode: string | null;
  imageUrl: string | null;
  imageCreditUrl: string | null;
  prices: Record<string, { price: number; inStock: boolean }>;
}

export interface Catalog {
  stores: Store[];
  products: Product[];
  /** Where the rows came from. Cache is stale-while-revalidate, not live. */
  source: 'network' | 'cache' | 'fallback';
  error: string | null;
  loadedAt: number;
}

export function fallbackCatalog(): Catalog {
  const data = fallbackJson as { stores: Store[]; products: FallbackProduct[] };
  return {
    stores: data.stores,
    products: data.products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      weight: p.weight,
      mrp: p.mrp,
      unitQty: p.unitQty,
      unit: p.unit,
      barcode: p.barcode,
      imageUrl: p.imageUrl,
      imageCreditUrl: p.imageCreditUrl,
      prices: p.prices as Partial<Record<StoreId, ProductPrice>>,
    })),
    source: 'fallback',
    error: null,
    loadedAt: Date.now(),
  };
}

export function mapStores(rows: StoreRow[]): Store[] {
  return rows.map((row) => ({
    id: row.id as StoreId,
    name: row.name,
    deliveryMinutes: row.delivery_minutes,
    deliveryFee: Number(row.delivery_fee),
    freeAbove: Number(row.free_above),
  }));
}

export function mapCatalog(stores: StoreRow[], products: ProductRow[], prices: PriceRow[]): Catalog {
  const byProduct = new Map<number, Product>();
  for (const row of products) {
    byProduct.set(row.id, {
      id: row.id,
      name: row.name,
      category: row.category,
      weight: row.weight,
      mrp: Number(row.mrp),
      unitQty: row.unit_qty,
      unit: row.unit,
      barcode: row.barcode,
      imageUrl: row.image_url,
      imageCreditUrl: row.image_credit_url,
      prices: {},
    });
  }
  for (const row of prices) {
    const product = byProduct.get(row.product_id);
    if (!product) continue;
    product.prices[row.store_id as StoreId] = { price: Number(row.price), inStock: row.in_stock };
  }
  return {
    stores: mapStores(stores),
    products: [...byProduct.values()].sort((a, b) => a.id - b.id),
    source: 'network',
    error: null,
    loadedAt: Date.now(),
  };
}

/**
 * Public catalog cache for instant paint on refresh.
 * Bump the version suffix whenever the Product/Store shape changes.
 */
export const CATALOG_CACHE_KEY = 'tokri:catalog:v1';
export const CATALOG_CACHE_MAX_AGE_MS = 10 * 60 * 1000;

interface CachedCatalog {
  savedAt: number;
  /** Newest prices.updated_at seen when the cache was written. */
  updatedAt: string | null;
  stores: Store[];
  products: Product[];
}

function isStore(value: unknown): value is Store {
  if (typeof value !== 'object' || value === null) return false;
  const store = value as Partial<Store>;
  return (
    typeof store.id === 'string' &&
    typeof store.name === 'string' &&
    typeof store.deliveryMinutes === 'number' &&
    typeof store.deliveryFee === 'number' &&
    typeof store.freeAbove === 'number'
  );
}

function isProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) return false;
  const product = value as Partial<Product>;
  return (
    typeof product.id === 'number' &&
    typeof product.name === 'string' &&
    typeof product.category === 'string' &&
    typeof product.prices === 'object' &&
    product.prices !== null
  );
}

export function readCatalogCache(): CachedCatalog | null {
  const raw = readJson<Partial<CachedCatalog>>('local', CATALOG_CACHE_KEY);
  if (!raw || typeof raw.savedAt !== 'number') return null;
  if (!Array.isArray(raw.stores) || !Array.isArray(raw.products)) return null;
  if (!raw.stores.length || !raw.products.length) return null;
  if (!raw.stores.every(isStore) || !raw.products.every(isProduct)) return null;
  return {
    savedAt: raw.savedAt,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
    stores: raw.stores,
    products: raw.products,
  };
}

export function writeCatalogCache(
  stores: Store[],
  products: Product[],
  updatedAt: string | null,
): void {
  writeJson('local', CATALOG_CACHE_KEY, {
    savedAt: Date.now(),
    updatedAt,
    stores,
    products,
  } satisfies CachedCatalog);
}

export function newestPriceUpdate(prices: PriceRow[]): string | null {
  let newest: string | null = null;
  for (const row of prices) {
    if (typeof row.updated_at === 'string' && (!newest || row.updated_at > newest)) {
      newest = row.updated_at;
    }
  }
  return newest;
}

/** Display order for home rails, shop tabs and breadcrumbs. */
export const CATEGORY_ORDER = [
  'dairy',
  'bakery',
  'atta',
  'oil',
  'fruits',
  'vegetables',
  'snacks',
  'instant',
  'beverages',
  'personal',
  'cleaning',
  'household',
  'health',
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  dairy: 'Dairy',
  bakery: 'Bakery & eggs',
  atta: 'Staples & dals',
  oil: 'Cooking oil',
  fruits: 'Fruits',
  vegetables: 'Vegetables',
  snacks: 'Snacks & biscuits',
  instant: 'Instant food',
  beverages: 'Beverages',
  personal: 'Personal care',
  cleaning: 'Cleaning',
  household: 'Household',
  health: 'Health & wellness',
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}
