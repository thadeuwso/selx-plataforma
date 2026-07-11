/** Divisor — separação explícita quando o espaço não basta. */
export interface DividerProps {
  /** Margem ao redor @default var(--space-4) */
  spacing?: string;
  /** Orientação vertical (para toolbars) @default false */
  vertical?: boolean;
  style?: React.CSSProperties;
}
