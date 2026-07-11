/** Modal — decisão ou tarefa curta em sobreposição. */
export interface ModalProps {
  open?: boolean;
  title?: string;
  children?: React.ReactNode;
  /** Ações do rodapé (primária à direita) */
  footer?: React.ReactNode;
  onClose?: () => void;
  /** @default 480 */
  width?: number;
}
