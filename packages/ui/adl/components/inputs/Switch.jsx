import React from 'react';
import { useFieldId } from './fieldBase.jsx';

/** Switch — liga/desliga com efeito imediato (sem botão salvar). */
export function Switch({ label, checked, defaultChecked, onChange, disabled, help, id, style }) {
  const fid = useFieldId(id);
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const isOn = checked !== undefined ? checked : internal;
  const toggle = () => { if (disabled) return; const v = !isOn; if (checked === undefined) setInternal(v); onChange && onChange(v); };
  return (
    <label htmlFor={fid} style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 'var(--space-3)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}>
      <span style={{ position: 'relative', display: 'inline-flex', marginTop: 2 }}>
        <input id={fid} type="checkbox" role="switch" checked={isOn} disabled={disabled} onChange={toggle}
          style={{ position: 'absolute', inset: 0, opacity: 0, margin: 0, cursor: 'inherit' }} />
        <span aria-hidden="true" style={{
          width: 34, height: 20, borderRadius: 'var(--radius-full)',
          background: isOn ? 'var(--action-primary)' : 'var(--neutral-300)',
          display: 'inline-flex', alignItems: 'center', padding: 2, boxSizing: 'border-box',
          transition: 'background var(--duration-fast) var(--ease-standard)',
        }}>
          <span style={{
            width: 16, height: 16, borderRadius: 'var(--radius-full)', background: '#fff',
            boxShadow: 'var(--elevation-raised)',
            transform: isOn ? 'translateX(14px)' : 'translateX(0)',
            transition: 'transform var(--duration-fast) var(--ease-standard)',
          }}></span>
        </span>
      </span>
      <span>
        <span style={{ fontSize: 'var(--type-body-size)', color: 'var(--text-body)' }}>{label}</span>
        {help && <span style={{ display: 'block', fontSize: 'var(--type-caption-size)', color: 'var(--text-subtle)' }}>{help}</span>}
      </span>
    </label>
  );
}
