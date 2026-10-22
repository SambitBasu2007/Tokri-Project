import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { Product, Store, StoreId } from '../types';
import { minutesLabel, inr } from '../lib/format';
import styles from './StorePicker.module.css';

interface StorePickerProps {
  product: Product;
  /** null when every store is out of stock. */
  value: StoreId | null;
  stores: Store[];
  /** Called when a row is tapped. Selecting never adds to the cart. */
  onChange: (storeId: StoreId) => void;
  label?: string;
  variant?: 'text' | 'compact';
}

interface Row {
  store: Store;
  price: number | null;
}

export function StorePicker({
  product,
  value,
  stores,
  onChange,
  label,
  variant = 'text',
}: StorePickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [focusIndex, setFocusIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const rows: Row[] = stores
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
  const cheapest = rows.find((row) => row.price != null)?.price ?? null;

  const close = useCallback(() => setOpen(false), []);

  // Measure the opener so the desktop popover sits under it.
  useEffect(() => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 340;
    const gap = 6;
    const left = Math.min(Math.max(8, rect.left + rect.width - width), Math.max(8, window.innerWidth - width - 8));
    const height = Math.min(420, rows.length * 52 + 52);
    const below = rect.bottom + gap;
    const top = below + height > window.innerHeight ? Math.max(8, rect.top - gap - height) : below;
    setCoords({ top, left });
  }, [open, rows.length]);

  // Lock the page while the popover/sheet is open and give focus back on close.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
      triggerRef.current?.focus();
    };
  }, [open]);

  // Capture Escape before the cart panel's own document listener sees it, so
  // Esc closes only the picker when it was opened from the cart.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, close]);

  // Start on the selected row (or the cheapest available one).
  useEffect(() => {
    if (!open) return;
    const selected = rows.findIndex((row) => row.price != null && row.store.id === value);
    const firstAvailable = rows.findIndex((row) => row.price != null);
    const index = selected >= 0 ? selected : firstAvailable;
    setFocusIndex(index);
    const frame = window.requestAnimationFrame(() => {
      rowRefs.current[index]?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
    // Re-run only when the picker opens; rows are stable while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const moveFocus = (direction: 1 | -1) => {
    const available = rows
      .map((row, index) => (row.price != null ? index : -1))
      .filter((index) => index >= 0);
    if (!available.length) return;
    const current = available.indexOf(focusIndex);
    const next = available[(current + direction + available.length) % available.length];
    setFocusIndex(next);
    rowRefs.current[next]?.focus();
  };

  const onPopoverKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocus(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(-1);
    }
  };

  const choose = (storeId: StoreId) => {
    onChange(storeId);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${variant === 'compact' ? styles.compact : ''}`.trim()}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {label ?? `Compare ${stores.length} stores`}
      </button>

      {open &&
        createPortal(
          <div
            className={styles.backdrop}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <div
              className={styles.popover}
              role="dialog"
              aria-modal="true"
              aria-label={`Choose a store for ${product.name}`}
              style={
                {
                  '--pop-top': `${coords?.top ?? 0}px`,
                  '--pop-left': `${coords?.left ?? 8}px`,
                } as CSSProperties
              }
              onKeyDown={onPopoverKeyDown}
            >
              <div className={styles.head}>
                <span className={styles.title}>Choose a store</span>
                <button type="button" className={styles.close} onClick={close} aria-label="Close store picker">
                  <X size={16} aria-hidden />
                </button>
              </div>

              <div className={styles.list} role="radiogroup" aria-label="Stores sorted by price">
                {rows.map((row, index) => {
                  const available = row.price != null;
                  const selected = available && row.store.id === value;
                  const isBest = available && cheapest != null && row.price === cheapest;
                  const difference = available && cheapest != null ? row.price! - cheapest : 0;
                  return (
                    <button
                      key={row.store.id}
                      ref={(element) => {
                        rowRefs.current[index] = element;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!available}
                      tabIndex={index === focusIndex ? 0 : -1}
                      className={`${styles.row} ${selected ? styles.rowSelected : ''} ${
                        available ? '' : styles.rowOut
                      }`.trim()}
                      onClick={() => available && choose(row.store.id)}
                      onMouseEnter={() => available && setFocusIndex(index)}
                    >
                      <span className={styles.radio} aria-hidden />
                      <span className={styles.rowMain}>
                        <span className={styles.rowName}>
                          {row.store.name}
                          {isBest && <span className={styles.bestTag}>Best</span>}
                        </span>
                        <span className={styles.eta}>
                          {available ? `${minutesLabel(row.store.deliveryMinutes)} delivery` : 'Out of stock'}
                        </span>
                      </span>
                      <span className={styles.rowPrice}>
                        {available ? inr(row.price!) : '—'}
                        {available && difference > 0 && <span className={styles.diff}>+{inr(difference)}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
