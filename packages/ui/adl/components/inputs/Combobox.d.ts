/** Combobox com busca — escolha única em lista longa, filtrada por digitação. */
export interface ComboboxProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  options?: Array<string | { value: string; label: string }>;
  /** @default "Buscar…" */
  placeholder?: string;
  help?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  compact?: boolean;
  /** Texto do estado vazio @default "Nenhum resultado para esta busca." */
  emptyText?: string;
  id?: string;
  style?: React.CSSProperties;
}
