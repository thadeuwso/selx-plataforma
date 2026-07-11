/** Menu de ações — ações contextuais atrás de um gatilho "…". */
export interface ActionMenuProps {
  /** Itens {label, icon?, destructive?, onSelect?} ou "-" para divisor */
  items?: Array<{ label: string; icon?: string; destructive?: boolean; onSelect?: () => void } | '-'>;
  /** Rótulo acessível do gatilho @default "Mais ações" */
  label?: string;
  /** Ícone do gatilho @default "ellipsis" */
  icon?: string;
  /** Densidade compacta (28px) */
  compact?: boolean;
}
