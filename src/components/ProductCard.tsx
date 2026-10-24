import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Heart, ImageOff, Minus, Plus } from 'lucide-react';
import type { Product } from '../types';
import { availablePrices, selectedPrice } from '../lib/pricing';
import { MAX_QUANTITY } from '../lib/cart';
import { inr, minutesLabel } from '../lib/format';
import { useCatalog } from '../state/CatalogContext';
import { useCart } from '../state/CartContext';
import { useWatches } from '../state/WatchesContext';
import { StorePickerSheet } from './StorePickerSheet';
import { WatchModal } from './WatchModal';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
  /** Rails keep the same anatomy; this only drops the secondary price note. */
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const { stores } = useCatalog();
  const { add, quantityOf, itemFor, setQty, active, activeLabel, selectedStore, storeFor, selectStore } = useCart();
  const { watchFor } = useWatches();
  const [imageFailed, setImageFailed] = useState(false);
  const [watchOpen, setWatchOpen] = useState(false);

  const prices = availablePrices(product);
  const cheapest = prices[0] ?? null;
  const cheapestStore = cheapest
    ? stores.find((store) => store.id === cheapest.storeId) ?? null
    : null;
  const quantity = quantityOf(product.id);
  const item = itemFor(product.id);
  const watch = watchFor(product.id);

  const storeId = storeFor(product.id);
  const store = stores.find((candidate) => candidate.id === storeId) ?? null;
  const price = storeId ? selectedPrice(product, storeId) : null;
  const displayPrice = price ?? product.mrp;
  const isBest = Boolean(cheapest && storeId === cheapest.storeId);
  const shortWeight = compactWeight(product.weight);
  const addTarget = active.type === 'personal' ? 'cart' : activeLabel;
  const rawPick = selectedStore[product.id];
  const rawPickStore = rawPick ? stores.find((candidate) => candidate.id === rawPick) : null;
  const pickOutOfStock = Boolean(
    rawPickStore && price != null && selectedPrice(product, rawPickStore.id) == null,
  );

  return (
    <article className={`${styles.card} ${quantity > 0 ? styles.inCart : ''}`.trim()}>
      <div className={styles.media}>
        <Link
          to={`/product/${product.id}`}
          className={styles.imageBox}
          aria-label={`View ${product.name}`}
          tabIndex={-1}
        >
          {product.imageUrl && !imageFailed ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className={`${styles.image} ${price == null ? styles.imageOut : ''}`.trim()}
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className={styles.placeholder}>
              <ImageOff size={20} strokeWidth={1.25} aria-hidden />
              <span>{product.name}</span>
            </span>
          )}
        </Link>

        <button
          type="button"
          className={`${styles.heart} ${watch ? styles.heartOn : ''}`.trim()}
          onClick={() => setWatchOpen(true)}
          aria-label={watch ? `Edit price watch for ${product.name}` : `Watch the price of ${product.name}`}
          title={watch ? `Watching for ${inr(watch.targetPrice)}` : 'Watch this price'}
        >
          <Heart
            size={15}
            strokeWidth={1.5}
            fill={watch ? 'currentColor' : 'none'}
            aria-hidden
          />
        </button>

        <div className={styles.controls}>
          <span className={styles.weight} title={product.weight}>
            {shortWeight}
          </span>
          {quantity > 0 && item ? (
            <div className={styles.stepper}>
              <button
                type="button"
                onClick={() => void setQty(item, item.quantity - 1)}
                aria-label={`Decrease ${product.name} quantity`}
              >
                <Minus size={13} strokeWidth={2} aria-hidden />
              </button>
              <span className={styles.count} aria-live="polite" aria-label={`${quantity} in cart`}>
                {quantity}
              </span>
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
                <Plus size={13} strokeWidth={2} aria-hidden />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.add}
              disabled={price == null}
              onClick={() => void add(product.id)}
              title={price == null ? 'Out of stock' : `Add to ${addTarget}`}
              aria-label={
                price == null ? `${product.name} is out of stock` : `Add ${product.name} to ${addTarget}`
              }
            >
              {price == null ? 'Out' : 'Add'}
            </button>
          )}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.priceRow}>
          <span className={styles.price}>{inr(displayPrice)}</span>
          {product.mrp > displayPrice && <span className={styles.mrp}>{inr(product.mrp)}</span>}
        </div>

        <h3 className={styles.name}>
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <Clock size={12} strokeWidth={1.5} aria-hidden />
            {store ? minutesLabel(store.deliveryMinutes) : 'Unavailable'}
          </span>
          {storeId && (
            <span className={styles.metaDesktop}>
              <StorePickerSheet
                product={product}
                value={storeId}
                stores={stores}
                onChange={(next) => void selectStore(product.id, next)}
                variant="text"
              />
            </span>
          )}
        </div>

        <div className={styles.noteSlot}>
          {!compact && cheapest && !isBest && cheapestStore && (
            <p className={styles.cheapest}>
              Lowest {inr(cheapest.price)} at {cheapestStore.name}
            </p>
          )}

          {pickOutOfStock && rawPickStore && store && !compact && (
            <p className={styles.cheapest}>
              {rawPickStore.name} is out of stock · showing {store.name}
            </p>
          )}
        </div>
      </div>

      <WatchModal
        open={watchOpen}
        product={product}
        onClose={() => setWatchOpen(false)}
        currentBest={cheapest?.price ?? product.mrp}
      />
    </article>
  );
}

/** Keep the image chip short enough for a 100 px mobile card. */
function compactWeight(weight: string): string {
  const compact = weight
    .replace(
      /\s+(?:pouch|packet|pack|block|bottle|jar|can|refill|carton|cup|tub|box|tray|sachet|tetra\s+pack|tetra)+\s*$/i,
      '',
    )
    .replace(/\s*x\s*/gi, '×')
    .replace(/\s+/g, ' ')
    .trim();
  return compact || weight;
}
