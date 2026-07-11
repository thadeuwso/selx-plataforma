/** Paginação — com contexto do total ("1–25 de 312"). */
export interface PaginationProps {
  page?: number;
  pageCount?: number;
  /** Total de registros (habilita "1–25 de 312") */
  total?: number;
  pageSize?: number;
  onChange?: (page: number) => void;
  style?: React.CSSProperties;
}
