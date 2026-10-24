import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import {
  CATALOG_CACHE_MAX_AGE_MS,
  fallbackCatalog,
  mapCatalog,
  newestPriceUpdate,
  readCatalogCache,
  writeCatalogCache,
  type Catalog,
} from '../lib/catalog';
import type { Product, Store } from '../types';

interface CatalogContextValue {
  stores: Store[];
  products: Product[];
  /** network = live rows, cache = saved copy, fallback = bundled JSON. */
  source: Catalog['source'];
  /** When the current rows were fetched (or when the cache was written). */
  cachedAt: number | null;
  error: string | null;
  loading: boolean;
  reload: (options?: { silent?: boolean }) => Promise<void>;
  productById: (id: number) => Product | undefined;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

function errorText(value: unknown): string {
  if (typeof value === 'object' && value !== null && 'message' in value) {
    return String((value as { message: unknown }).message);
  }
  if (value instanceof Error) return value.message;
  return 'Catalog unavailable.';
}

interface CatalogState {
  catalog: Catalog;
  cachedAt: number | null;
}

function initialState(): CatalogState {
  const cached = readCatalogCache();
  if (cached) {
    return {
      catalog: {
        stores: cached.stores,
        products: cached.products,
        source: 'cache',
        error: null,
        loadedAt: cached.savedAt,
      },
      cachedAt: cached.savedAt,
    };
  }
  return { catalog: fallbackCatalog(), cachedAt: null };
}

/**
 * Stale-while-revalidate: paint the last public catalog from localStorage,
 * then replace it with network rows in the background.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CatalogState>(initialState);
  const [loading, setLoading] = useState(() => state.catalog.source !== 'cache');
  const hadCache = useRef(state.catalog.source === 'cache');

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const [storesResult, productsResult, pricesResult] = await Promise.all([
        supabase.from('stores').select('*').order('name'),
        supabase.from('products').select('*').order('id'),
        supabase.from('prices').select('*'),
      ]);
      const error = storesResult.error ?? productsResult.error ?? pricesResult.error;
      if (error) throw error;
      if (!productsResult.data?.length || !storesResult.data?.length) {
        throw new Error('Catalog is empty in the database.');
      }

      const prices = pricesResult.data ?? [];
      const next = mapCatalog(storesResult.data, productsResult.data, prices);
      setState({ catalog: next, cachedAt: Date.now() });
      writeCatalogCache(next.stores, next.products, newestPriceUpdate(prices));
      hadCache.current = true;
    } catch (err) {
      const message = errorText(err);
      // Keep database diagnostics in the console, not in the customer-facing UI.
      console.warn('[Tokri] catalog fallback:', message);
      const cached = readCatalogCache();
      if (cached) {
        setState({
          catalog: {
            stores: cached.stores,
            products: cached.products,
            source: 'cache',
            error: message,
            loadedAt: cached.savedAt,
          },
          cachedAt: cached.savedAt,
        });
      } else {
        setState({ catalog: { ...fallbackCatalog(), error: message }, cachedAt: null });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload({ silent: hadCache.current });
  }, [reload]);

  // Revalidate when the tab becomes visible again, if the cache is stale.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const cached = readCatalogCache();
      if (!cached || Date.now() - cached.savedAt > CATALOG_CACHE_MAX_AGE_MS) {
        void reload({ silent: Boolean(cached) });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  const value = useMemo<CatalogContextValue>(() => {
    const byId = new Map(state.catalog.products.map((product) => [product.id, product]));
    return {
      stores: state.catalog.stores,
      products: state.catalog.products,
      source: state.catalog.source,
      cachedAt: state.cachedAt,
      error: state.catalog.error,
      loading,
      reload,
      productById: (id: number) => byId.get(id),
    };
  }, [state, loading, reload]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog must be used inside CatalogProvider');
  return context;
}
