/** Badge de status — significado fixo por tom; nunca decorativo. */
export interface StatusBadgeProps {
  /** @default "neutral" */
  tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info' | 'brand';
  /** Ponto indicador (cor nunca é o único canal) @default true */
  dot?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
