import React from 'react';
import { fieldLabel, fieldHelp, controlStyle, useFieldId } from './fieldBase.jsx';

/** Campo de data — padrão brasileiro (dd/mm/aaaa), input nativo. */
export function DateField({ label, value, defaultValue, onChange, help, error, required, disabled, compact, min, max, id, style }) {
  const [focus, setFocus] = React.useState(false);
  const fid = useFieldId(id);
  return (
    <div style={style}>
      {fieldLabel(label, fid, required)}
      <input
        id={fid} type="date" value={value} defaultValue={defaultValue} min={min} max={max}
        required={required} disabled={disabled} lang="pt-BR"
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange && onChange(e.target.value, e)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ ...controlStyle({ error, disabled, compact, focus }), fontVariantNumeric: 'tabular-nums' }}
      />
      {fieldHelp(error, help, fid + '-help')}
    </div>
  );
}
