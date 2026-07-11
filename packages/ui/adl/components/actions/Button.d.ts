/**
 * Botão — primário, secundário, sutil ou destrutivo.
 * O rótulo é sempre um verbo na ação ("Publicar vaga").
 * @startingPoint section="Ações" subtitle="Botão ADL em 4 variantes" viewport="700x220"
 */
export interface ButtonProps {
  /** @default "primary" */
  variant?: 'primary' | 'secondary' | 'subtle' | 'destructive';
  /** Densidade @default "default" */
  size?: 'default' | 'compact';
  /** Nome de ícone Lucide (à esquerda do rótulo) */
  icon?: string;
  /** Estado carregando (desabilita e mostra spinner) */
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
