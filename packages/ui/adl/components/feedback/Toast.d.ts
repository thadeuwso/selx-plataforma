/** Toast — confirmação passageira; "Desfazer" quando a ação permite. */
export interface ToastProps {
  /** @default "success" */
  tone?: 'success' | 'danger' | 'info';
  message: string;
  /** Ação inline (ex.: "Desfazer") */
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  style?: React.CSSProperties;
}
