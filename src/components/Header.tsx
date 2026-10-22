import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Moon, Package, Search, ShoppingBasket, ShoppingCart, Sun, UserRound } from 'lucide-react';
import { useCart } from '../state/CartContext';
import { useAuth } from '../state/AuthContext';
import { useWatches } from '../state/WatchesContext';
import { useTheme } from '../state/ThemeContext';
import { CartSwitcher } from './CartSwitcher';
import styles from './Header.module.css';

export function Header({ onOpenCart }: { onOpenCart: () => void }) {
  const { totals } = useCart();
  const { profile, signedIn } = useAuth();
  const { hits } = useWatches();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQuery(location.pathname === '/' ? params.get('q') ?? '' : '');
  }, [location.pathname, location.search]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    // Keep the category/sort filters when searching from the catalog page.
    const next = new URLSearchParams(location.pathname === '/' ? location.search : '');
    if (trimmed) next.set('q', trimmed);
    else next.delete('q');
    const search = next.toString();
    navigate({ pathname: '/', search: search ? `?${search}` : '' });
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand} aria-label="Tokri home">
          <span className={styles.brandMark}>
            <ShoppingBasket size={22} strokeWidth={1.5} aria-hidden />
          </span>
          Tokri
        </Link>

        <form className={styles.search} role="search" onSubmit={submit}>
          <Search size={16} className={styles.searchIcon} aria-hidden />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search milk, atta, tomatoes…"
            aria-label="Search products"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" className={styles.searchSubmit} aria-label="Search">
            <Search size={15} aria-hidden />
          </button>
        </form>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.iconLink} ${styles.iconButton}`}
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
          <Link to="/watchlist" className={styles.iconLink} aria-label={`Watchlist${hits.length ? `, ${hits.length} at target` : ''}`}>
            <Bell size={18} strokeWidth={1.5} aria-hidden />
            {hits.length > 0 && <span className={styles.dot} aria-hidden />}
          </Link>
          <Link to="/orders" className={`${styles.iconLink} ${styles.hideSmall}`} aria-label="Orders">
            <Package size={18} strokeWidth={1.5} aria-hidden />
          </Link>
          <CartSwitcher />
          <Link to="/profile" className={styles.account} aria-label="Account">
            <UserRound size={18} strokeWidth={1.5} aria-hidden />
            <span className={styles.accountName}>
              {signedIn ? profile?.fullName ?? profile?.email?.split('@')[0] ?? 'Account' : 'Sign in'}
            </span>
          </Link>
          <button type="button" className={styles.cartButton} onClick={onOpenCart} aria-label={`Open cart, ${totals.itemCount} items`}>
            <ShoppingCart size={17} strokeWidth={1.5} aria-hidden />
            <span>Cart</span>
            <span className={styles.cartCount}>{totals.itemCount}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
