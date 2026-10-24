import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, IndianRupee, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { useCatalog } from '../state/CatalogContext';
import { CATEGORY_ORDER, categoryLabel } from '../lib/catalog';
import { bestPrice, selectedPrice, unitPrice } from '../lib/pricing';
import { searchScore } from '../lib/search';
import { STORE_IDS, type Product, type StoreId } from '../types';
import { CategoryTabs } from '../components/CategoryTabs';
import { FilterChips } from '../components/FilterChips';
import {
  FilterSheet,
  type ListingFilters,
  type Sort,
} from '../components/FilterSheet';
import { ProductGrid } from '../components/ProductGrid';
import { SearchBar } from '../components/SearchBar';
import styles from './Listing.module.css';

const SORTS: Sort[] = ['relevance', 'price-asc', 'price-desc', 'name', 'unit'];
const DELIVERY = [10, 15, 30, 60];

function parseSort(value: string | null): Sort {
  return SORTS.includes(value as Sort) ? (value as Sort) : 'relevance';
}

function parseStore(value: string | null): StoreId | 'all' {
  return STORE_IDS.includes(value as StoreId) ? (value as StoreId) : 'all';
}

function parseNumber(value: string | null, allowed?: number[]): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  if (allowed && !allowed.includes(parsed)) return null;
  return parsed;
}

export default function ListingPage() {
  const { products, stores, loading } = useCatalog();
  const { category: pathCategory } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const category =
    pathCategory && (CATEGORY_ORDER as readonly string[]).includes(pathCategory)
      ? pathCategory
      : (() => {
          const value = params.get('cat');
          return value && (CATEGORY_ORDER as readonly string[]).includes(value) ? value : 'all';
        })();

  const query = params.get('q') ?? '';
  const sort = parseSort(params.get('sort'));
  const store = parseStore(params.get('store'));
  const delivery = parseNumber(params.get('delivery'), DELIVERY);
  const maxPrice = parseNumber(params.get('price'));

  const filters: ListingFilters = { sort, store, delivery, maxPrice };

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'cat') next.delete('category');
    setParams(next, { preventScrollReset: true });
  };

  const resetFilters = () => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (category !== 'all' && !pathCategory) next.set('cat', category);
    setParams(next, { replace: true });
  };

  const resetSearchAndFilters = () => {
    const next = new URLSearchParams();
    if (category !== 'all' && !pathCategory) next.set('cat', category);
    setParams(next, { replace: true });
  };

  const applyFilters = (next: ListingFilters) => {
    const url = new URLSearchParams(params);
    if (next.sort === 'relevance') url.delete('sort');
    else url.set('sort', next.sort);
    if (next.store === 'all') url.delete('store');
    else url.set('store', next.store);
    if (next.delivery == null) url.delete('delivery');
    else url.set('delivery', String(next.delivery));
    if (next.maxPrice == null) url.delete('price');
    else url.set('price', String(next.maxPrice));
    setParams(url, { preventScrollReset: true });
  };

  const chooseCategory = (value: string | null) => {
    const next = new URLSearchParams(params);
    next.delete('cat');
    if (value) {
      navigate({ pathname: `/c/${value}`, search: next.toString() });
    } else {
      navigate({ pathname: '/search', search: next.toString() });
    }
  };

  const visible = useMemo(() => {
    const needle = query.trim();
    const hasDelivery = delivery != null;

    const filtered = products.filter((product) => {
      if (category !== 'all' && product.category !== category) return false;
      if (store !== 'all' && !product.prices[store]?.inStock) return false;
      if (hasDelivery) {
        const available = stores.some(
          (candidate) =>
            product.prices[candidate.id]?.inStock &&
            candidate.deliveryMinutes <= delivery! &&
            (store === 'all' || candidate.id === store),
        );
        if (!available) return false;
      }
      if (maxPrice != null) {
        const chosen = store !== 'all' ? selectedPrice(product, store) : bestPrice(product)?.price;
        if (chosen == null || chosen > maxPrice) return false;
      }
      if (needle && searchScore(product, needle) <= 0) return false;
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'price-asc' || sort === 'price-desc') {
        const aPrice = store !== 'all' ? selectedPrice(a, store) : bestPrice(a)?.price;
        const bPrice = store !== 'all' ? selectedPrice(b, store) : bestPrice(b)?.price;
        return sort === 'price-asc'
          ? (aPrice ?? Number.POSITIVE_INFINITY) - (bPrice ?? Number.POSITIVE_INFINITY)
          : (bPrice ?? Number.NEGATIVE_INFINITY) - (aPrice ?? Number.NEGATIVE_INFINITY);
      }
      if (sort === 'unit') {
        const aUnit = unitValue(a, store);
        const bUnit = unitValue(b, store);
        return aUnit - bUnit;
      }
      if (needle) {
        const byScore = searchScore(b, needle) - searchScore(a, needle);
        if (byScore !== 0) return byScore;
      }
      return a.id - b.id;
    });
    return sorted;
  }, [products, stores, category, store, delivery, maxPrice, query, sort]);

  const heading = query
    ? `Results for “${query}”`
    : category !== 'all'
      ? categoryLabel(category)
      : 'All products';

  const activeFilterCount =
    (store !== 'all' ? 1 : 0) + (delivery != null ? 1 : 0) + (maxPrice != null ? 1 : 0);

  const chips = [
    {
      key: 'filters',
      label: activeFilterCount ? `Filters (${activeFilterCount})` : 'Filters',
      active: activeFilterCount > 0,
      icon: <SlidersHorizontal size={14} strokeWidth={1.5} aria-hidden />,
      onClick: () => setSheetOpen(true),
    },
    {
      key: 'sort',
      label:
        sort === 'relevance'
          ? 'Sort'
          : sort === 'price-asc'
            ? 'Price: low to high'
            : sort === 'price-desc'
              ? 'Price: high to low'
              : sort === 'name'
                ? 'Name A–Z'
                : 'Unit price',
      active: sort !== 'relevance',
      icon: <ArrowUpDown size={14} strokeWidth={1.5} aria-hidden />,
      onClick: () => setSheetOpen(true),
    },
    {
      key: 'delivery',
      label: delivery ? `Under ${delivery} min` : 'Delivery time',
      active: delivery != null,
      icon: <Clock size={14} strokeWidth={1.5} aria-hidden />,
      onClick: () => setSheetOpen(true),
    },
    {
      key: 'price',
      label: maxPrice ? `Under ₹${maxPrice}` : 'Price',
      active: maxPrice != null,
      icon: <IndianRupee size={14} strokeWidth={1.5} aria-hidden />,
      onClick: () => setSheetOpen(true),
    },
  ];

  return (
    <div className={`page container ${styles.page}`}>
      <div className={styles.searchRow}>
        <Link to="/" className={styles.back} aria-label="Back to home">
          <ArrowLeft size={20} strokeWidth={1.5} aria-hidden />
        </Link>
        <SearchBar
          initialValue={query}
          onSubmit={(next) => setParam('q', next.trim() || null)}
        />
      </div>

      <div className={styles.categoryBar}>
        <CategoryTabs
          active={category === 'all' ? null : category}
          variant="icons"
          onSelect={chooseCategory}
        />
      </div>

      <div className={styles.filterBar}>
        <FilterChips
          chips={chips}
          onClear={activeFilterCount || sort !== 'relevance' ? resetFilters : undefined}
        />
      </div>

      <div className={styles.resultHead}>
        <h1 className={styles.heading}>{heading}</h1>
        <p className={styles.count} aria-live="polite">
          {visible.length} product{visible.length === 1 ? '' : 's'}
        </p>
      </div>

      <h2 className="visually-hidden">Products</h2>
      <ProductGrid
        products={visible}
        loading={loading && products.length === 0}
        onReset={resetSearchAndFilters}
      />

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        stores={stores}
        onChange={applyFilters}
        resultCount={visible.length}
      />
    </div>
  );
}

function unitValue(product: Product, store: StoreId | 'all'): number {
  const price =
    store !== 'all' ? selectedPrice(product, store) : bestPrice(product)?.price;
  if (price == null) return Number.POSITIVE_INFINITY;
  return unitPrice(product, price)?.value ?? Number.POSITIVE_INFINITY;
}
