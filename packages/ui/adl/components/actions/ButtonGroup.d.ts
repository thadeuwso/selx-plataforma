/** Grupo de ações — botões relacionados; primária sempre à direita. */
export interface ButtonGroupProps {
  /** @default "end" */
  align?: 'start' | 'center' | 'end';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
