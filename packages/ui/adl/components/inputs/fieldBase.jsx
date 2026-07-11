import React from 'react';

/* Base compartilhada dos campos de formulário ADL (não é componente público). */

export function fieldLabel(label, htmlFor, required) {
  if (!label) return null;
  return (
    <label htmlFor={htmlFor} style={{ display: 'block', fontSize: 'var(--type-support-size)', lineHeight: 'var(--type-support-line)', fontWeight: 'var(--weight-medium)', color: 'var(--text-body)', marginBottom: 'var(--space-1)' }}>
      {label}{required && <span aria-hidden="true" style={{ color: 'var(--feedback-danger)' }}> *</span>}
    </label>
  );
}

export function fieldHelp(error, help, id) {
  if (error) return <p id={id} role="alert" style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--type-caption-size)', lineHeight: 'var(--type-caption-line, 16px)', color: 'var(--feedback-danger)' }}>{error}</p>;
  if (help) return <p id={id} style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--type-caption-size)', color: 'var(--text-subtle)' }}>{help}</p>;
  return null;
}

export function controlStyle({ error, disabled, compact, focus }) {
  return {
    width: '100%',
    height: compact ? 'var(--control-height-compact)' : 'var(--control-height)',
    padding: '0 var(--space-3)',
    fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-size)', color: 'var(--text-body)',
    background: disabled ? 'var(--surface-sunken)' : 'var(--surface-default)',
    border: `1px solid ${error ? 'var(--feedback-danger)' : focus ? 'var(--border-selected)' : 'var(--border-default)'}`,
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    boxShadow: focus ? 'var(--focus-ring)' : 'none',
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : undefined,
    transition: 'border-color var(--duration-instant) var(--ease-standard)',
    boxSizing: 'border-box',
  };
}

let fieldSeq = 0;
export function useFieldId(id) {
  const [auto] = React.useState(() => `adl-field-${++fieldSeq}`);
  return id || auto;
}
