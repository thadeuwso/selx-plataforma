import React from 'react';
import { useFieldId } from './fieldBase.jsx';
import { Icon } from '../foundation/Icon.jsx';

/** Checkbox — seleção múltipla ou aceite individual. */
export function Checkbox({ label, checked, defaultChecked, onChange, disabled, indeterminate, help, id, style }) {
  const fid = useFieldId(id);
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const isChecked = checked !== undefined ? checked : internal;
  const toggle = (e) => { if (checked === undefined) setInternal(e.target.checked); onChange && onChange(e.target.checked, e); };
  return (
    <div style={style}>
      <label htmlFor={fid} style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 'var(--space-2)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
        <span style={{ position: 'relative', display: 'inline-flex', marginTop: 3 }}>
          <input id={fid} type="checkbox" checked={isChecked} disabled={disabled} onChange={toggle}
            style={{ position: 'absolute', inset: 0, opacity: 0, margin: 0, cursor: 'inherit' }} />
          <span aria-hidden="true" style={{
            width: 16, height: 16, borderRadius: 'var(--radius-sm)',
            border: `1px solid ${isChecked || indeterminate ? 'var(--action-primary)' : 'var(--border-default)'}`,
            background: isChecked || indeterminate ? 'var(--action-primary)' : 'var(--surface-default)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-on-brand)',
            transition: 'background var(--duration-instant) var(--ease-standard)',
          }}>
            {indeterminate ? <Icon name="minus" size={12} /> : isChecked ? <Icon name="check" size={12} /> : null}
          </span>
        </span>
        <span>
          <span style={{ fontSize: 'var(--type-body-size)', color: 'var(--text-body)' }}>{label}</span>
          {help && <span style={{ display: 'block', fontSize: 'var(--type-caption-size)', color: 'var(--text-subtle)' }}>{help}</span>}
        </span>
      </label>
    </div>
  );
}
