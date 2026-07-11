import React from 'react';
import { Icon } from '../foundation/Icon.jsx';

/** Busca global — campo de busca do cabeçalho com atalho de teclado. */
export function GlobalSearch({ placeholder = 'Buscar em tudo…', shortcut = 'Ctrl K', onSearch, width = 320, style }) {
  const [value, setValue] = React.useState('');
  const [focus, setFocus] = React.useState(false);
  return (
    <div role="search" style={{ position: 'relative', width, ...style }}>
      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', display: 'inline-flex' }}>
        <Icon name="search" size={15} />
      </span>
      <input
        type="search" value={value} placeholder={placeholder} aria-label={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onSearch) onSearch(value); }}
        style={{
          width: '100%', height: 'var(--control-height)', boxSizing: 'border-box',
          padding: '0 64px 0 32px',
          fontFamily: 'var(--font-sans)', fontSize: 'var(--type-support-size)', color: 'var(--text-body)',
          background: focus ? 'var(--surface-default)' : 'var(--surface-sunken)',
          border: `1px solid ${focus ? 'var(--border-selected)' : 'transparent'}`,
          borderRadius: 'var(--radius-md)', outline: 'none',
          boxShadow: focus ? 'var(--focus-ring)' : 'none',
          transition: 'background var(--duration-instant) var(--ease-standard)',
        }}
      />
      {!focus && !value && (
        <kbd style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-subtle)',
          background: 'var(--surface-default)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)', padding: '1px 6px',
        }}>{shortcut}</kbd>
      )}
    </div>
  );
}
