/** Modal de confirmação — proporcional ao risco; "digitar para confirmar" em ações irreversíveis. */
export interface ConfirmDialogProps {
  open?: boolean;
  title?: string;
  description?: string;
  /** Verbo na ação (ex.: "Excluir vaga") @default "Confirmar" */
  confirmLabel?: string;
  /** @default "Cancelar" */
  cancelLabel?: string;
  destructive?: boolean;
  /** Exigir digitação desta string (fricção deliberada) */
  typeToConfirm?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}
