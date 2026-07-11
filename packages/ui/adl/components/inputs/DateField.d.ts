/** Campo de data — padrão brasileiro (dd/mm/aaaa). */
export interface DateFieldProps {
  label?: string;
  /** ISO yyyy-mm-dd */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  help?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  compact?: boolean;
  min?: string;
  max?: string;
  id?: string;
  style?: React.CSSProperties;
}
