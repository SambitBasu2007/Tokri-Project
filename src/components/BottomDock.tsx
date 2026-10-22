import { Link } from 'react-router-dom';
import { House, LayoutGrid, Package, ShoppingCart, Users } from 'lucide-react';
import { useCart } from '../state/CartContext';
import styles from './BottomDock.module.css';

interface BottomDockProps {
  onOpenCart: () => void;
}

/**
 * Mobile-only navigation for the main page. Other pages keep the top bar and
 * show an explicit Back link instead, so this dock never floats over content
 * that has its own flow.
 */
export function BottomDock({ onOpenCart }: BottomDockProps) {
  const { totals } = useCart();

  return (
    <nav className={styles.dock} aria-label="Quick navigation">
      <Link to="/" className={`${styles.item} ${styles.active}`} aria-current="page">
        <House size={19} strokeWidth={1.6} aria-hidden />
        <span>Home</span>
      </Link>
      <Link to="/shop" className={styles.item}>
        <LayoutGrid size={19} strokeWidth={1.6} aria-hidden />
        <span>Shop</span>
      </Link>
      <Link to="/social" className={styles.item}>
        <Users size={19} strokeWidth={1.6} aria-hidden />
        <span>Community</span>
      </Link>
      <Link to="/orders" className={styles.item}>
        <Package size={19} strokeWidth={1.6} aria-hidden />
        <span>Orders</span>
      </Link>
      <button type="button" className={styles.item} onClick={onOpenCart} aria-label={`Open cart, ${totals.itemCount} items`}>
        <span className={styles.iconWrap}>
          <ShoppingCart size={19} strokeWidth={1.6} aria-hidden />
          {totals.itemCount > 0 && <span className={styles.badge}>{totals.itemCount > 99 ? '99+' : totals.itemCount}</span>}
        </span>
        <span>Cart</span>
      </button>
    </nav>
  );
}
