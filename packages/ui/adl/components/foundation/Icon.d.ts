/**
 * Ícone Lucide — a família única de ícones do ADL.
 */
export interface IconProps {
  /** Nome do ícone em kebab-case (ex.: "search", "chevron-down") */
  name: string;
  /** Tamanho em px @default 16 */
  size?: 16 | 20 | 24 | number;
  /** Rótulo acessível; omitir quando decorativo */
  label?: string;
  style?: React.CSSProperties;
}
