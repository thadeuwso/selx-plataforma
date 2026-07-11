import React from 'react';
import { Stat } from '../display/Stat.jsx';

/** Card de KPI de RH — valor com variação e período, em cartão. */
export function KpiCard({ label, value, delta, deltaDirection, period, footer, style }) {
  return (
    <div style={{
      background: 'var(--surface-default)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', boxShadow: 'var(--elevation-raised)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', ...style,
    }}>
      <Stat label={label} value={value} delta={delta} deltaDirection={deltaDirection} period={period} />
      {footer && <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--text-subtle)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-2)', marginTop: 'auto' }}>{footer}</div>}
    </div>
  );
}
