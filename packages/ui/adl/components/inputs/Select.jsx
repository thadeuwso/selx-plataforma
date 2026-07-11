import React from 'react';
import { fieldLabel, fieldHelp, controlStyle, useFieldId } from './fieldBase.jsx';
import { Icon } from '../foundation/Icon.jsx';

/** Seleção — escolha única em lista curta e conhecida. Para listas longas, usar Combobox. */
export function Select({ label, value, defaultValue, onChange, options = [], placeholder, help, error, required, disabled, compact, id, style }) {
  const [focus, setFocus] = React.useState(false);
  const fid = useFieldId(id);
  return (
    <div style={style}>
      {fieldLabel(label, fid, required)}
      <div style={{ position: 'relative' }}>
        <select
          id={fid} value={value} defaultValue={defaultValue} required={required} disabled={disabled}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange && onChange(e.target.value, e)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ ...controlStyle({ error, disabled, compact, focus }), appearance: 'none', paddingRight: 32, color: (value ?? defaultValue) ? 'var(--text-body)' : 'var(--text-subtle)' }}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
          })}
        </select>
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-subtle)', display: 'inline-flex' }}>
          <Icon name="chevron-down" size={16} />
        </span>
      </div>
      {fieldHelp(error, help, fid + '-help')}
    </div>
  );
}
