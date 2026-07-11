import React from 'react';

/** Abas — alternância entre visões do mesmo contexto. Sublinhado indica a ativa. */
export function Tabs({ tabs = [], active, onChange, compact = false, style }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 'var(--space-1)', borderBottom: '1px solid var(--border-subtle)', ...style }}>
      {tabs.map((t) => {
        const tab = typeof t === 'string' ? { id: t, label: t } : t;
        const sel = active === tab.id;
        return (
          <button key={tab.id} role="tab" aria-selected={sel} onClick={() => onChange && onChange(tab.id)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: compact ? '6px var(--space-3)' : '10px var(--space-4)',
            border: 'none', background: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-size)',
            fontWeight: sel ? 'var(--weight-medium)' : 'var(--weight-regular)',
            color: sel ? 'var(--text-strong)' : 'var(--text-muted)',
            boxShadow: sel ? 'inset 0 -2px 0 var(--action-primary)' : 'none',
            marginBottom: -1, transition: 'color var(--duration-instant) var(--ease-standard)',
          }}>
            {tab.label}
            {tab.count !== undefined && (
              <span style={{ fontSize: 'var(--type-caption-size)', fontVariantNumeric: 'tabular-nums', background: 'var(--surface-sunken)', color: 'var(--text-muted)', borderRadius: 'var(--radius-full)', padding: '0 7px', lineHeight: '16px' }}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
