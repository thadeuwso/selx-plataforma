/** Área de texto — entrada multilinha com rótulo, ajuda e erro. */
export interface TextAreaProps {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** @default 4 */
  rows?: number;
  help?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}
