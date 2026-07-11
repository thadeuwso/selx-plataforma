/** Tooltip — complemento breve em hover/foco. */
export interface TooltipProps {
  content: string;
  /** @default "top" */
  position?: 'top' | 'bottom' | 'left' | 'right';
  children?: React.ReactNode;
}
