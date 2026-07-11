/**
 * Card de pessoa — representação canônica de um humano nos produtos AION.
 * @startingPoint section="Business" subtitle="Card de pessoa em 3 densidades" viewport="700x300"
 */
export interface PersonCardProps {
  name: string;
  /** Cargo/papel ou vaga */
  role?: string;
  /** Status textual (badge) */
  status?: string;
  /** @default "neutral" */
  statusTone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info' | 'brand';
  /** Metadados extras (densidade rich) */
  meta?: string[];
  /** @default "default" */
  density?: 'compact' | 'default' | 'rich';
  onClick?: () => void;
  /** Ações à direita (ActionMenu, botões) */
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}
