/** Card de KPI de RH — turnover, headcount, tempo de contratação… sempre com contexto. */
export interface KpiCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaDirection?: 'up' | 'down';
  /** Ex.: "vs. mês anterior" */
  period?: string;
  footer?: React.ReactNode;
  style?: React.CSSProperties;
}
