import { Link } from 'react-router-dom';
import { Bell, ImageOff } from 'lucide-react';
import { useWatches } from '../state/WatchesContext';
import { useCatalog } from '../state/CatalogContext';
import { bestPrice } from '../lib/pricing';
import { inr } from '../lib/format';
import { EmptyState } from '../components/EmptyState';
import styles from './Watchlist.module.css';
import common from './common.module.css';

export default function WatchlistPage() {
  const { watches, hits, removeWatch, loading } = useWatches();
  const { productById, stores } = useCatalog();

  const rows = watches.flatMap((watch) => {
    const product = productById(watch.productId);
    if (!product) return [];
    const best = bestPrice(product);
    const storePrice = watch.storeId ? product.prices[watch.storeId] : undefined;
    const current = storePrice?.inStock ? storePrice.price : best?.price ?? null;
    const hit = hits.find((entry) => entry.id === watch.id);
    return [{ watch, product, best, current, hit }];
  });

  return (
    <div className="page">
      <div className="container">
        <div className={common.pageHead}>
          <div>
            <h1>Watchlist</h1>
            <p className={common.lede}>
              Tokri checks these targets when the app opens. Prices are simulated demo data.
            </p>
          </div>
          <Link className="btn btn-sm" to="/">
            Browse products
          </Link>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Bell size={28} strokeWidth={1.5} aria-hidden />}
            title={loading ? 'Loading watches…' : 'No price watches yet'}
            action={<Link className="btn btn-primary" to="/">Pick a product</Link>}
          >
            Open any product and choose “Watch price” to track a target.
          </EmptyState>
        ) : (
          <div className={styles.list}>
            {rows.map(({ watch, product, hit, current }) => (
              <div key={watch.id} className={styles.row}>
                <div className={styles.imageWrap}>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className={styles.image} loading="lazy" />
                  ) : (
                    <span className={styles.placeholder}>
                      <ImageOff size={18} strokeWidth={1.25} aria-hidden />
                    </span>
                  )}
                </div>
                <div className={styles.main}>
                  <Link to={`/product/${product.id}`} className={styles.name}>
                    {product.name}
                  </Link>
                  <p className={styles.meta}>
                    {product.weight} · target {inr(watch.targetPrice)}
                    {watch.storeId ? ` at ${stores.find((store) => store.id === watch.storeId)?.name ?? watch.storeId}` : ' · any store'}
                  </p>
                  <p className={styles.meta}>
                    Current {current != null ? inr(current) : 'Unavailable'}
                    {hit ? ' · Target reached' : ''}
                  </p>
                </div>
                <div className={styles.right}>
                  {hit ? (
                    <span className={`${common.badge} ${common.badgeAccent}`}>Target reached</span>
                  ) : (
                    <span className={common.badgeQuiet}>Watching</span>
                  )}
                  <button type="button" className="btn btn-sm" onClick={() => void removeWatch(watch)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className={common.smallNote} style={{ marginTop: '16px' }}>
          Alerts are in-app only: a toast plus a dot on the watchlist icon. Email and push alerts are
          not built. Server-side alerts would need a scheduled function.
        </p>
      </div>
    </div>
  );
}
