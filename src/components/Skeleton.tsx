import styles from './ui.module.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ width = '100%', height = '16px', className = '' }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className}`.trim()}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
