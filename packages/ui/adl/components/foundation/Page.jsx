import React from 'react';

/** Página: cabeçalho de contexto (título, descrição, ações) + área de conteúdo. */
export function Page({ title, description, breadcrumb, actions, children, maxWidth = 'var(--container-max)' }) {
  return (
    <div style={{ padding: 'var(--space-6) var(--space-8)', maxWidth, margin: '0 auto', width: '100%' }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        {breadcrumb}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', marginTop: breadcrumb ? 'var(--space-2)' : 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 'var(--type-display-size)', lineHeight: 'var(--type-display-line)', fontWeight: 'var(--type-display-weight)', color: 'var(--text-strong)', letterSpacing: '-0.01em' }}>{title}</h1>
            {description && <p style={{ margin: 'var(--space-1) 0 0', color: 'var(--text-muted)', maxWidth: 'var(--measure-reading)' }}>{description}</p>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>{actions}</div>}
        </div>
      </header>
      {children}
    </div>
  );
}
