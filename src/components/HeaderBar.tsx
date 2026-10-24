import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, ShoppingCart, Sun, UserRound } from 'lucide-react';
import { useCart } from '../state/CartContext';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../state/ThemeContext';
import { CartSwitcher } from './CartSwitcher';
import { LocationBlock } from './LocationBlock';
import { SearchBar } from './SearchBar';
import styles from './HeaderBar.module.css';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/social', label: 'Community' },
  { to: '/orders', label: 'Orders' },
];

export function HeaderBar({ onOpenCart }: { onOpenCart: () => void }) {
  const { totals } = useCart();
  const { profile, signedIn } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const query = new URLSearchParams(location.search).get('q') ?? '';

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand} aria-label="Tokri home">
          Tokri
        </Link>

        <div className={styles.location}>
          <LocationBlock />
        </div>
        <div className={styles.locationCompact}>
          <LocationBlock compact />
        </div>

        <div className={styles.search}>
          <SearchBar
            initialValue={query}
            onSubmit={(next) => {
              const params = new URLSearchParams(location.search);
              params.delete('theme');
              if (next) params.set('q', next);
              else params.delete('q');
              const target = location.pathname.startsWith('/c/') ? location.pathname : '/search';
              const search = params.toString();
              navigate(search ? `${target}?${search}` : target);
            }}
          />
        </div>

        <nav className={styles.nav} aria-label="Main navigation">
          {NAV.map((item) => {
            const active =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`${styles.navLink} ${active ? styles.navActive : ''}`.trim()}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.actions}>
          <div className={styles.switcher}>
            <CartSwitcher />
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {theme === 'dark' ? (
              <Sun size={18} strokeWidth={1.5} aria-hidden />
            ) : (
              <Moon size={18} strokeWidth={1.5} aria-hidden />
            )}
          </button>
          <Link
            to={signedIn ? '/profile' : '/social'}
            className={styles.iconButton}
            aria-label={signedIn ? 'Account' : 'Sign in'}
            title={signedIn ? profile?.fullName ?? profile?.email ?? 'Account' : 'Sign in'}
          >
            <UserRound size={18} strokeWidth={1.5} aria-hidden />
          </Link>
          <button
            type="button"
            className={styles.cartButton}
            onClick={onOpenCart}
            aria-label={`Open cart, ${totals.itemCount} items`}
          >
            <ShoppingCart size={18} strokeWidth={1.5} aria-hidden />
            <span className={styles.cartLabel}>Cart</span>
            <span className={styles.cartCount}>{totals.itemCount > 99 ? '99+' : totals.itemCount}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
