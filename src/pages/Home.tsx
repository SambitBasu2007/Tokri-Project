import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package, Sparkles, Users } from 'lucide-react';
import { useCatalog } from '../state/CatalogContext';
import { useAuth } from '../state/AuthContext';
import { CATEGORY_ORDER, categoryLabel } from '../lib/catalog';
import { ProductGrid } from '../components/ProductGrid';
import { ProductCard } from '../components/ProductCard';
import styles from './Home.module.css';

const PREVIEW_COUNT = 8;
const RAIL_COUNT = 10;

export default function Home() {
  const { products, stores, loading } = useCatalog();
  const { signedIn, communities } = useAuth();

  const preview = products.slice(0, PREVIEW_COUNT);

  const sections = useMemo(() => {
    return CATEGORY_ORDER.map((value) => {
      const items = products.filter((product) => product.category === value);
      return {
        category: value,
        label: categoryLabel(value),
        products: items.slice(0, RAIL_COUNT),
        total: items.length,
      };
    }).filter((section) => section.total > 0);
  }, [products]);

  return (
    <div className={`page ${styles.home}`}>
      <div className="container">
        <section className={styles.top}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <Sparkles size={13} aria-hidden />
              One basket · six quick-commerce stores
            </p>
            <h1>Compare the shelf price before you tap buy.</h1>
            <p className={styles.lede}>
              Tokri lines up six stores for every item, so you can see the cheapest pack, the unit
              rate and the one-tap add — without opening six apps.
            </p>
            <div className={styles.heroActions}>
              <Link className="btn btn-primary" to="/shop">
                Browse all {products.length || ''} products
                <ArrowRight size={15} aria-hidden />
              </Link>
              <Link className="btn" to="/orders">
                <Package size={15} aria-hidden />
                Your orders
              </Link>
            </div>
          </div>
          <div className={styles.metaCol}>
            <span className={styles.metaStrong}>
              {products.length} products · {stores.length} stores
            </span>
            <span className={styles.metaNote}>Simulated shelf prices · live links per product</span>
            <span className={styles.metaNote}>Updated for this demo build</span>
          </div>
        </section>

        <section className={styles.communityCard} aria-label="Community shopping">
          <span className={styles.communityIcon}>
            <Users size={20} strokeWidth={1.5} aria-hidden />
          </span>
          <div className={styles.communityCopy}>
            <h2>Shop one basket together</h2>
            <p>
              Family or flatmates can add to a shared cart, see who added what, and check out
              without buying the same milk twice.
            </p>
          </div>
          <div className={styles.communityActions}>
            <Link className="btn btn-sm" to="/social">
              {signedIn && communities.length ? `Open ${communities.length} communities` : 'Find a community'}
              <ArrowRight size={13} aria-hidden />
            </Link>
          </div>
        </section>

        <nav className={styles.categoryChips} aria-label="Shop by category">
          <Link to="/shop" className={styles.chip}>
            All products
          </Link>
          {sections.map((section) => (
            <Link key={section.category} to={`/shop?cat=${section.category}`} className={styles.chip}>
              {section.label}
            </Link>
          ))}
        </nav>

        <section className={styles.section} aria-labelledby="all-products-heading">
          <div className={styles.sectionHead}>
            <div>
              <h2 id="all-products-heading">All products</h2>
              <p className={styles.sectionNote}>
                A quick look at the catalog. Every card lists all {stores.length} stores.
              </p>
            </div>
            <Link className="btn btn-sm" to="/shop">
              Show all {products.length} products
              <ArrowRight size={13} aria-hidden />
            </Link>
          </div>
          <ProductGrid products={preview} loading={loading && products.length === 0} />
        </section>

        {sections.map((section) => (
          <section
            key={section.category}
            id={`cat-${section.category}`}
            className={styles.section}
            aria-labelledby={`cat-${section.category}-heading`}
          >
            <div className={styles.sectionHead}>
              <div>
                <h2 id={`cat-${section.category}-heading`}>{section.label}</h2>
                <p className={styles.sectionNote}>
                  {section.total} product{section.total === 1 ? '' : 's'}
                </p>
              </div>
              <Link className={styles.viewAll} to={`/shop?cat=${section.category}`}>
                View all
                <ArrowRight size={13} aria-hidden />
              </Link>
            </div>
            <div className={styles.rail} role="list">
              {section.products.map((product) => (
                <div key={product.id} className={styles.railItem} role="listitem">
                  <ProductCard product={product} compact />
                </div>
              ))}
            </div>
          </section>
        ))}

        <p className="small" style={{ marginTop: '28px' }}>
          Prices are simulated for this demo; quick-commerce prices change by pincode. Open any
          product to check its live store listing. <Link to="/shop">Browse the full catalog</Link>.
        </p>
      </div>
    </div>
  );
}
