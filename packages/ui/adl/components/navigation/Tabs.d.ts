/** Abas — alternância entre visões do mesmo contexto. */
export interface TabsProps {
  /** Abas: strings ou {id, label, count?} */
  tabs?: Array<string | { id: string; label: string; count?: number }>;
  active?: string;
  onChange?: (id: string) => void;
  compact?: boolean;
  style?: React.CSSProperties;
}
