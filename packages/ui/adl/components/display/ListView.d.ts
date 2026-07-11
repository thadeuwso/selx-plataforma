/** Lista — itens verticais {title, description?, meta?} ou renderItem custom. */
export interface ListViewProps {
  items?: Array<{ id?: string | number; title?: string; description?: string; meta?: React.ReactNode }>;
  onItemClick?: (item: any) => void;
  /** Render custom por item */
  renderItem?: (item: any) => React.ReactNode;
  style?: React.CSSProperties;
}
