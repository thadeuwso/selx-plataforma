import React from 'react';
import { fieldLabel, fieldHelp, controlStyle, useFieldId } from './fieldBase.jsx';
import { Icon } from '../foundation/Icon.jsx';

/** Campo de texto — rótulo, ajuda, erro ("o que houve + o que fazer"). */
export function TextField({ label, value, defaultValue, onChange, placeholder, type = 'text', help, error, required, disabled, compact, icon, id, style }) {
  const [focus, setFocus] = React.useState(false);
  const fid = useFieldId(id);
  return (
    <div style={style}>
      {fieldLabel(label, fid, required)}
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', display: 'inline-flex' }}><Icon name={icon} size={16} /></span>}
        <input
          id={fid} type={type} value={value} defaultValue={defaultValue} placeholder={placeholder}
          required={required} disabled={disabled}
          aria-invalid={error ? true : undefined} aria-describedby={(error || help) ? fid + '-help' : undefined}
          onChange={(e) => onChange && onChange(e.target.value, e)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ ...controlStyle({ error, disabled, compact, focus }), paddingLeft: icon ? 34 : undefined }}
        />
      </div>
      {fieldHelp(error, help, fid + '-help')}
    </div>
  );
}
