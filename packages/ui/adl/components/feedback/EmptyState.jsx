import React from 'react';
import { Icon } from '../foundation/Icon.jsx';

/** Estado vazio que ensina: o que é, por que está vazio, qual o próximo passo. */
export function EmptyState({ icon = 'inbox', title, description, action, style }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      gap: 'var(--space-2)', padding: 'var(--space-10) var(--space-6)', ...style,
    }}>
      <span style={{
        width: 40, height: 40, borderRadius: 'var(--radius-full)', background: 'var(--surface-sunken)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)',
        marginBottom: 'var(--space-1)',
      }}>
        <Icon name={icon} size={20} />
      </span>
      <div style={{ fontSize: 'var(--type-body-size)', fontWeight: 'var(--weight-medium)', color: 'var(--text-strong)' }}>{title}</div>
      {description && <p style={{ margin: 0, fontSize: 'var(--type-support-size)', color: 'var(--text-muted)', maxWidth: 360 }}>{description}</p>}
      {action && <div style={{ marginTop: 'var(--space-3)' }}>{action}</div>}
    </div>
  );
}
