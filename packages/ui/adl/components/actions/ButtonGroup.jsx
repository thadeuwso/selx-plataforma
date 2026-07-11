import React from 'react';

/** Grupo de ações — alinha botões relacionados com espaçamento padrão. Ação primária à direita. */
export function ButtonGroup({ align = 'end', children, style }) {
  return (
    <div role="group" style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: align === 'end' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start', alignItems: 'center', ...style }}>
      {children}
    </div>
  );
}
