/** Checkbox — seleção múltipla ou aceite individual. */
export interface CheckboxProps {
  label?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Estado indeterminado (seleção parcial em lote) */
  indeterminate?: boolean;
  help?: string;
  id?: string;
  style?: React.CSSProperties;
}
