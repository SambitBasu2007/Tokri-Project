import { Link } from 'react-router-dom';
import { ShoppingBasket } from 'lucide-react';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brandCol}>
          <p className={styles.brand}>
            <ShoppingBasket size={18} strokeWidth={1.5} aria-hidden /> Tokri
          </p>
          <p className={styles.tagline}>One basket. Six stores. The price you can check.</p>
        </div>
        <nav className={styles.links} aria-label="Footer">
          <Link to="/legal">Privacy &amp; terms</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/watchlist">Watchlist</Link>
          <Link to="/labs">Labs</Link>
        </nav>
        <div className={styles.notes}>
          <p>
            Prices, delivery tracking and price history are <strong>simulated</strong> for this
            demo. They are not live store prices.
          </p>
          <p>
            Product images are retailer packshots kept locally for this demo; the source listing is
            linked from each product page. Packaging and trademarks belong to their owners.
            Geocoding © OpenStreetMap contributors.
          </p>
          <p>© {new Date().getFullYear()} Tokri. Built as a student field project.</p>
        </div>
      </div>
    </footer>
  );
}
