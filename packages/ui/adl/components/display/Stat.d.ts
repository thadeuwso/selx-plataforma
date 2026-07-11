/** KPI/estatística — número sempre com contexto (variação + período). */
export interface StatProps {
  label: string;
  /** Valor formatado no padrão brasileiro */
  value: string;
  /** Variação (ex.: "+12%", "-3 dias") */
  delta?: string;
  /** Direção da seta; inferida do sinal se omitida */
  deltaDirection?: 'up' | 'down';
  /** Período de comparação (ex.: "vs. mês anterior") */
  period?: string;
  style?: React.CSSProperties;
}
