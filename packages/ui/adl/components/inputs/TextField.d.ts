/**
 * Campo de texto — entrada de linha única com rótulo, ajuda e erro.
 * @startingPoint section="Entrada" subtitle="Campo de texto ADL" viewport="700x300"
 */
export interface TextFieldProps {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** @default "text" */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  /** Texto de ajuda abaixo do campo */
  help?: string;
  /** Mensagem de erro: o que houve + o que fazer */
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** Densidade compacta (28px) */
  compact?: boolean;
  /** Ícone Lucide à esquerda */
  icon?: string;
  id?: string;
  style?: React.CSSProperties;
}
