import { useCallback, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './HScroller.module.css';

interface HScrollerProps {
  ariaLabel: string;
  children: ReactNode;
  /** Keyboard users can still scroll the region when the arrows are hidden. */
  arrows?: boolean;
}

export function HScroller({ ariaLabel, children, arrows = true }: HScrollerProps) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: 1 | -1) => {
    const node = ref.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(240, node.clientWidth * 0.8), behavior: 'smooth' });
  }, []);

  return (
    <div className={styles.wrap}>
      <div
        ref={ref}
        className={styles.scroller}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
      >
        {children}
      </div>
      {arrows && (
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
