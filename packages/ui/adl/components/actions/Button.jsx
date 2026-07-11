import React from 'react';
import { Icon } from '../foundation/Icon.jsx';

const btnVariants = {
  primary: { background: 'var(--action-primary)', color: 'var(--text-on-brand)', border: '1px solid transparent', hover: 'var(--action-primary-hover)', pressed: 'var(--action-primary-pressed)' },
  secondary: { background: 'var(--surface-default)', color: 'var(--text-body)', border: '1px solid var(--action-secondary-border)', hover: 'var(--action-secondary-hover)', pressed: 'var(--surface-pressed)' },
  subtle: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent', hover: 'var(--surface-hover)', pressed: 'var(--surface-pressed)' },
  destructive: { background: 'var(--action-destructive)', color: 'var(--text-on-brand)', border: '1px solid transparent', hover: 'var(--action-destructive-hover)', pressed: 'var(--action-destructive-hover)' },
};

/** Botão ADL — o rótulo diz o que ele faz ("Publicar vaga", nunca "OK"). */
export function Button({ variant = 'primary', size = 'default', icon, loading = false, disabled = false, children, onClick, type = 'button', style }) {
  const [state, setState] = React.useState('rest');
  const v = btnVariants[variant] || btnVariants.primary;
  const compact = size === 'compact';
  const isDisabled = disabled || loading;
  return (
    <button
      type={type} disabled={isDisabled} onClick={onClick}
      onMouseEnter={() => setState('hover')} onMouseLeave={() => setState('rest')}
      onMouseDown={() => setState('pressed')} onMouseUp={() => setState('hover')}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
        height: compact ? 'var(--control-height-compact)' : 'var(--control-height)',
        padding: compact ? '0 var(--space-3)' : '0 var(--space-4)',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-sans)', fontSize: compact ? 'var(--type-support-size)' : 'var(--type-body-size)',
        fontWeight: 'var(--weight-medium)', whiteSpace: 'nowrap',
        border: v.border,
        background: isDisabled ? v.background : state === 'pressed' ? v.pressed : state === 'hover' ? v.hover : v.background,
        color: v.color,
        opacity: isDisabled ? 0.45 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'background var(--duration-instant) var(--ease-standard)',
        ...style,
      }}
    >
      {loading
        ? <Icon name="loader-circle" size={compact ? 14 : 16} style={{ animation: 'adl-spin 0.9s linear infinite' }} />
        : icon && <Icon name={icon} size={compact ? 14 : 16} />}
      {children}
    </button>
  );
}
