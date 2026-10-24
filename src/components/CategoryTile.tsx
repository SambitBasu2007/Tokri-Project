import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';
import type { Product } from '../types';
import { categoryIcon } from '../lib/categories';
import styles from './CategoryTile.module.css';

interface CategoryTileProps {
  category: string;
  label: string;
  products: Product[];
  total: number;
}

function Thumb({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  if (!product.imageUrl || failed) {
    return (
      <span className={styles.thumbFallback}>
        <ImageOff size={16} strokeWidth={1.25} aria-hidden />
      </span>
    );
  }
  return (
    <img
      src={product.imageUrl}
      alt=""
      className={styles.thumb}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function CategoryTile({ category, label, products, total }: CategoryTileProps) {
  const shown = products.slice(0, 4);
  const CategoryIcon = categoryIcon(category);

  return (
    <Link to={`/c/${category}`} className={styles.tile} aria-label={`${label}, ${total} products`}>
      <span className={styles.mosaic}>
        {Array.from({ length: 4 }, (_, index) => {
          const product = shown[index];
          return (
            <span key={product?.id ?? `empty-${index}`} className={styles.cell}>
              {product ? (
                <Thumb product={product} />
              ) : (
                <span className={styles.thumbFallback}>
                  <CategoryIcon size={18} strokeWidth={1.25} aria-hidden />
                </span>
              )}
            </span>
          );
        })}
      </span>
      <span className={styles.label}>{label}</span>
    </Link>
  );
}
