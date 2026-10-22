import { useEffect, useState } from 'react';
import type { Order, Shipment } from '../types';
import { useCatalog } from '../state/CatalogContext';
import { elapsedMinutes, minutesRemaining, riderProgress, stageFor, stageIndex, STAGE_LABELS, STAGE_ORDER } from '../lib/delivery';
import styles from './OrderTracker.module.css';

interface OrderTrackerProps {
  order: Order;
  shipment: Shipment;
  offset: number;
}

export function OrderTracker({ order, shipment, offset }: OrderTrackerProps) {
  const { stores } = useCatalog();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const store = stores.find((entry) => entry.id === shipment.storeId);
  const elapsed = elapsedMinutes(order.createdAt, now, offset);
  const stage = stageFor(elapsed, shipment.etaMinutes);
  const currentIndex = stageIndex(stage);
  const remaining = minutesRemaining(elapsed, shipment.etaMinutes);
  const progress = riderProgress(elapsed, shipment.etaMinutes);
  const deliveredAt = new Date(
    new Date(order.createdAt).getTime() + shipment.etaMinutes * 60000,
  ).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  return (
    <section className={styles.tracker} aria-label={`${store?.name ?? shipment.storeId} delivery`}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.store}>{store?.name ?? shipment.storeId}</h3>
          <p className={styles.meta}>
            {shipment.etaMinutes} min ETA · {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(shipment.subtotal)}
          </p>
        </div>
        <p className={styles.status} aria-live="polite">
          {stage === 'delivered' ? `Delivered at ${deliveredAt}` : `${STAGE_LABELS[stage]} · ${remaining} min left`}
        </p>
      </div>

      <ol className={styles.steps}>
        {STAGE_ORDER.map((step, index) => (
          <li
            key={step}
            className={`${styles.step} ${index <= currentIndex ? styles.stepDone : ''} ${
              index === currentIndex ? styles.stepCurrent : ''
            }`}
          >
            <span className={styles.marker} aria-hidden />
            <span className={styles.stepLabel}>{STAGE_LABELS[step]}</span>
          </li>
        ))}
      </ol>

      <div className={styles.progressWrap} aria-hidden>
        <div className={styles.progress} style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>

      <p className={styles.demoNote}>Simulated tracking — demo only. No rider is actually moving.</p>
    </section>
  );
}
