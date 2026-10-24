import { ChevronRight, ImageOff } from 'lucide-react';
import { useCatalog } from '../state/CatalogContext';
import { useCart } from '../state/CartContext';
import { inr } from '../lib/format';
import styles from './ViewCartPill.module.css';

export function ViewCartPill({ onOpenCart }: { onOpenCart: () => void }) {
  const { items, totals } = useCart();
  const { productById } = useCatalog();

  if (!items.length) return null;

  const latest = items[items.length - 1];
  const product = productById(latest.productId);
  const label = `${totals.itemCount} item${totals.itemCount === 1 ? '' : 's'} · ${inr(totals.total)}`;

  return (
    <button
      type="button"
      className={styles.pill}
      onClick={onOpenCart}
      aria-label={`View cart, ${label}`}
    >
      <span className={styles.fill} aria-hidden />
      <span className={styles.content}>
        <span className={styles.thumb} aria-hidden>
          {product?.imageUrl ? (
            <img src={product.imageUrl} alt="" loading="lazy" decoding="async" />
          ) : (
            <ImageOff size={15} strokeWidth={1.5} />
          )}
        </span>
        <span className={styles.copy}>
          <span className={styles.title}>View cart</span>
          <span className={styles.meta}>{label}</span>
        </span>
        <span className={styles.chevron} aria-hidden>
          <ChevronRight size={16} strokeWidth={1.75} />
        </span>
      </span>
    </button>
  );
}
