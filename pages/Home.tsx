import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpDown, Clock, IndianRupee, SlidersHorizontal } from 'lucide-react';
import { useCatalog } from '../state/CatalogContext';
import { useOrders } from '../hooks/useOrders';
import { CATEGORY_ORDER, categoryLabel } from '../lib/catalog';
import { bestPrice } from '../lib/pricing';
import { inr } from '../lib/format';
import { CategoryTabs } from '../components/CategoryTabs';
import { CategoryTile } from '../components/CategoryTile';
import { FilterChips } from '../components/FilterChips';
import { HScroller } from '../components/HScroller';
import { ProductCard } from '../components/ProductCard';
import { ProductGrid } from '../components/ProductGrid';
import { SearchBar } from '../components/SearchBar';
import { SectionHeader } from '../components/SectionHeader';
import styles from './Home.module.css';

const HOME_GRID_COUNT = 24;
const RAIL_COUNT = 10;

export default function Home() {
  const { products, stores, loading } = useCatalog();
  const { orders } = useOrders();
  const navigate = useNavigate();

  const categories = useMemo(() => {
    return CATEGORY_ORDER.map((value) => {
      const items = products.filter((product) => product.category === value);
      return {
        value,
        label: categoryLabel(value),
        products: items.slice(0, 4),
        total: items.length,
      };
    }).filter((category) => category.total > 0);
  }, [products]);

  const savings = useMemo(() => {
    return products
      .map((product) => {
        const best = bestPrice(product);
        return best ? { product, saving: product.mrp - best.price } : null;
      })
      .filter((entry): entry is { product: (typeof products)[number]; saving: number } => Boolean(entry && entry.saving > 0))
      .sort((a, b) => b.saving - a.saving)
      .slice(0, RAIL_COUNT)
      .map((entry) => entry.product);
  }, [products]);

  const buyAgain = useMemo(() => {
    const seen = new Set<number>();
    const result = [];
    for (const order of orders) {
      for (const item of order.items) {
        if (seen.has(item.productId)) continue;
        seen.add(item.productId);
        const product = products.find((candidate) => candidate.id === item.productId);
        if (product) result.push(product);
        if (result.length >= RAIL_COUNT) return result;
      }
    }
    return result;
  }, [orders, products]);

  const feeCards = stores
    .filter((store) => store.freeAbove > 0)
    .slice(0, 4);

  const firstProducts = products.slice(0, HOME_GRID_COUNT);

  const filterChips = [
    {
      key: 'filters',
      label: 'Filters',
      icon: <SlidersHorizontal size={14} strokeWidth={1.5} aria-hidden />,
      onClick: () => navigate('/search'),
    },
    {
      key: 'sort',
      label: 'Sort',
      icon: <ArrowUpDown size={14} strokeWidth={1.5} aria-hidden />,
      onClick: () => navigate('/search?sort=price-asc'),
    },
    {
      key: 'delivery',
      label: 'Delivery time',
      icon: <Clock size={14} strokeWidth={1.5} aria-hidden />,
      onClick: () => navigate('/search?delivery=15'),
    },
    {
      key: 'price',
      label: 'Price',
      icon: <IndianRupee size={14} strokeWidth={1.5} aria-hidden />,
      onClick: () => navigate('/search?price=100'),
    },
  ];

  return (
    <div className={`page container ${styles.page}`}>
      <div className={styles.mobileSearch}>
        <SearchBar
          onSubmit={(query) =>
            navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search')
          }
        />
      </div>

      <div className={styles.tabs}>
        <CategoryTabs
          active={null}
          variant="icons"
          linkTo={(value) => (value ? `/c/${value}` : '/search')}
        />
      </div>

      {feeCards.length > 0 && (
        <section className={styles.fees} aria-label="Delivery offers">
          <HScroller ariaLabel="Delivery offers" arrows={false}>
            {feeCards.map((store) => (
              <div key={store.id} className={styles.feeCard}>
                <span className={styles.feeStore}>{store.name}</span>
                <span className={styles.feeText}>
                  Free delivery above {inr(store.freeAbove)}
                </span>
              </div>
            ))}
          </HScroller>
        </section>
      )}

      <section className={styles.section} aria-labelledby="shop-category">
        <SectionHeader
          id="shop-category"
          title="Shop by category"
          subtitle={`${categories.length} categories · ${products.length} products`}
          action={
            <Link className={styles.seeAll} to="/categories">
              See all
              <ArrowRight size={14} strokeWidth={1.5} aria-hidden />
            </Link>
          }
        />
        <div className={styles.tiles}>
          {categories.map((category) => (
            <CategoryTile
              key={category.value}
              category={category.value}
              label={category.label}
              products={category.products}
              total={category.total}
            />
          ))}
        </div>
      </section>

      {savings.length > 0 && (
        <section className={styles.section} aria-labelledby="savings-heading">
          <SectionHeader
            id="savings-heading"
            title="Biggest savings"
            subtitle="The largest gaps between MRP and the best store price"
            action={
              <Link className={styles.seeAll} to="/search?sort=price-asc">
                Browse
                <ArrowRight size={14} strokeWidth={1.5} aria-hidden />
              </Link>
            }
          />
          <HScroller ariaLabel="Products with the biggest savings">
            {savings.map((product) => (
              <div key={product.id} className={styles.railItem}>
                <ProductCard product={product} compact />
              </div>
            ))}
          </HScroller>
        </section>
      )}

      {buyAgain.length > 0 && (
        <section className={styles.section} aria-labelledby="buy-again-heading">
          <SectionHeader
            id="buy-again-heading"
            title="Buy again"
            subtitle="From your recent orders"
          />
          <HScroller ariaLabel="Buy again">
            {buyAgain.map((product) => (
              <div key={product.id} className={styles.railItem}>
                <ProductCard product={product} />
              </div>
            ))}
          </HScroller>
        </section>
      )}

      <section className={styles.section} aria-labelledby="all-products-heading">
        <SectionHeader
          id="all-products-heading"
          title="All products"
          subtitle="Prices update from the selected store"
          action={
            <Link className={styles.seeAll} to="/search">
              View all
              <ArrowRight size={14} strokeWidth={1.5} aria-hidden />
            </Link>
          }
        />
        <FilterChips chips={filterChips} />
        <ProductGrid products={firstProducts} loading={loading && products.length === 0} />
        {products.length > firstProducts.length && (
          <div className={styles.moreRow}>
            <Link className="btn" to="/search">
              Show all {products.length} products
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
