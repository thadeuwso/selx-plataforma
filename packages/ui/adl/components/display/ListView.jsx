import React from 'react';

/** Lista — itens verticais com conteúdo à esquerda e meta/ações à direita. */
export function ListView({ items = [], onItemClick, renderItem, style }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', ...style }}>
      {items.map((item, i) => (
        <li key={item.id !== undefined ? item.id : i}
          onClick={onItemClick ? () => onItemClick(item) : undefined}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)',
            padding: 'var(--space-3) var(--space-2)',
            borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            cursor: onItemClick ? 'pointer' : undefined,
            borderRadius: 'var(--radius-sm)',
            transition: 'background var(--duration-instant) var(--ease-standard)',
          }}
          onMouseEnter={(e) => { if (onItemClick) e.currentTarget.style.background = 'var(--surface-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
          {renderItem ? renderItem(item) : (
            <>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--type-body-size)', color: 'var(--text-body)', fontWeight: 'var(--weight-medium)' }}>{item.title}</div>
                {item.description && <div style={{ fontSize: 'var(--type-support-size)', color: 'var(--text-muted)' }}>{item.description}</div>}
              </div>
              {item.meta && <div style={{ flexShrink: 0, fontSize: 'var(--type-support-size)', color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>{item.meta}</div>}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
