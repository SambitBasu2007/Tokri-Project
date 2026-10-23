import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCatalog } from '../state/CatalogContext';
import { bestPrice, unitPrice } from '../lib/pricing';
import { CATEGORY_ORDER, categoryLabel } from '../lib/catalog';
import { searchScore } from '../lib/search';
import { STORE_IDS, type StoreId } from '../types';
import { ProductGrid } from '../components/ProductGrid';
import styles from './Shop.module.css';

type Sort = 'relevance' | 'price-asc' | 'price-desc' | 'name' | 'unit';

const SORTS: Sort[] = ['relevance', 'price-asc', 'price-desc', 'name', 'unit'];

function parseSort(value: string | null): Sort {
  return SORTS.includes(value as Sort) ? (value as Sort) : 'relevance';
}

function parseStore(value: string | null): StoreId | 'all' {
  return STORE_IDS.includes(value as StoreId) ? (value as StoreId) : 'all';
}

function parseCategory(value: string | null): string {
  return value && (CATEGORY_ORDER as readonly string[]).includes(value) ? value : 'all';
}

export default function ShopPage() {
  const { products, stores, loading } = useCatalog();
  const [params, setParams] = useSearchParams();
  // Filters live in the URL: Back, refresh and shared links all restore them.
  const query = params.get('q') ?? '';
  const category = parseCategory(params.get('cat') ?? params.get('category'));
  const sort = parseSort(params.get('sort'));
  const storeFilter = parseStore(params.get('store'));

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    // Migrate links that used the older ?category= key.
    if (key === 'cat') next.delete('category');
    // Do not jump to the top when only a filter changed.
    setParams(next, { preventScrollReset: true });
  };

  const categories = useMemo(() => {
    const present = new Set(products.map((product) => product.category));
    return CATEGORY_ORDER.filter((value) => present.has(value));
  }, [products]);

  const visible = useMemo(() => {
    const needle = query.trim();
    const filtered = products.filter((product) => {
      if (category !== 'all' && product.category !== category) return false;
      if (storeFilter !== 'all' && !product.prices[storeFilter]?.inStock) return false;
      if (!needle) return true;
      return searchScore(product, needle) > 0;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'price-asc' || sort === 'price-desc') {
        const aPrice = bestPrice(a)?.price ?? Number.POSITIVE_INFINITY;
        const bPrice = bestPrice(b)?.price ?? Number.POSITIVE_INFINITY;
        return sort === 'price-asc' ? aPrice - bPrice : bPrice - aPrice;
      }
      if (sort === 'unit') {
        const aBest = bestPrice(a);
        const bBest = bestPrice(b);
        const aUnit = aBest ? unitPrice(a, aBest.price)?.value ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
        const bUnit = bBest ? unitPrice(b, bBest.price)?.value ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
        return aUnit - bUnit;
      }
      if (needle) {
        const byScore = searchScore(b, needle) - searchScore(a, needle);
        if (byScore !== 0) return byScore;
      }
      return a.id - b.id;
    });
    return sorted;
  }, [products, query, category, storeFilter, sort]);

  const reset = () => {
    setParams({}, { replace: true });
  };

  return (
    <div className="page">
      <div className="container">
        <div className={styles.top}>
          <div>
            <Link to="/" className={styles.back}>
              <ArrowLeft size={14} aria-hidden />
              Back to home
            </Link>
            <h1>All products</h1>
            <p className={styles.lede}>
              Filter the full catalog by category, store or price. Every card shows all six shelf
              prices with a one-tap add for that store.
            </p>
          </div>
          <div className={styles.metaCol}>
            <span className={styles.metaStrong}>
              {products.length} products · {stores.length} stores
            </span>
            <span className={styles.metaNote}>Simulated prices · live links on each product</span>
          </div>
        </div>

        <div className={styles.tabsWrap}>
          <div className={styles.tabs} role="tablist" aria-label="Product categories">
            <button
              type="button"
              role="tab"
              aria-selected={category === 'all'}
              className={`${styles.tab} ${category === 'all' ? styles.tabActive : ''}`}
              onClick={() => setParam('cat', null)}
            >
              All
            </button>
            {categories.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={category === value}
                className={`${styles.tab} ${category === value ? styles.tabActive : ''}`}
                onClick={() => setParam('cat', value)}
              >
                {categoryLabel(value)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.controls}>
          <p className={styles.count}>
            {visible.length} product{visible.length === 1 ? '' : 's'}
            {query && (
              <>
                {' '}for <span className={styles.query}>“{query}”</span>
                <button type="button" className={styles.clearQuery} onClick={() => setParam('q', null)}>
                  clear search
                </button>
              </>
            )}
          </p>
          <div className={styles.selects}>
            <label>
              <span className="visually-hidden">Filter by store</span>
              <select
                className={styles.select}
                value={storeFilter}
                onChange={(event) => setParam('store', event.target.value === 'all' ? null : event.target.value)}
              >
                <option value="all">All stores</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    In stock at {store.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="visually-hidden">Sort products</span>
              <select
                className={styles.select}
                value={sort}
                onChange={(event) => setParam('sort', event.target.value === 'relevance' ? null : event.target.value)}
              >
                <option value="relevance">Sort: featured</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="unit">Unit price</option>
                <option value="name">Name A–Z</option>
              </select>
            </label>
          </div>
        </div>

        <ProductGrid products={visible} loading={loading && products.length === 0} onReset={reset} />
      </div>
    </div>
  );
}
