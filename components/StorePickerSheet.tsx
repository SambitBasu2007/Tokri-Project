import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { Product, Store, StoreId } from '../types';
import { availablePrices, selectedPrice } from '../lib/pricing';
import { inr } from '../lib/format';
import { Sheet } from './Sheet';
import styles from './StorePickerSheet.module.css';

interface StorePickerSheetProps {
  product: Product;
  /** null when every store is out of stock. */
  value: StoreId | null;
  stores: Store[];
  /** Called when a row is tapped. Selecting never adds to the cart. */
  onChange: (storeId: StoreId) => void;
  label?: string;
  variant?: 'text' | 'compact';
}

export function StorePickerSheet({
  product,
  value,
  stores,
  onChange,
  label,
  variant = 'text',
}: StorePickerSheetProps) {
  const [open, setOpen] = useState(false);
  const cheapest = availablePrices(product)[0];
  const current = value ? selectedPrice(product, value) : null;

  const rows = stores
    .map((store) => {
      const entry = product.prices[store.id];
      return { store, price: entry?.inStock ? entry.price : null };
    })
    .sort((a, b) => {
      if (a.price == null && b.price == null) return a.store.name.localeCompare(b.store.name);
      if (a.price == null) return 1;
      if (b.price == null) return -1;
      return a.price - b.price || a.store.name.localeCompare(b.store.name);
    });

  return (
    <>
      <button
        type="button"
        className={variant === 'compact' ? styles.triggerCompact : styles.triggerText}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          variant === 'compact' && label
            ? `${label} for ${product.name}`
            : `Compare prices for ${product.name}`
        }
      >
        {variant === 'compact' ? (
          <ChevronDown size={16} strokeWidth={1.5} aria-hidden />
        ) : (
          <>
            <span>{label ?? `Compare ${stores.length} stores`}</span>
            <ChevronDown size={14} strokeWidth={1.5} aria-hidden />
          </>
        )}
      </button>

      <Sheet open={open} title="Compare stores" onClose={() => setOpen(false)}>
        <div className={styles.product}>
          <p className={styles.productName}>{product.name}</p>
          <p className={styles.productMeta}>
            {product.weight}
            {current != null ? ` · ${inr(current)} now` : ' · out of stock'}
          </p>
        </div>

        <ul className={styles.rows}>
          {rows.map((row) => {
            const available = row.price != null;
            const selected = available && row.store.id === value;
            const best = available && cheapest != null && row.price === cheapest.price;
            return (
              <li key={row.store.id}>
                <button
                  type="button"
                  className={`${styles.row} ${selected ? styles.rowSelected : ''} ${
                    available ? '' : styles.rowOut
                  }`.trim()}
                  disabled={!available}
                  aria-pressed={selected}
                  aria-label={
                    available
                      ? `Choose ${row.store.name} at ${inr(row.price!)}`
                      : `${row.store.name} is out of stock`
                  }
                  onClick={() => {
                    onChange(row.store.id);
                    setOpen(false);
                  }}
                >
                  <span className={styles.storeCopy}>
                    <span className={styles.storeName}>
                      {row.store.name}
                      {best && <span className={styles.best}>Lowest</span>}
                    </span>
                    <span className={styles.storeMeta}>
                      {row.store.deliveryMinutes} min ·{' '}
                      {row.store.deliveryFee === 0
                        ? 'Free delivery'
                        : `Delivery ${inr(row.store.deliveryFee)}`}
                    </span>
                  </span>
                  <span className={styles.price}>{available ? inr(row.price!) : 'Out'}</span>
                  <span className={styles.check} aria-hidden>
                    {selected && <Check size={15} strokeWidth={2} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className={styles.note}>
          Prices and delivery times are simulated. Choosing a store never changes the quantity in
          your cart.
        </p>
      </Sheet>
    </>
  );
}

/** Backwards-compatible name used by the cart and checkout screens. */
export const StorePicker = StorePickerSheet;

export type { StorePickerSheetProps };
