import React from 'react';
import { fieldLabel, fieldHelp, controlStyle, useFieldId } from './fieldBase.jsx';

/** Área de texto — entrada multilinha. */
export function TextArea({ label, value, defaultValue, onChange, placeholder, rows = 4, help, error, required, disabled, id, style }) {
  const [focus, setFocus] = React.useState(false);
  const fid = useFieldId(id);
  const base = controlStyle({ error, disabled, focus });
  return (
    <div style={style}>
      {fieldLabel(label, fid, required)}
      <textarea
        id={fid} value={value} defaultValue={defaultValue} placeholder={placeholder} rows={rows}
        required={required} disabled={disabled}
        aria-invalid={error ? true : undefined} aria-describedby={(error || help) ? fid + '-help' : undefined}
        onChange={(e) => onChange && onChange(e.target.value, e)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ ...base, height: 'auto', padding: 'var(--space-2) var(--space-3)', lineHeight: 'var(--type-body-line)', resize: 'vertical' }}
      ></textarea>
      {fieldHelp(error, help, fid + '-help')}
    </div>
  );
}
