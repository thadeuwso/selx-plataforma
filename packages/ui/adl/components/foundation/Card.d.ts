/**
 * Seção/cartão — agrupamento de conteúdo em superfície delimitada.
 * @startingPoint section="Fundação" subtitle="Cartão de conteúdo ADL" viewport="700x260"
 */
export interface CardProps {
  /** Título da seção (subtitle role) */
  title?: string;
  /** Ações do cartão (canto superior direito) */
  actions?: React.ReactNode;
  children?: React.ReactNode;
  /** Padding interno @default var(--space-6) */
  padding?: string;
  style?: React.CSSProperties;
}
