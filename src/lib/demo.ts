import type { PricePoint, Product, Store, StoreId } from '../types';

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/**
 * Deterministic demo history. Every point is labelled "Simulated" in the UI;
 * this only exists so the chart can be exercised without a populated DB.
 */
export function demoHistory(product: Product, stores: Store[], days: number): PricePoint[] {
  const points: PricePoint[] = [];
  const now = Date.now();
  for (const store of stores) {
    const current = product.prices[store.id];
    if (!current) continue;
    for (let d = days - 1; d >= 0; d -= 1) {
      const noise = hash(`${product.id}-${store.id}-${d}`) - 0.5;
      const drift = 1 + noise * 0.12;
      const raw = d === 0 ? current.price : current.price * drift;
      points.push({
        storeId: store.id as StoreId,
        price: Math.max(1, Math.round(raw)),
        recordedAt: new Date(now - d * 86400000).toISOString(),
      });
    }
  }
  return points;
}

export function demoServerNow(): string {
  return new Date().toISOString();
}
