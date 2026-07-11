import React from 'react';

const statusTones = {
  neutral: { bg: 'var(--surface-sunken)', fg: 'var(--text-muted)', dot: 'var(--neutral-400)' },
  success: { bg: 'var(--feedback-success-surface)', fg: 'var(--feedback-success)', dot: 'var(--feedback-success)' },
  danger: { bg: 'var(--feedback-danger-surface)', fg: 'var(--feedback-danger)', dot: 'var(--feedback-danger)' },
  warning: { bg: 'var(--feedback-warning-surface)', fg: 'var(--feedback-warning)', dot: 'var(--feedback-warning)' },
  info: { bg: 'var(--feedback-info-surface)', fg: 'var(--feedback-info)', dot: 'var(--feedback-info)' },
  brand: { bg: 'var(--tenant-accent-surface)', fg: 'var(--tenant-accent)', dot: 'var(--tenant-accent)' },
};

/** Badge de status — cor com significado fixo + ponto (cor nunca é o único canal). */
export function StatusBadge({ tone = 'neutral', children, dot = true, style }) {
  const t = statusTones[tone] || statusTones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '2px 10px', borderRadius: 'var(--radius-full)',
      background: t.bg, color: t.fg,
      fontSize: 'var(--type-caption-size)', fontWeight: 'var(--weight-medium)', lineHeight: '16px',
      whiteSpace: 'nowrap', ...style,
    }}>
      {dot && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 'var(--radius-full)', background: t.dot }}></span>}
      {children}
    </span>
  );
}
