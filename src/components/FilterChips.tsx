import type { ReactNode } from 'react';
import { ChevronDown, X } from 'lucide-react';
import styles from './FilterChips.module.css';

export interface FilterChip {
  key: string;
  label: string;
  active?: boolean;
  chevron?: boolean;
  onClick: () => void;
  icon?: ReactNode;
}

interface FilterChipsProps {
  chips: FilterChip[];
  onClear?: () => void;
  clearLabel?: string;
}

export function FilterChips({ chips, onClear, clearLabel = 'Clear' }: FilterChipsProps) {
  const hasActive = chips.some((chip) => chip.active);
  return (
    <nav className={styles.chips} aria-label="Product filters">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className={`${styles.chip} ${chip.active ? styles.active : ''}`.trim()}
          aria-pressed={chip.active}
          onClick={chip.onClick}
        >
          {chip.icon}
          <span>{chip.label}</span>
          {chip.chevron !== false && <ChevronDown size={14} strokeWidth={1.5} aria-hidden />}
        </button>
      ))}
      {hasActive && onClear && (
        <button type="button" className={`${styles.chip} ${styles.clear}`} onClick={onClear}>
          <X size={14} strokeWidth={1.5} aria-hidden />
          <span>{clearLabel}</span>
        </button>
      )}
    </nav>
  );
}
