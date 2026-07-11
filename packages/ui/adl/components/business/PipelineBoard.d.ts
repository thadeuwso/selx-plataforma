/**
 * Quadro kanban de pipeline — estágios configuráveis, cartões movíveis.
 * @startingPoint section="Business" subtitle="Pipeline de candidatos (kanban)" viewport="1200x480"
 */
export interface PipelineBoardProps {
  /** Estágios: {id, label, cards: [{id, name, role?, score?, confidence?, criteria?}]} */
  stages?: Array<{
    id: string;
    label: string;
    cards?: Array<{ id: string; name: string; role?: string; score?: number; confidence?: string; criteria?: Array<{ label: string; value: number }> }>;
  }>;
  onCardClick?: (card: any, stage: any) => void;
  /** Habilita arrastar cartões entre estágios */
  onMoveCard?: (cardId: string, toStageId: string) => void;
  style?: React.CSSProperties;
}
