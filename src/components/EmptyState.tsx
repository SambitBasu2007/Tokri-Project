import type { ReactNode } from 'react';
import styles from './ui.module.css';

interface EmptyStateProps {
  title: string;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, children, icon, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      {icon && <div className={styles.emptyIcon}>{icon}</div>}
      <p className={styles.emptyTitle}>{title}</p>
      {children && <div>{children}</div>}
      {action && <div className={styles.emptyActions}>{action}</div>}
    </div>
  );
}
