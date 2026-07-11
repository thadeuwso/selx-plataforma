import React from 'react';

/** Cartão/seção: fundo default, borda sutil 1px, raio 8px. */
export function Card({ title, actions, children, padding = 'var(--space-6)', style }) {
  return (
    <section style={{
      background: 'var(--surface-default)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--elevation-raised)',
      ...style,
    }}>
      {(title || actions) && (
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 'var(--space-4)', padding: `var(--space-4) ${padding} 0`,
        }}>
          <h3 style={{
            margin: 0, fontSize: 'var(--type-subtitle-size)', lineHeight: 'var(--type-subtitle-line)',
            fontWeight: 'var(--type-subtitle-weight)', color: 'var(--text-strong)',
          }}>{title}</h3>
          {actions && <div style={{ display: 'flex', gap: 'var(--space-2)' }}>{actions}</div>}
        </header>
      )}
      <div style={{ padding }}>{children}</div>
    </section>
  );
}
