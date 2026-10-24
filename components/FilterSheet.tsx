import { useEffect, useId, useState } from 'react';
import type { Store, StoreId } from '../types';
import { inr, minutesLabel } from '../lib/format';
import { Sheet } from './Sheet';
import styles from './FilterSheet.module.css';

export type Sort = 'relevance' | 'price-asc' | 'price-desc' | 'name' | 'unit';

export interface ListingFilters {
  sort: Sort;
  store: StoreId | 'all';
  delivery: number | null;
  maxPrice: number | null;
}

export const DEFAULT_FILTERS: ListingFilters = {
  sort: 'relevance',
  store: 'all',
  delivery: null,
  maxPrice: null,
};

const SORTS: { value: Sort; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'unit', label: 'Lowest unit price' },
];

const DELIVERY = [10, 15, 30, 60];
const PRICES = [50, 100, 200, 500];

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: ListingFilters;
  stores: Store[];
  onChange: (filters: ListingFilters) => void;
  resultCount: number;
}

export function FilterSheet({ open, onClose, filters, stores, onChange, resultCount }: FilterSheetProps) {
  const baseId = useId();
  const [draft, setDraft] = useState<ListingFilters>(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const reset = () => setDraft(DEFAULT_FILTERS);
  const apply = () => {
    onChange(draft);
    onClose();
  };

  return (
    <Sheet
      open={open}
      title="Filters"
      onClose={onClose}
      footer={
        <div className={styles.footer}>
          <button type="button" className={styles.reset} onClick={reset}>
            Reset
          </button>
          <button type="button" className="btn btn-primary" onClick={apply}>
            Show {resultCount} product{resultCount === 1 ? '' : 's'}
          </button>
        </div>
      }
    >
      <div className={styles.group}>
        <p className={styles.legend}>Sort</p>
        <div className={styles.options} role="radiogroup" aria-label="Sort products">
          {SORTS.map((option) => (
            <label key={option.value} className={styles.option}>
              <input
                type="radio"
                name={`${baseId}-sort`}
                checked={draft.sort === option.value}
                onChange={() => setDraft((current) => ({ ...current, sort: option.value }))}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <p className={styles.legend}>Store</p>
        <div className={styles.options} role="radiogroup" aria-label="Filter by store">
          <label className={styles.option}>
            <input
              type="radio"
              name={`${baseId}-store`}
              checked={draft.store === 'all'}
              onChange={() => setDraft((current) => ({ ...current, store: 'all' }))}
            />
            <span>All stores</span>
          </label>
          {stores.map((store) => (
            <label key={store.id} className={styles.option}>
              <input
                type="radio"
                name={`${baseId}-store`}
                checked={draft.store === store.id}
                onChange={() => setDraft((current) => ({ ...current, store: store.id }))}
              />
              <span>{store.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <p className={styles.legend}>Delivery time</p>
        <div className={styles.pills}>
          <button
            type="button"
            className={`${styles.pill} ${draft.delivery == null ? styles.pillOn : ''}`.trim()}
            aria-pressed={draft.delivery == null}
            onClick={() => setDraft((current) => ({ ...current, delivery: null }))}
          >
            Any
          </button>
          {DELIVERY.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={`${styles.pill} ${draft.delivery === minutes ? styles.pillOn : ''}`.trim()}
              aria-pressed={draft.delivery === minutes}
              onClick={() => setDraft((current) => ({ ...current, delivery: minutes }))}
            >
              {minutesLabel(minutes)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <p className={styles.legend}>Price ceiling</p>
        <div className={styles.pills}>
          <button
            type="button"
            className={`${styles.pill} ${draft.maxPrice == null ? styles.pillOn : ''}`.trim()}
            aria-pressed={draft.maxPrice == null}
            onClick={() => setDraft((current) => ({ ...current, maxPrice: null }))}
          >
            Any
          </button>
          {PRICES.map((price) => (
            <button
              key={price}
              type="button"
              className={`${styles.pill} ${draft.maxPrice === price ? styles.pillOn : ''}`.trim()}
              aria-pressed={draft.maxPrice === price}
              onClick={() => setDraft((current) => ({ ...current, maxPrice: price }))}
            >
              Under {inr(price)}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
