/** Grupo de radio — escolha única entre poucas opções visíveis. */
export interface RadioProps {
  /** Rótulo do grupo (legend) */
  label?: string;
  options?: Array<string | { value: string; label: string; help?: string }>;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  style?: React.CSSProperties;
}
