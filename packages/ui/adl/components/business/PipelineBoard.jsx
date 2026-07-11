import React from 'react';
import { PersonCard } from './PersonCard.jsx';
import { ScoreIndicator } from './ScoreIndicator.jsx';

/** Quadro kanban de pipeline — estágios configuráveis, cartões de candidato, herdeiro do pipeline do SelX 1.0. */
export function PipelineBoard({ stages = [], onCardClick, onMoveCard, style }) {
  const [dragging, setDragging] = React.useState(null);
  return (
    <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 'var(--space-2)', ...style }}>
      {stages.map((stage) => (
        <div key={stage.id}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => { if (dragging && onMoveCard) onMoveCard(dragging, stage.id); setDragging(null); }}
          style={{
            width: 280, flexShrink: 0,
            background: 'var(--surface-sunken)', borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-2)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-2) var(--space-3)' }}>
            <span style={{ fontSize: 'var(--type-support-size)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-body)' }}>{stage.label}</span>
            <span style={{ fontSize: 'var(--type-caption-size)', color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums', background: 'var(--surface-default)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-full)', padding: '0 7px', lineHeight: '16px' }}>{(stage.cards || []).length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minHeight: 40 }}>
            {(stage.cards || []).map((card) => (
              <div key={card.id} draggable={!!onMoveCard}
                onDragStart={() => setDragging(card.id)}
                style={{ cursor: onMoveCard ? 'grab' : undefined, opacity: dragging === card.id ? 0.5 : 1 }}>
                <PersonCard
                  name={card.name} role={card.role} density="compact"
                  onClick={onCardClick ? () => onCardClick(card, stage) : undefined}
                  actions={card.score !== undefined ? <ScoreIndicator value={card.score} size="compact" confidence={card.confidence} criteria={card.criteria} /> : undefined}
                />
              </div>
            ))}
            {(stage.cards || []).length === 0 && (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center', fontSize: 'var(--type-caption-size)', color: 'var(--text-subtle)', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                Nenhum candidato neste estágio
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
