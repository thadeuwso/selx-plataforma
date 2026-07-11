/** Busca global — campo do cabeçalho com atalho de teclado. */
export interface GlobalSearchProps {
  /** @default "Buscar em tudo…" */
  placeholder?: string;
  /** @default "Ctrl K" */
  shortcut?: string;
  onSearch?: (query: string) => void;
  /** @default 320 */
  width?: number;
  style?: React.CSSProperties;
}
