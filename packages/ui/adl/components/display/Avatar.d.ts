/** Avatar — foto ou iniciais em círculo. */
export interface AvatarProps {
  /** Nome completo (gera iniciais e aria-label) */
  name?: string;
  src?: string;
  /** @default "md" (24/32/40/56 ou número) */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  style?: React.CSSProperties;
}
