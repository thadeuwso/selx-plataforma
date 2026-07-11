/** Indicador de score com explicação — origem, critérios e confiança; nunca número seco. */
export interface ScoreIndicatorProps {
  value: number;
  /** @default 100 */
  max?: number;
  /** @default "Match" */
  label?: string;
  /** Grau de confiança declarado (ex.: "alta", "média — poucos dados") */
  confidence?: string;
  /** Critérios usados: {label, value 0–100} */
  criteria?: Array<{ label: string; value: number }>;
  /** @default "default" */
  size?: 'compact' | 'default';
  style?: React.CSSProperties;
}
