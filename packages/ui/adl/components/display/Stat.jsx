import React from 'react';
import { Icon } from '../foundation/Icon.jsx';

/** KPI/estatística — valor com algarismos tabulares, variação e período (sempre com contexto). */
export function Stat({ label, value, delta, deltaDirection, period, style }) {
  const dir = deltaDirection || (typeof delta === 'string' && delta.trim().startsWith('-') ? 'down' : 'up');
  const good = dir === 'up';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', ...style }}>
      <span style={{ fontSize: 'var(--type-support-size)', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 24, lineHeight: '32px', fontWeight: 'var(--weight-semibold)', color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{value}</span>
      {(delta || period) && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--type-caption-size)' }}>
          {delta && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: good ? 'var(--feedback-success)' : 'var(--feedback-danger)', fontWeight: 'var(--weight-medium)', fontVariantNumeric: 'tabular-nums' }}>
              <Icon name={dir === 'up' ? 'arrow-up-right' : 'arrow-down-right'} size={12} />
              {delta}
            </span>
          )}
          {period && <span style={{ color: 'var(--text-subtle)' }}>{period}</span>}
        </span>
      )}
    </div>
  );
}
