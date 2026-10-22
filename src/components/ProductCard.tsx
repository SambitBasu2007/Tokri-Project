import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ImageOff, Minus, Plus } from 'lucide-react';
import type { Product } from '../types';
import { bestPrice, selectedPrice, unitPrice } from '../lib/pricing';
import { MAX_QUANTITY } from '../lib/cart';
import { inr, minutesLabel } from '../lib/format';
import { useCatalog } from '../state/CatalogContext';
import { useCart } from '../state/CartContext';
import { useWatches } from '../state/WatchesContext';
import { StorePicker } from './StorePicker';
import { WatchModal } from './WatchModal';
import styles from './ProductCard.module.css';

export function ProductCard({ product }: { product: Product }) {
  const { stores } = useCatalog();
  const { add, quantityOf, itemFor, setQty, activeLabel, active, selectedStore, storeFor, selectStore } = useCart();
  const { watchFor } = useWatches();
  const [imageFailed, setImageFailed] = useState(false);
  const [watchOpen, setWatchOpen] = useState(false);

  const cheapest = bestPrice(product);
  const quantity = quantityOf(product.id);
  const item = itemFor(product.id);
  const watch = watchFor(product.id);

  const storeId = storeFor(product.id);
  const store = stores.find((candidate) => candidate.id === storeId);
  const price = storeId ? selectedPrice(product, storeId) : null;
  const isBest = Boolean(cheapest && storeId === cheapest.storeId);
  const over = price != null && cheapest ? price - cheapest.price : 0;
  const cheapestStoreName = stores.find((candidate) => candidate.id === cheapest?.storeId)?.name ?? cheapest?.storeId;
  const unit = price != null ? unitPrice(product, price) : null;

  // The persisted pick may point at a store that has since gone out of stock;
  // storeFor() falls back, so explain the swap instead of silently changing it.
  const rawPick = selectedStore[product.id];
  const rawPickStore = rawPick ? stores.find((candidate) => candidate.id === rawPick) : undefined;
  const pickOutOfStock = Boolean(rawPickStore && selectedPrice(product, rawPickStore.id) == null);
  const addTarget = active.type === 'personal' ? 'Personal cart' : activeLabel;

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        <Link to={`/product/${product.id}`} aria-label={product.name}>
          {product.imageUrl && !imageFailed ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className={styles.image}
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className={styles.placeholder}>
              <ImageOff size={22} strokeWidth={1.25} aria-hidden />
              {product.name}
            </span>
          )}
        </Link>
        <button
          type="button"
          className={`${styles.watch} ${watch ? styles.watchActive : ''}`}
          onClick={() => setWatchOpen(true)}
          aria-label={watch ? `Edit price watch for ${product.name}` : `Watch the price of ${product.name}`}
          title={watch ? `Watching for ${inr(watch.targetPrice)}` : 'Watch this price'}
        >
          <Bell size={14} strokeWidth={1.5} aria-hidden />
        </button>
      </div>

      <h3 className={styles.name}>
        <Link to={`/product/${product.id}`}>{product.name}</Link>
      </h3>
      <p className={styles.weight}>{product.weight}</p>

      {price != null && store ? (
        <>
          <div className={styles.priceRow}>
            <span className={isBest ? styles.best : styles.price}>{inr(price)}</span>
            <span className={styles.at}>
              · {store.name} · {minutesLabel(store.deliveryMinutes)}
            </span>
            {product.mrp > price && <span className={styles.mrp}>{inr(product.mrp)}</span>}
          </div>
          {cheapest && !isBest && (
            <p className={styles.cheapest}>
              Cheapest: {cheapestStoreName} {inr(cheapest.price)} (+{inr(over)} here)
            </p>
          )}
          <p className={styles.unit}>
            {unit ? `${inr(unit.value)} ${unit.label}` : '\u00A0'}
            {watch ? ` · Watching ${inr(watch.targetPrice)}` : ''}
          </p>
        </>
      ) : (
        <p className={styles.unit}>Out of stock everywhere</p>
      )}

      <div className={styles.addRow}>
        {quantity > 0 && item ? (
          <div className={styles.stepper}>
            <button
              type="button"
              onClick={() => void setQty(item, item.quantity - 1)}
              aria-label={`Decrease ${product.name} quantity`}
            >
              <Minus size={12} aria-hidden />
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
              <Plus size={12} aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.addButton}
            disabled={price == null}
            onClick={() => void add(product.id)}
            title={`Add to ${addTarget}`}
            aria-label={`Add ${product.name} to ${addTarget}`}
          >
            {price == null ? 'Unavailable' : active.type === 'personal' ? 'Add' : `Add to ${activeLabel}`}
          </button>
        )}
      </div>

      {pickOutOfStock && rawPickStore && store && (
        <p className={styles.storeNotice}>
          {rawPickStore.name} is out of stock · showing {store.name}
        </p>
      )}

      <StorePicker
        product={product}
        value={storeId}
        stores={stores}
        onChange={(next) => void selectStore(product.id, next)}
        label={`Compare ${stores.length} stores`}
      />

      <WatchModal
        open={watchOpen}
        product={product}
        onClose={() => setWatchOpen(false)}
        currentBest={cheapest?.price ?? product.mrp}
      />
    </article>
  );
}
