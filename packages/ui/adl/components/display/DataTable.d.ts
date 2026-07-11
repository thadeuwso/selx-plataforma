/**
 * Tabela de dados — o componente mais crítico da família AION.
 * @startingPoint section="Exibição" subtitle="Tabela de dados ADL" viewport="900x420"
 */
export interface DataTableProps {
  /** Colunas: {key, label, sortable?, numeric?, align?, render?(row)} */
  columns?: Array<{ key: string; label: string; sortable?: boolean; numeric?: boolean; align?: 'left' | 'right' | 'center'; render?: (row: any) => React.ReactNode }>;
  rows?: any[];
  /** Densidade compacta (linhas 36px) para operação intensa */
  compact?: boolean;
  /** Seleção em lote com checkboxes */
  selectable?: boolean;
  onRowClick?: (row: any) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string, dir: 'asc' | 'desc') => void;
  /** Campo usado como chave @default "id" */
  rowKey?: string;
  selected?: Array<string | number>;
  onSelectionChange?: (keys: Array<string | number>) => void;
  /** Conteúdo do estado vazio (usar EmptyState) */
  emptyState?: React.ReactNode;
}
