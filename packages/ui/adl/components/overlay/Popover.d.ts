/** Popover — conteúdo leve ancorado a um gatilho. */
export interface PopoverProps {
  /** Elemento gatilho (botão, badge...) */
  trigger: React.ReactNode;
  children?: React.ReactNode;
  /** @default "bottom" */
  position?: 'bottom' | 'top';
  /** @default 280 */
  width?: number;
}
