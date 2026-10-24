import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LayoutGrid, type LucideIcon } from 'lucide-react';
import { useCatalog } from '../state/CatalogContext';
import { CATEGORY_ORDER, categoryLabel } from '../lib/catalog';
import { categoryIcon } from '../lib/categories';
import styles from './CategoryTabs.module.css';

interface CategoryTabsProps {
  /** Category value or null for "All". */
  active?: string | null;
  variant?: 'underline' | 'icons';
  includeAll?: boolean;
  /** When present, tabs render as links. */
  linkTo?: (value: string | null) => string;
  /** Otherwise they call back with the picked value. */
  onSelect?: (value: string | null) => void;
}

export function CategoryTabs({
  active = null,
  variant = 'underline',
  includeAll = true,
  linkTo,
  onSelect,
}: CategoryTabsProps) {
  const { products } = useCatalog();
  const tabsRef = useRef<HTMLElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const present = new Set(products.map((product) => product.category));
  const values = CATEGORY_ORDER.filter((value) => present.has(value));

  useEffect(() => {
    const node = tabsRef.current;
    if (!node) return;
    const update = () => setHasOverflow(node.scrollWidth > node.clientWidth + 1);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    window.addEventListener('resize', update);
    void document.fonts?.ready.then(update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [values.length, variant]);
  const scroll = useCallback((direction: 1 | -1) => {
    const node = tabsRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(240, node.clientWidth * 0.8), behavior: 'smooth' });
  }, []);

  const renderTab = (
    value: string | null,
    label: string,
    Icon: LucideIcon,
  ) => {
    const isActive = value === active;
    const className = `${styles.tab} ${isActive ? styles.active : ''} ${
      variant === 'icons' ? styles.iconTab : ''
    }`.trim();
    const content = (
      <>
        <span className={styles.icon}>
          <Icon size={variant === 'icons' ? 20 : 18} strokeWidth={1.5} aria-hidden />
        </span>
        <span className={styles.label}>{label}</span>
      </>
    );

    if (linkTo) {
      return (
        <Link key={value ?? 'all'} to={linkTo(value)} className={className} aria-current={isActive ? 'page' : undefined}>
          {content}
        </Link>
      );
    }
    return (
      <button
        key={value ?? 'all'}
        type="button"
        className={className}
        aria-pressed={isActive}
        onClick={() => onSelect?.(value)}
      >
        {content}
      </button>
    );
  };

  return (
    <div className={styles.wrap}>
      <nav
        ref={tabsRef}
        className={`${styles.tabs} ${variant === 'icons' ? styles.icons : ''}`.trim()}
        aria-label="Product categories"
      >
        {includeAll && renderTab(null, 'All', LayoutGrid)}
        {values.map((value) => renderTab(value, categoryLabel(value), categoryIcon(value)))}
      </nav>
      {hasOverflow && (
        <div className={styles.arrows} aria-hidden>
          <button type="button" className={styles.arrow} onClick={() => scroll(-1)} tabIndex={-1}>
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <button type="button" className={styles.arrow} onClick={() => scroll(1)} tabIndex={-1}>
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  );
}
