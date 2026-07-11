import React from 'react';
import { Icon } from '../foundation/Icon.jsx';

const alertTones = {
  info: { icon: 'info', fg: 'var(--feedback-info)', bg: 'var(--feedback-info-surface)', border: 'var(--feedback-info-border)' },
  success: { icon: 'circle-check', fg: 'var(--feedback-success)', bg: 'var(--feedback-success-surface)', border: 'var(--feedback-success-border)' },
  warning: { icon: 'triangle-alert', fg: 'var(--feedback-warning)', bg: 'var(--feedback-warning-surface)', border: 'var(--feedback-warning-border)' },
  danger: { icon: 'circle-alert', fg: 'var(--feedback-danger)', bg: 'var(--feedback-danger-surface)', border: 'var(--feedback-danger-border)' },
};

/** Alerta embutido — o que houve + o que fazer, no contexto da tela. */
export function Alert({ tone = 'info', title, children, action, onDismiss, style }) {
  const t = alertTones[tone] || alertTones.info;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} style={{
      display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start',
      padding: 'var(--space-3) var(--space-4)',
      background: t.bg, border: `1px solid ${t.border}`, borderRadius: 'var(--radius-lg)',
      ...style,
    }}>
      <span style={{ color: t.fg, display: 'inline-flex', marginTop: 2 }}><Icon name={t.icon} size={16} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontSize: 'var(--type-body-size)', fontWeight: 'var(--weight-medium)', color: 'var(--text-strong)' }}>{title}</div>}
        {children && <div style={{ fontSize: 'var(--type-support-size)', color: 'var(--text-muted)', marginTop: title ? 2 : 0 }}>{children}</div>}
        {action && <div style={{ marginTop: 'var(--space-2)' }}>{action}</div>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dispensar aviso" style={{ border: 'none', background: 'none', padding: 2, color: 'var(--text-subtle)', cursor: 'pointer', display: 'inline-flex' }}>
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}
