/** Barra de progresso determinada, com rótulo e valor. */
export interface ProgressBarProps {
  value?: number;
  /** @default 100 */
  max?: number;
  label?: string;
  /** @default true */
  showValue?: boolean;
  /** @default "brand" */
  tone?: 'brand' | 'success' | 'warning' | 'danger';
  style?: React.CSSProperties;
}
