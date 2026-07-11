import React from 'react';
import { Icon } from '../foundation/Icon.jsx';

/** Paginação — navegação de páginas com contexto do total. */
export function Pagination({ page = 1, pageCount = 1, total, pageSize, onChange, style }) {
  const btn = (disabled) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 'var(--control-height-compact)', height: 'var(--control-height-compact)',
    border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
    background: 'var(--surface-default)', color: disabled ? 'var(--text-disabled)' : 'var(--text-muted)',
    cursor: disabled ? 'not-allowed' : 'pointer',
  });
  const from = total !== undefined && pageSize ? (page - 1) * pageSize + 1 : null;
  const to = total !== undefined && pageSize ? Math.min(page * pageSize, total) : null;
  return (
    <nav aria-label="Paginação" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', ...style }}>
      <span style={{ fontSize: 'var(--type-support-size)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
        {from !== null ? `${from}–${to} de ${total.toLocaleString('pt-BR')}` : `Página ${page} de ${pageCount}`}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <button aria-label="Página anterior" disabled={page <= 1} onClick={() => onChange && onChange(page - 1)} style={btn(page <= 1)}>
          <Icon name="chevron-left" size={14} />
        </button>
        <span style={{ fontSize: 'var(--type-support-size)', color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums', minWidth: 52, textAlign: 'center' }}>{page} / {pageCount}</span>
        <button aria-label="Próxima página" disabled={page >= pageCount} onClick={() => onChange && onChange(page + 1)} style={btn(page >= pageCount)}>
          <Icon name="chevron-right" size={14} />
        </button>
      </span>
    </nav>
  );
}
