import React from 'react';
import { fieldLabel, fieldHelp, controlStyle, useFieldId } from './fieldBase.jsx';
import { Icon } from '../foundation/Icon.jsx';

/** Combobox com busca — escolha única em lista longa, filtrada por digitação. */
export function Combobox({ label, value, onChange, options = [], placeholder = 'Buscar…', help, error, required, disabled, compact, emptyText = 'Nenhum resultado para esta busca.', id, style }) {
  const [focus, setFocus] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const fid = useFieldId(id);
  const ref = React.useRef(null);
  const norm = (s) => (s || '').toLowerCase();
  const opts = options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
  const filtered = query ? opts.filter(o => norm(o.label).includes(norm(query))) : opts;
  const selected = opts.find(o => o.value === value);

  React.useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery(''); } };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const pick = (o) => { onChange && onChange(o.value); setOpen(false); setQuery(''); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && open && filtered[active]) { e.preventDefault(); pick(filtered[active]); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {fieldLabel(label, fid, required)}
      <div style={{ position: 'relative' }}>
        <input
          id={fid} role="combobox" aria-expanded={open} aria-autocomplete="list"
          value={open ? query : (selected ? selected.label : '')}
          placeholder={selected ? selected.label : placeholder}
          disabled={disabled} aria-invalid={error ? true : undefined}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => { setFocus(true); setOpen(true); }}
          onBlur={() => setFocus(false)}
          onKeyDown={onKey}
          style={{ ...controlStyle({ error, disabled, compact, focus }), paddingRight: 32 }}
        />
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-subtle)', display: 'inline-flex' }}>
          <Icon name={open ? 'search' : 'chevrons-up-down'} size={16} />
        </span>
      </div>
      {open && !disabled && (
        <div role="listbox" style={{
          position: 'absolute', zIndex: 30, left: 0, right: 0, top: '100%', marginTop: 4, maxHeight: 240, overflowY: 'auto',
          background: 'var(--surface-default)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--elevation-floating)', padding: 'var(--space-1)',
        }}>
          {filtered.length === 0 && <div style={{ padding: 'var(--space-3)', color: 'var(--text-subtle)', fontSize: 'var(--type-support-size)' }}>{emptyText}</div>}
          {filtered.map((o, i) => (
            <div key={o.value} role="option" aria-selected={o.value === value}
              onMouseDown={(e) => { e.preventDefault(); pick(o); }}
              onMouseEnter={() => setActive(i)}
              style={{
                padding: '7px var(--space-3)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                background: i === active ? 'var(--surface-hover)' : o.value === value ? 'var(--surface-selected)' : 'transparent',
                fontSize: 'var(--type-body-size)', color: 'var(--text-body)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
              {o.label}
              {o.value === value && <Icon name="check" size={14} style={{ color: 'var(--action-primary)' }} />}
            </div>
          ))}
        </div>
      )}
      {fieldHelp(error, help, fid + '-help')}
    </div>
  );
}
