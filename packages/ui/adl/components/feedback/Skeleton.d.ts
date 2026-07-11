/** Skeleton — placeholder de carregamento com shimmer discreto. */
export interface SkeletonProps {
  /** @default "100%" */
  width?: string | number;
  /** @default 16 */
  height?: number;
  /** Círculo (avatar) */
  circle?: boolean;
  /** Número de linhas @default 1 */
  lines?: number;
  style?: React.CSSProperties;
}
