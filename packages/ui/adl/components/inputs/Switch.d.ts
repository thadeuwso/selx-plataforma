/** Switch — liga/desliga com efeito imediato. */
export interface SwitchProps {
  label?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  help?: string;
  id?: string;
  style?: React.CSSProperties;
}
