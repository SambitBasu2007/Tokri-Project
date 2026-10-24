import type { ReactNode } from 'react';
import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  id?: string;
}

export function SectionHeader({ title, subtitle, action, id }: SectionHeaderProps) {
  return (
    <div className={styles.head}>
      <div className={styles.copy}>
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
