import { useEffect, useState } from 'react';
import type { Product, StoreId } from '../types';
import { inr } from '../lib/format';
import { useWatches } from '../state/WatchesContext';
import { Modal } from './Modal';
import styles from './WatchModal.module.css';

interface WatchModalProps {
  open: boolean;
  product: Product;
  onClose: () => void;
  currentBest: number;
  storeId?: StoreId | null;
}

export function WatchModal({ open, product, onClose, currentBest, storeId = null }: WatchModalProps) {
  const { addWatch, watchFor, removeWatch } = useWatches();
  const existing = watchFor(product.id);
  const suggested = Math.max(1, Math.floor(currentBest * 0.9));
  const [target, setTarget] = useState(String(existing?.targetPrice ?? suggested));

  useEffect(() => {
    if (open) setTarget(String(existing?.targetPrice ?? Math.max(1, Math.floor(currentBest * 0.9))));
  }, [open, existing?.targetPrice, currentBest]);

  const value = Number(target);
  const valid = Number.isFinite(value) && value > 0;

  return (
    <Modal open={open} title={`Watch ${product.name}`} onClose={onClose}>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid) return;
          void addWatch(product.id, storeId, value);
          onClose();
        }}
      >
        <p className={styles.current}>
          Current best: <strong>{inr(currentBest)}</strong>
        </p>
        <label className={styles.label} htmlFor="watch-target">
          Tell me when it reaches
        </label>
        <div className={styles.inputRow}>
          <span className={styles.rupee}>₹</span>
          <input
            id="watch-target"
            className={styles.input}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
        </div>
        <p className={styles.hint}>
          Default is 10% below today&apos;s best. Alerts are checked in this browser when the app
          opens; email alerts are not built yet.
        </p>
        <p className={styles.hint}>
          Alert on: <strong>{storeId ? storeId : 'any store'}</strong>. Prices are simulated in this
          demo.
        </p>
        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            Save watch
          </button>
          {existing && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                void removeWatch(existing);
                onClose();
              }}
            >
              Remove watch
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
