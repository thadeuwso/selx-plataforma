/** Página — cabeçalho de contexto (título, descrição, ações) + conteúdo. */
export interface PageProps {
  title: string;
  description?: string;
  /** Breadcrumb (componente de navegação) acima do título */
  breadcrumb?: React.ReactNode;
  /** Ações primárias da página */
  actions?: React.ReactNode;
  /** Largura máxima @default var(--container-max) */
  maxWidth?: string;
  children?: React.ReactNode;
}
