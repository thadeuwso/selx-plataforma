import React from 'react';
import { Icon } from '../foundation/Icon.jsx';

/** Breadcrumb — trilha de contexto acima do título da página. */
export function Breadcrumb({ items = [], style }) {
  return (
    <nav aria-label="Trilha de navegação" style={style}>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--type-support-size)' }}>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              {i > 0 && <Icon name="chevron-right" size={12} style={{ color: 'var(--text-disabled)' }} />}
              {last || !item.onClick ? (
                <span aria-current={last ? 'page' : undefined} style={{ color: last ? 'var(--text-body)' : 'var(--text-subtle)' }}>{item.label}</span>
              ) : (
                <button onClick={item.onClick} style={{ border: 'none', background: 'none', padding: 0, fontFamily: 'var(--font-sans)', fontSize: 'inherit', color: 'var(--text-subtle)', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-body)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-subtle)'}>
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
