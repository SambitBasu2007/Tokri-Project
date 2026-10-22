import { useMemo } from 'react';
import type { PricePoint, Product, Store, StoreId } from '../types';
import { availablePrices } from '../lib/pricing';
import { inr } from '../lib/format';
import styles from './PriceChart.module.css';

interface PriceChartProps {
  product: Product;
  stores: Store[];
  points: PricePoint[];
  selectedStore: StoreId | null;
  onSelectStore: (storeId: StoreId) => void;
}

const DASHES = ['', '6 3', '2 3', '8 4', '1 3', '4 2'];
const WIDTH = 720;
const HEIGHT = 260;
const PAD = { left: 46, right: 12, top: 12, bottom: 26 };

export function PriceChart({ product, stores, points, selectedStore, onSelectStore }: PriceChartProps) {
  const cheapest = availablePrices(product)[0]?.storeId ?? null;

  const chart = useMemo(() => {
    if (!points.length) return null;
    const times = points.map((point) => new Date(point.recordedAt).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeSpan = Math.max(1, maxTime - minTime);
    const prices = points.map((point) => point.price);
    let minPrice = Math.min(...prices);
    let maxPrice = Math.max(...prices);
    if (minPrice === maxPrice) {
      minPrice = Math.max(0, minPrice - 1);
      maxPrice += 1;
    }
    const pad = (maxPrice - minPrice) * 0.12;
    minPrice = Math.max(0, minPrice - pad);
    maxPrice += pad;

    const x = (iso: string) =>
      PAD.left +
      ((new Date(iso).getTime() - minTime) / timeSpan) * (WIDTH - PAD.left - PAD.right);
    const y = (price: number) =>
      PAD.top + ((maxPrice - price) / (maxPrice - minPrice)) * (HEIGHT - PAD.top - PAD.bottom);

    const series = stores.flatMap((store) => {
      const storePoints = points
        .filter((point) => point.storeId === store.id)
        .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
      if (!storePoints.length) return [];
      const path = storePoints
        .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.recordedAt).toFixed(1)} ${y(point.price).toFixed(1)}`)
        .join(' ');
      return [{ store, path, last: storePoints[storePoints.length - 1] }];
    });

    const gridLines = Array.from({ length: 4 }, (_, index) => {
      const price = minPrice + ((maxPrice - minPrice) * index) / 3;
      return { price, y: y(price) };
    });

    return { x, y, series, gridLines, minTime, maxTime };
  }, [points, stores]);

  if (!chart || !chart.series.length) {
    return <p className={styles.empty}>No price history yet for this product.</p>;
  }

  const dateLabel = (time: number) =>
    new Date(time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div className={styles.wrap}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={styles.chart}
        role="img"
        aria-label={`Simulated price history for ${product.name} across ${chart.series.length} stores`}
      >
        {chart.gridLines.map((line) => (
          <g key={line.price}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={line.y}
              y2={line.y}
              stroke="var(--line)"
              strokeWidth={1}
            />
            <text x={PAD.left - 8} y={line.y + 3} textAnchor="end" className={styles.axisText}>
              {inr(line.price)}
            </text>
          </g>
        ))}
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={HEIGHT - PAD.bottom}
          y2={HEIGHT - PAD.bottom}
          stroke="var(--line-strong)"
          strokeWidth={1}
        />
        <text x={PAD.left} y={HEIGHT - 8} className={styles.axisText}>
          {dateLabel(chart.minTime)}
        </text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 8} textAnchor="end" className={styles.axisText}>
          {dateLabel(chart.maxTime)}
        </text>

        {chart.series.map(({ store, path }, index) => {
          const isCheapest = store.id === cheapest;
          const isSelected = store.id === selectedStore;
          return (
            <path
              key={store.id}
              d={path}
              fill="none"
              stroke={isCheapest ? 'var(--accent)' : isSelected ? 'var(--ink)' : 'var(--ink-3)'}
              strokeWidth={isCheapest || isSelected ? 1.75 : 1}
              strokeDasharray={isCheapest || isSelected ? undefined : DASHES[index % DASHES.length]}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              <title>{`${store.name}: ${inr(chart.series[index].last.price)}`}</title>
            </path>
          );
        })}
      </svg>

      <div className={styles.legend}>
        {chart.series.map(({ store, last }, index) => (
          <button
            key={store.id}
            type="button"
            className={`${styles.legendItem} ${store.id === selectedStore ? styles.legendActive : ''}`}
            onClick={() => onSelectStore(store.id)}
            aria-pressed={store.id === selectedStore}
          >
            <span
              className={styles.swatch}
              style={{
                borderTopColor:
                  store.id === cheapest
                    ? 'var(--accent)'
                    : store.id === selectedStore
                      ? 'var(--ink)'
                      : 'var(--ink-3)',
                borderTopStyle: store.id === cheapest || store.id === selectedStore ? 'solid' : 'dashed',
              }}
              aria-hidden
            />
            <span className={styles.legendName}>{store.name}</span>
            <span className={styles.legendPrice}>{inr(last.price)}</span>
            {store.id === cheapest && <span className={styles.legendTag}>cheapest</span>}
            <span className="visually-hidden">{`line ${index + 1}`}</span>
          </button>
        ))}
      </div>
      <p className={styles.note}>Simulated prices — generated demo data, not live store prices.</p>
    </div>
  );
}
