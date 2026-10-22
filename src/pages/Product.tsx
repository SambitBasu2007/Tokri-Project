import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bell, ChevronRight, ExternalLink, ImageOff, Minus, Plus } from 'lucide-react';
import { useCatalog } from '../state/CatalogContext';
import { useCart } from '../state/CartContext';
import { useWatches } from '../state/WatchesContext';
import { usePriceHistory } from '../hooks/usePriceHistory';
import { bestPrice, selectedPrice, unitPrice } from '../lib/pricing';
import { MAX_QUANTITY } from '../lib/cart';
import { categoryLabel } from '../lib/catalog';
import { storeSearchUrl } from '../lib/storeLinks';
import { inr, minutesLabel } from '../lib/format';
import type { StoreId } from '../types';
import { PriceChart } from '../components/PriceChart';
import { WatchModal } from '../components/WatchModal';
import { EmptyState } from '../components/EmptyState';
import styles from './Product.module.css';

export default function ProductPage() {
  const { id } = useParams();
  const { productById, stores, loading } = useCatalog();
  const { add, quantityOf, itemFor, setQty, storeFor, selectStore } = useCart();
  const { watchFor } = useWatches();
  const product = productById(Number(id));
  const [days, setDays] = useState<7 | 30>(30);
  const [selectedStore, setSelectedStore] = useState<StoreId | null>(null);
  const [watchOpen, setWatchOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const history = usePriceHistory(product, stores, days);

  if (!product) {
    return (
      <div className="page">
        <div className="container">
          {loading ? (
            <p className="muted">Loading product…</p>
          ) : (
            <EmptyState title="Product not found" action={<Link className="btn" to="/">Back to catalog</Link>}>
              This item is not in the catalog. It may have been removed.
            </EmptyState>
          )}
        </div>
      </div>
    );
  }

  const best = bestPrice(product);
  const priceList = stores
    .map((store) => ({ storeId: store.id, entry: product.prices[store.id] }))
    .filter((row) => row.entry?.inStock)
    .sort((a, b) => (a.entry?.price ?? 0) - (b.entry?.price ?? 0));
  const cartStoreId = storeFor(product.id);
  const cartStore = stores.find((store) => store.id === cartStoreId);
  const cartPrice = cartStoreId ? selectedPrice(product, cartStoreId) : null;
  const isBestCart = Boolean(best && cartStoreId === best.storeId);
  const unit = cartPrice != null ? unitPrice(product, cartPrice) : null;
  const cheapestStore = priceList[0]?.storeId ?? null;
  const chartStore = selectedStore ?? cheapestStore;
  const relevantPoints = history.points.filter((point) => point.storeId === chartStore);
  const low = relevantPoints.length ? Math.min(...relevantPoints.map((point) => point.price)) : best?.price ?? 0;
  const average = relevantPoints.length
    ? relevantPoints.reduce((sum, point) => sum + point.price, 0) / relevantPoints.length
    : best?.price ?? 0;
  const nearLow = Boolean(best && low && best.price <= low * 1.02);
  const watch = watchFor(product.id);
  const quantity = quantityOf(product.id);
  const item = itemFor(product.id);
  const bestStoreName = stores.find((store) => store.id === best?.storeId)?.name;

  return (
    <div className="page">
      <div className="container">
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link to="/">Catalog</Link>
          <ChevronRight size={12} aria-hidden />
          <Link to={`/?category=${product.category}`}>{categoryLabel(product.category)}</Link>
          <ChevronRight size={12} aria-hidden />
          <span>{product.name}</span>
        </nav>

        <div className={styles.layout}>
          <div>
            <div className={styles.media}>
              {product.imageUrl && !imageFailed ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className={styles.image}
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <span className={styles.placeholder}>
                  <ImageOff size={32} strokeWidth={1.25} aria-hidden />
                  {product.name}
                </span>
              )}
            </div>
            {product.imageCreditUrl && (
              <p className={styles.attribution}>
                Image from{' '}
                <a href={product.imageCreditUrl} target="_blank" rel="noreferrer noopener">
                  {product.imageCreditUrl.includes('commons.wikimedia.org')
                    ? 'Wikimedia Commons'
                    : 'Open Food Facts contributors'}
                </a>
                {product.imageCreditUrl.includes('commons.wikimedia.org')
                  ? ', CC-licensed.'
                  : ', CC BY-SA.'}{' '}
                Packaging and trademarks may carry third-party rights.
              </p>
            )}
          </div>

          <div className={styles.info}>
            <p className={styles.category}>{categoryLabel(product.category)}</p>
            <h1 className={styles.title}>{product.name}</h1>
            <p className={styles.weight}>
              {product.weight}
              {product.barcode ? ` · Barcode ${product.barcode}` : ''}
            </p>

            {cartPrice != null && cartStore ? (
              <>
                <div className={styles.bestRow}>
                  <span className={isBestCart ? styles.best : styles.price}>{inr(cartPrice)}</span>
                  <span className={styles.at}>
                    · {cartStore.name} · {minutesLabel(cartStore.deliveryMinutes)}
                  </span>
                  {product.mrp > cartPrice && <span className={styles.mrp}>{inr(product.mrp)}</span>}
                  {product.mrp > cartPrice && (
                    <span className={styles.save}>
                      {Math.round(((product.mrp - cartPrice) / product.mrp) * 100)}% below MRP
                    </span>
                  )}
                </div>
                {best && !isBestCart && (
                  <p className={styles.cheapest}>
                    Cheapest: {bestStoreName} {inr(best.price)} (+{inr(cartPrice - best.price)} here)
                  </p>
                )}
              </>
            ) : (
              <p className={styles.weight}>Out of stock at every store.</p>
            )}

            {unit && <p className={styles.unit}>{inr(unit.value)} {unit.label} at the selected store</p>}

            <div className={styles.addRow}>
              {quantity > 0 && item ? (
                <div className={styles.stepper}>
                  <button
                    type="button"
                    onClick={() => void setQty(item, item.quantity - 1)}
                    aria-label={`Decrease ${product.name} quantity`}
                  >
                    <Minus size={14} aria-hidden />
                  </button>
                  <span aria-live="polite">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => void setQty(item, item.quantity + 1)}
                    disabled={item.quantity >= MAX_QUANTITY}
                    aria-label={
                      item.quantity >= MAX_QUANTITY
                        ? `Maximum quantity reached for ${product.name}`
                        : `Increase ${product.name} quantity`
                    }
                  >
                    <Plus size={14} aria-hidden />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={`btn btn-primary ${styles.add}`}
                  disabled={cartPrice == null}
                  onClick={() => void add(product.id)}
                >
                  <Plus size={15} aria-hidden />
                  {cartStore ? `Add · ${inr(cartPrice ?? 0)} at ${cartStore.name}` : 'Unavailable'}
                </button>
              )}
              <button type="button" className={`btn ${styles.watchButton}`} onClick={() => setWatchOpen(true)}>
                <Bell size={15} aria-hidden />
                {watch ? `Watching ${inr(watch.targetPrice)}` : 'Watch price'}
              </button>
            </div>

            <div className={styles.simBanner}>
              <strong>Demo prices, not live.</strong> Quick-commerce prices change by pincode. Use the
              ↗ link beside a store to open its current listing and verify before ordering. Price
              history is generated demo data.
            </div>

            <div className={styles.stores}>
              <div className={styles.storesHead}>Price by store</div>
              {stores.map((store) => {
                const entry = product.prices[store.id];
                const isBest = entry?.inStock && entry.price === best?.price;
                const isCartStore = store.id === cartStoreId;
                return (
                  <div
                    key={store.id}
                    className={`${styles.storeRow} ${isBest ? styles.storeRowBest : ''} ${
                      isCartStore ? styles.storeRowSelected : ''
                    }`.trim()}
                  >
                    <span className={styles.storeName}>
                      {store.name}
                      {isBest && <span className={styles.bestTag}>best</span>}
                      {isCartStore && <span className={styles.chosenTag}>selected</span>}
                    </span>
                    <span className={`${styles.storePrice} ${!entry?.inStock ? styles.out : ''}`}>
                      {entry?.inStock ? inr(entry.price) : 'Out of stock'}
                    </span>
                    <div className={styles.storeActions}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={!entry?.inStock || isCartStore}
                        onClick={() => {
                          setSelectedStore(store.id);
                          void selectStore(product.id, store.id);
                        }}
                      >
                        {isCartStore ? 'Selected' : 'Select'}
                      </button>
                      <a
                        className={styles.liveLink}
                        href={storeSearchUrl(store.id, product)}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={`Check ${store.name} live price for ${product.name}`}
                        title={`Check ${store.name} live price`}
                      >
                        <ExternalLink size={13} aria-hidden />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Price history</h2>
              <p className={styles.sectionNote}>
                One line per store. Select a line to see its low and average.
              </p>
            </div>
            <div className={styles.range} role="group" aria-label="History range">
              {([7, 30] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.rangeButton} ${days === value ? styles.rangeActive : ''}`}
                  aria-pressed={days === value}
                  onClick={() => setDays(value)}
                >
                  {value}d
                </button>
              ))}
            </div>
          </div>

          <PriceChart
            product={product}
            stores={stores}
            points={history.points}
            selectedStore={selectedStore}
            onSelectStore={setSelectedStore}
          />

          <div className={styles.stats}>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Current best</p>
              <p className={styles.statValue}>{best ? inr(best.price) : '—'}</p>
            </div>
            <div className={styles.stat}>
              <p className={styles.statLabel}>{days}-day low</p>
              <p className={styles.statValue}>{inr(low)}</p>
            </div>
            <div className={styles.stat}>
              <p className={styles.statLabel}>{days}-day average</p>
              <p className={styles.statValue}>{inr(average)}</p>
            </div>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Stores in stock</p>
              <p className={styles.statValue}>{priceList.length} of {stores.length}</p>
            </div>
          </div>
          {nearLow && (
            <p className={styles.nearLow}>
              Near the {days}-day low. This is simulated data, so treat it as illustrative.
            </p>
          )}
          <p className="small" style={{ marginTop: '8px' }}>
            {history.source === 'db' ? 'History read from stored price snapshots.' : 'History generated in the browser because no snapshots are available.'}{' '}
            Demo prices; use the store links above to verify today's price.
          </p>
        </section>
      </div>

      <WatchModal
        open={watchOpen}
        product={product}
        onClose={() => setWatchOpen(false)}
        currentBest={best?.price ?? product.mrp}
        storeId={selectedStore}
      />
    </div>
  );
}
