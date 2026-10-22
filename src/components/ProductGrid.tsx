import { SearchX } from 'lucide-react';
import type { Product } from '../types';
import { ProductCard } from './ProductCard';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  onReset?: () => void;
}

export function ProductGrid({ products, loading = false, onReset }: ProductGridProps) {
  if (loading) {
    return (
      <div className={styles.grid} aria-busy="true" aria-label="Loading products">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className={styles.skeletonCard}>
            <Skeleton height="0" className={styles.skeletonImage} />
            <Skeleton height="14px" width="80%" />
            <Skeleton height="12px" width="45%" />
            <Skeleton height="16px" width="60%" />
            <Skeleton height="34px" />
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <EmptyState
        icon={<SearchX size={28} strokeWidth={1.5} aria-hidden />}
        title="No products match"
        action={
          onReset ? (
            <button type="button" className="btn" onClick={onReset}>
              Clear filters
            </button>
          ) : undefined
        }
      >
        Try a shorter search or a different category.
      </EmptyState>
    );
  }

  return (
    <div className={styles.grid}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
