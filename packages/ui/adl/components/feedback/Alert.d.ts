/** Alerta embutido — o que houve + o que fazer, no contexto da tela. */
export interface AlertProps {
  /** @default "info" */
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children?: React.ReactNode;
  /** Ação de saída (ex.: botão "Tentar de novo") */
  action?: React.ReactNode;
  onDismiss?: () => void;
  style?: React.CSSProperties;
}
