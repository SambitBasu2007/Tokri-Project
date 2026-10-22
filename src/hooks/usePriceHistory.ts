import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { demoHistory } from '../lib/demo';
import type { PricePoint, Product, Store, StoreId } from '../types';

export function usePriceHistory(product: Product | undefined, stores: Store[], days: number) {
  const [dbPoints, setDbPoints] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'db' | 'demo'>('demo');

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    setLoading(true);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    supabase
      .from('price_snapshots')
      .select('store_id, price, recorded_at')
      .eq('product_id', product.id)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data?.length) {
          setDbPoints(
            data.map((row) => ({
              storeId: row.store_id as StoreId,
              price: Number(row.price),
              recordedAt: row.recorded_at,
            })),
          );
          setSource('db');
        } else {
          setDbPoints([]);
          setSource('demo');
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product, days]);

  const points = useMemo(
    () => (source === 'db' && dbPoints.length ? dbPoints : product ? demoHistory(product, stores, days) : []),
    [source, dbPoints, product, stores, days],
  );

  return { points, loading, source, simulated: true };
}
