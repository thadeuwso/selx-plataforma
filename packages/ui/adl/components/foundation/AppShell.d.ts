/**
 * Estrutura-mestre de aplicação AION — nav lateral fixa (240px) + área de trabalho.
 * Zonas estáveis: o usuário nunca "procura" onde ficam as ações.
 */
export interface AppShellProps {
  /** Nome do produto (marca em tipografia pura) @default "SelX" */
  product?: string;
  /** Tenant/empresa ativa — indicação permanente do contexto */
  tenant?: string;
  /** Itens de navegação: {id, label, icon} ou {section} para agrupadores */
  nav?: Array<{ id?: string; label?: string; icon?: string; section?: string }>;
  /** id do item ativo */
  activeItem?: string;
  onNavigate?: (id: string) => void;
  /** Cabeçalho de contexto (ex.: <Page> header) */
  headerContent?: React.ReactNode;
  /** Usuário logado {name, role} */
  user?: { name: string; role?: string };
  children?: React.ReactNode;
}
