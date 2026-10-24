import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCatalog } from '../state/CatalogContext';
import { CATEGORY_ORDER, categoryLabel } from '../lib/catalog';
import { CategoryTile } from '../components/CategoryTile';
import { SearchBar } from '../components/SearchBar';
import styles from './Categories.module.css';

export default function CategoriesPage() {
  const { products, loading } = useCatalog();
  const navigate = useNavigate();

  const categories = CATEGORY_ORDER.map((value) => {
    const items = products.filter((product) => product.category === value);
    return {
      value,
      label: categoryLabel(value),
      products: items.slice(0, 4),
      total: items.length,
    };
  }).filter((category) => category.total > 0);

  return (
    <div className={`page container ${styles.page}`}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Categories</h1>
          <p className={styles.lede}>Every aisle in the Tokri catalog, priced across six stores.</p>
        </div>
        <Link className={styles.all} to="/search">
          All products
          <ArrowRight size={14} strokeWidth={1.5} aria-hidden />
        </Link>
      </div>

      <div className={styles.search}>
        <SearchBar
          onSubmit={(query) =>
            navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search')
          }
        />
      </div>

      {loading && !products.length ? (
        <div className={styles.tiles} aria-busy="true" aria-label="Loading categories">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className={styles.skeleton} />
          ))}
        </div>
      ) : (
        <div className={styles.tiles}>
          {categories.map((category) => (
            <CategoryTile
              key={category.value}
              category={category.value}
              label={category.label}
              products={category.products}
              total={category.total}
            />
          ))}
        </div>
      )}
    </div>
  );
}
