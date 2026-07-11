import React from 'react';
import { Avatar } from '../display/Avatar.jsx';
import { StatusBadge } from '../display/StatusBadge.jsx';

/** Card de pessoa — a representação canônica de um humano nos produtos AION, em três densidades. */
export function PersonCard({ name, role, status, statusTone = 'neutral', meta, density = 'default', onClick, actions, style }) {
  const compact = density === 'compact';
  const rich = density === 'rich';
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: rich ? 'flex-start' : 'center', gap: 'var(--space-3)',
      padding: compact ? 'var(--space-2) var(--space-3)' : 'var(--space-4)',
      background: 'var(--surface-default)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)', cursor: onClick ? 'pointer' : undefined,
      transition: 'background var(--duration-instant) var(--ease-standard)', ...style,
    }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = 'var(--surface-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-default)'; }}>
      <Avatar name={name} size={compact ? 'sm' : rich ? 'lg' : 'md'} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--type-body-size)', fontWeight: 'var(--weight-medium)', color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
          {status && <StatusBadge tone={statusTone}>{status}</StatusBadge>}
        </div>
        {role && <div style={{ fontSize: 'var(--type-support-size)', color: 'var(--text-muted)' }}>{role}</div>}
        {rich && meta && (
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)', fontSize: 'var(--type-caption-size)', color: 'var(--text-subtle)', flexWrap: 'wrap' }}>
            {meta.map((m, i) => <span key={i} style={{ fontVariantNumeric: 'tabular-nums' }}>{m}</span>)}
          </div>
        )}
      </div>
      {actions && <div style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>{actions}</div>}
    </div>
  );
}
