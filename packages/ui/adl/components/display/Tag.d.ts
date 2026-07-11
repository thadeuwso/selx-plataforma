/** Tag — rotulagem neutra e removível; não comunica estado (ver StatusBadge). */
export interface TagProps {
  children?: React.ReactNode;
  /** Torna a tag removível */
  onRemove?: () => void;
  style?: React.CSSProperties;
}
