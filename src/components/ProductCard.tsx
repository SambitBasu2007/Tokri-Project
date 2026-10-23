import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, ImageOff, Minus, Plus } from 'lucide-react';
import type { Product } from '../types';
import { bestPrice, selectedPrice, unitPrice } from '../lib/pricing';
import { MAX_QUANTITY } from '../lib/cart';
import { inr, minutesLabel } from '../lib/format';
import { useCatalog } from '../state/CatalogContext';
import { useCart } from '../state/CartContext';
import { useWatches } from '../state/WatchesContext';
import { WatchModal } from './WatchModal';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
  /**
   * Rail cards sit in a horizontal scroller and keep the per-store matrix on
   * the full grid card instead. They still add from the cheapest store.
   */
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const { stores } = useCatalog();
  const { add, quantityOf, itemFor, setQty, activeLabel, active, selectedStore, storeFor, selectStore } =
    useCart();
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
  const unit = price != null ? unitPrice(product, price) : null;
  const addTarget = active.type === 'personal' ? 'Personal cart' : activeLabel;

  const storeRows = stores
    .map((candidate) => {
      const entry = product.prices[candidate.id];
      return { store: candidate, price: entry?.inStock ? entry.price : null };
    })
    .sort((a, b) => {
      if (a.price == null && b.price == null) return a.store.name.localeCompare(b.store.name);
      if (a.price == null) return 1;
      if (b.price == null) return -1;
      return a.price - b.price || a.store.name.localeCompare(b.store.name);
    });

  // The persisted pick may point at a store that has since gone out of stock;
  // storeFor() falls back, so explain the swap instead of silently changing it.
  const rawPick = selectedStore[product.id];
  const rawPickStore = rawPick ? stores.find((candidate) => candidate.id === rawPick) : undefined;
  const pickOutOfStock = Boolean(rawPickStore && selectedPrice(product, rawPickStore.id) == null);

  return (
    <article className={`${styles.card} ${compact ? styles.compactCard : ''}`.trim()}>
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
            {product.mrp > price && <span className={styles.mrp}>{inr(product.mrp)}</span>}
            {isBest && <span className={styles.bestTag}>Best</span>}
          </div>
          <p className={styles.at}>
            {store.name} · {minutesLabel(store.deliveryMinutes)}
            {cheapest && !isBest ? ` · best ${inr(cheapest.price)}` : ''}
          </p>
          <p className={styles.unit}>{unit ? `${inr(unit.value)} ${unit.label}` : '\u00A0'}</p>
        </>
      ) : (
        <p className={styles.unit}>Out of stock everywhere</p>
      )}

      {!compact && price != null && (
        <div className={styles.storeList} aria-label={`Compare ${stores.length} stores`}>
          <p className={styles.storeListHead}>Pick a store</p>
          {storeRows.map((row) => {
            const available = row.price != null;
            const selected = available && row.store.id === storeId;
            const best = available && cheapest != null && row.price === cheapest.price;
            return (
              <button
                key={row.store.id}
                type="button"
                className={`${styles.storeRow} ${selected ? styles.storeRowSelected : ''} ${
                  available ? '' : styles.storeRowOut
                }`.trim()}
                data-store={row.store.id}
                disabled={!available}
                onClick={() => void selectStore(product.id, row.store.id)}
                aria-pressed={selected}
                aria-label={
                  available
                    ? `Choose ${row.store.name} for ${product.name} at ${inr(row.price!)}`
                    : `${row.store.name} is out of stock`
                }
                title={
                  available
                    ? `Choose ${row.store.name} · ${inr(row.price!)}`
                    : `${row.store.name} is out of stock`
                }
              >
                <span className={styles.storeName}>
                  {row.store.name}
                  {best && <span className={styles.storeBest}>Best</span>}
                </span>
                <span className={styles.storePrice}>{available ? inr(row.price!) : '—'}</span>
                <span
                  className={`${styles.storePick} ${selected ? styles.storePickOn : ''}`}
                  aria-hidden
                >
                  {selected && <Check size={12} />}
                </span>
              </button>
            );
          })}
        </div>
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
            {price == null ? 'Unavailable' : active.type === 'personal' ? 'Add to cart' : `Add to ${activeLabel}`}
          </button>
        )}
      </div>

      {pickOutOfStock && rawPickStore && store && !compact && (
        <p className={styles.storeNotice}>
          {rawPickStore.name} is out of stock · showing {store.name}
        </p>
      )}

      <WatchModal
        open={watchOpen}
        product={product}
        onClose={() => setWatchOpen(false)}
        currentBest={cheapest?.price ?? product.mrp}
      />
    </article>
  );
}
