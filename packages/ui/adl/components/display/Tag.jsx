import React from 'react';
import { Icon } from '../foundation/Icon.jsx';

/** Tag — rotulagem removível de conteúdo (habilidades, filtros ativos). Sem significado de estado. */
export function Tag({ children, onRemove, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 'var(--radius-sm)',
      background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)',
      color: 'var(--text-muted)', fontSize: 'var(--type-caption-size)', lineHeight: '16px', whiteSpace: 'nowrap',
      ...style,
    }}>
      {children}
      {onRemove && (
        <button onClick={onRemove} aria-label={`Remover ${typeof children === 'string' ? children : ''}`} style={{
          display: 'inline-flex', border: 'none', background: 'none', padding: 0, margin: 0,
          color: 'var(--text-subtle)', cursor: 'pointer',
        }}>
          <Icon name="x" size={12} />
        </button>
      )}
    </span>
  );
}
