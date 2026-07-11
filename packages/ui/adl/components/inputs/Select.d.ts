/** Seleção — escolha única em lista curta; para listas longas use Combobox. */
export interface SelectProps {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Opções: strings ou {value, label} */
  options?: Array<string | { value: string; label: string }>;
  placeholder?: string;
  help?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  compact?: boolean;
  id?: string;
  style?: React.CSSProperties;
}
