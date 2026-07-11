/** Estado vazio que ensina — o que é, por quê, e o próximo passo. */
export interface EmptyStateProps {
  /** Ícone Lucide @default "inbox" */
  icon?: string;
  title: string;
  description?: string;
  /** Próximo passo (ex.: <Button>Publicar vaga</Button>) */
  action?: React.ReactNode;
  style?: React.CSSProperties;
}
