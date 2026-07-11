import React from 'react';
import { fieldLabel, useFieldId } from './fieldBase.jsx';

/** Grupo de radio — escolha única entre poucas opções visíveis. */
export function Radio({ label, options = [], value, defaultValue, onChange, disabled, name, style }) {
  const fid = useFieldId(name);
  const [internal, setInternal] = React.useState(defaultValue);
  const current = value !== undefined ? value : internal;
  const pick = (v) => { if (value === undefined) setInternal(v); onChange && onChange(v); };
  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0, ...style }}>
      {label && <legend style={{ padding: 0, fontSize: 'var(--type-support-size)', fontWeight: 'var(--weight-medium)', color: 'var(--text-body)', marginBottom: 'var(--space-2)' }}>{label}</legend>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          const sel = current === opt.value;
          return (
            <label key={opt.value} style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 'var(--space-2)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
              <span style={{ position: 'relative', display: 'inline-flex', marginTop: 3 }}>
                <input type="radio" name={fid} value={opt.value} checked={sel} disabled={disabled}
                  onChange={() => pick(opt.value)}
                  style={{ position: 'absolute', inset: 0, opacity: 0, margin: 0, cursor: 'inherit' }} />
                <span aria-hidden="true" style={{
                  width: 16, height: 16, borderRadius: 'var(--radius-full)',
                  border: `1px solid ${sel ? 'var(--action-primary)' : 'var(--border-default)'}`,
                  background: 'var(--surface-default)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {sel && <span style={{ width: 8, height: 8, borderRadius: 'var(--radius-full)', background: 'var(--action-primary)' }}></span>}
                </span>
              </span>
              <span>
                <span style={{ fontSize: 'var(--type-body-size)', color: 'var(--text-body)' }}>{opt.label}</span>
                {opt.help && <span style={{ display: 'block', fontSize: 'var(--type-caption-size)', color: 'var(--text-subtle)' }}>{opt.help}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
