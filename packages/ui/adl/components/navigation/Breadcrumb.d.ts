/** Breadcrumb — trilha de contexto. */
export interface BreadcrumbProps {
  items?: Array<{ label: string; onClick?: () => void }>;
  style?: React.CSSProperties;
}
