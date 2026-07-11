/** Painel lateral (drawer) — detalhe/edição em contexto. */
export interface DrawerProps {
  open?: boolean;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onClose?: () => void;
  /** @default 420 */
  width?: number;
}
