import { Link, useLocation } from 'react-router-dom';
import { House, LayoutGrid, Package, UserRound, Users } from 'lucide-react';
import styles from './BottomNav.module.css';

const ITEMS = [
  { to: '/', label: 'Home', icon: House, match: (path: string) => path === '/' },
  { to: '/categories', label: 'Categories', icon: LayoutGrid, match: (path: string) => path.startsWith('/c/') || path === '/categories' },
  { to: '/social', label: 'Community', icon: Users, match: (path: string) => path.startsWith('/social') },
  { to: '/orders', label: 'Orders', icon: Package, match: (path: string) => path.startsWith('/orders') },
  { to: '/profile', label: 'Profile', icon: UserRound, match: (path: string) => path.startsWith('/profile') },
];

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className={styles.nav} aria-label="Primary">
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`${styles.item} ${active ? styles.active : ''}`.trim()}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={active ? 1.8 : 1.5} aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
