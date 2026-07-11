import React from 'react';

/** Barra de progresso — determinada, com rótulo e valor visíveis. */
export function ProgressBar({ value = 0, max = 100, label, showValue = true, tone = 'brand', style }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = tone === 'success' ? 'var(--feedback-success)' : tone === 'danger' ? 'var(--feedback-danger)' : tone === 'warning' ? 'var(--feedback-warning)' : 'var(--action-primary)';
  return (
    <div style={style}>
      {(label || showValue) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-1)', fontSize: 'var(--type-support-size)' }}>
          <span style={{ color: 'var(--text-body)' }}>{label}</span>
          {showValue && <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}
        style={{ height: 6, borderRadius: 'var(--radius-full)', background: 'var(--surface-sunken)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 'var(--radius-full)', background: color, transition: 'width var(--duration-base) var(--ease-standard)' }}></div>
      </div>
    </div>
  );
}
