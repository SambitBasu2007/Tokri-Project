import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase, errorMessage, isMissingRelation } from '../lib/supabase';
import { WATCHES_KEY } from '../lib/cart';
import { WATCH_NOTIFIED_KEY } from '../lib/storage';
import { availablePrices } from '../lib/pricing';
import type { PriceWatch, Product, StoreId } from '../types';
import { useAuth } from './AuthContext';
import { useCatalog } from './CatalogContext';
import { useToast } from './ToastContext';

export interface WatchHit extends PriceWatch {
  product: Product;
  current: number;
  storeId: StoreId | null;
}

interface WatchesContextValue {
  watches: PriceWatch[];
  hits: WatchHit[];
  loading: boolean;
  addWatch: (productId: number, storeId: StoreId | null, targetPrice: number) => Promise<void>;
  removeWatch: (watch: PriceWatch) => Promise<void>;
  watchFor: (productId: number) => PriceWatch | undefined;
}

const WatchesContext = createContext<WatchesContextValue | null>(null);

function readLocalWatches(): PriceWatch[] {
  try {
    const raw = localStorage.getItem(WATCHES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (watch): watch is PriceWatch =>
        typeof watch === 'object' &&
        watch !== null &&
        typeof (watch as PriceWatch).productId === 'number' &&
        typeof (watch as PriceWatch).targetPrice === 'number',
    );
  } catch {
    return [];
  }
}

function writeLocalWatches(watches: PriceWatch[]): void {
  try {
    localStorage.setItem(WATCHES_KEY, JSON.stringify(watches));
  } catch {
    // Ignore quota/private-mode failures.
  }
}

export function WatchesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { products } = useCatalog();
  const { toast } = useToast();
  const [watches, setWatches] = useState<PriceWatch[]>(() => readLocalWatches());
  const [loading, setLoading] = useState(false);
  const [dbMode, setDbMode] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setWatches(readLocalWatches());
      setDbMode(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('price_watches')
        .select('id, product_id, store_id, target_price')
        .eq('user_id', user.id);
      if (error) {
        if (!isMissingRelation(error)) console.warn('[Tokri] watches:', error.message);
        setDbMode(false);
        setWatches(readLocalWatches());
        return;
      }
      setDbMode(true);
      const mapped = (data ?? []).map((row) => ({
        id: row.id,
        productId: row.product_id,
        storeId: (row.store_id as StoreId | null) ?? null,
        targetPrice: Number(row.target_price),
      }));
      // Keep locally-created watches from before sign-in, then sync them up.
      const local = readLocalWatches();
      if (local.length) {
        const merged = [...mapped];
        for (const watch of local) {
          if (!merged.some((entry) => entry.productId === watch.productId)) merged.push(watch);
        }
        await supabase.from('price_watches').upsert(
          merged.map((watch) => ({
            user_id: user.id,
            product_id: watch.productId,
            store_id: watch.storeId,
            target_price: watch.targetPrice,
          })),
          { onConflict: 'user_id,product_id' },
        );
        writeLocalWatches([]);
        const { data: fresh } = await supabase
          .from('price_watches')
          .select('id, product_id, store_id, target_price')
          .eq('user_id', user.id);
        setWatches(
          (fresh ?? []).map((row) => ({
            id: row.id,
            productId: row.product_id,
            storeId: (row.store_id as StoreId | null) ?? null,
            targetPrice: Number(row.target_price),
          })),
        );
      } else {
        setWatches(mapped);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const addWatch = useCallback(
    async (productId: number, storeId: StoreId | null, targetPrice: number) => {
      const target = Math.max(1, Math.round(targetPrice));
      if (user && dbMode) {
        const { error } = await supabase.from('price_watches').upsert(
          { user_id: user.id, product_id: productId, store_id: storeId, target_price: target },
          { onConflict: 'user_id,product_id' },
        );
        if (error) {
          toast(errorMessage(error, 'Could not save the watch.'), 'error');
          return;
        }
        await load();
        toast(`Watching for ${formatTarget(target)} or below.`, 'success');
        return;
      }
      const next = watches.filter((watch) => watch.productId !== productId);
      next.push({
        id: `local-${productId}`,
        productId,
        storeId,
        targetPrice: target,
      });
      setWatches(next);
      writeLocalWatches(next);
      toast(`Watching for ${formatTarget(target)} or below.`, 'success');
    },
    [user, dbMode, watches, load, toast],
  );

  const removeWatch = useCallback(
    async (watch: PriceWatch) => {
      if (user && dbMode) {
        const { error } = await supabase.from('price_watches').delete().eq('id', watch.id);
        if (error) {
          toast(errorMessage(error, 'Could not remove the watch.'), 'error');
          return;
        }
        await load();
      } else {
        const next = watches.filter((entry) => entry.id !== watch.id);
        setWatches(next);
        writeLocalWatches(next);
      }
      toast('Watch removed.');
    },
    [user, dbMode, watches, load, toast],
  );

  const hits = useMemo<WatchHit[]>(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    return watches.flatMap((watch) => {
      const product = byId.get(watch.productId);
      if (!product) return [];
      const prices = availablePrices(product).filter(
        (entry) => !watch.storeId || entry.storeId === watch.storeId,
      );
      const best = prices[0];
      if (!best || best.price > watch.targetPrice) return [];
      return [{ ...watch, product, current: best.price, storeId: best.storeId }];
    });
  }, [watches, products]);

  useEffect(() => {
    if (!hits.length) return;
    let notified: string[] = [];
    try {
      notified = JSON.parse(localStorage.getItem(WATCH_NOTIFIED_KEY) ?? '[]') as string[];
    } catch {
      notified = [];
    }
    const fresh = hits.filter((hit) => !notified.includes(`${hit.id}:${hit.current}`));
    if (!fresh.length) return;
    for (const hit of fresh) {
      toast(`${hit.product.name} is ${formatTarget(hit.current)} at ${hit.storeId}.`, 'success');
    }
    try {
      localStorage.setItem(
        WATCH_NOTIFIED_KEY,
        JSON.stringify([...notified, ...fresh.map((hit) => `${hit.id}:${hit.current}`)]),
      );
    } catch {
      // Ignore storage failures.
    }
  }, [hits, toast]);

  const watchFor = useCallback(
    (productId: number) => watches.find((watch) => watch.productId === productId),
    [watches],
  );

  const value = useMemo<WatchesContextValue>(
    () => ({ watches, hits, loading, addWatch, removeWatch, watchFor }),
    [watches, hits, loading, addWatch, removeWatch, watchFor],
  );

  return <WatchesContext.Provider value={value}>{children}</WatchesContext.Provider>;
}

function formatTarget(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export function useWatches(): WatchesContextValue {
  const context = useContext(WatchesContext);
  if (!context) throw new Error('useWatches must be used inside WatchesProvider');
  return context;
}
