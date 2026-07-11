import React from 'react';
import { Icon } from '../foundation/Icon.jsx';

const toastTones = {
  success: { icon: 'circle-check', color: 'var(--feedback-success)' },
  danger: { icon: 'circle-alert', color: 'var(--feedback-danger)' },
  info: { icon: 'info', color: 'var(--feedback-info)' },
};

/** Toast — confirmação passageira de ação concluída; nunca para erros que exigem decisão. */
export function Toast({ tone = 'success', message, actionLabel, onAction, onDismiss, style }) {
  return (
    <div role="status" style={{
      display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)',
      padding: 'var(--space-3) var(--space-4)',
      background: 'var(--surface-inverse)', color: 'var(--text-inverse)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--elevation-overlay)',
      fontSize: 'var(--type-support-size)', maxWidth: 420,
      ...style,
    }}>
      <span style={{ color: (toastTones[tone] || toastTones.info).color, display: 'inline-flex' }}>
        <Icon name={(toastTones[tone] || toastTones.info).icon} size={16} />
      </span>
      <span style={{ flex: 1 }}>{message}</span>
      {actionLabel && (
        <button onClick={onAction} style={{ border: 'none', background: 'none', color: 'var(--brand-300)', fontWeight: 'var(--weight-medium)', fontFamily: 'var(--font-sans)', fontSize: 'var(--type-support-size)', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
          {actionLabel}
        </button>
      )}
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Fechar notificação" style={{ border: 'none', background: 'none', padding: 2, color: 'var(--neutral-400)', cursor: 'pointer', display: 'inline-flex' }}>
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}
