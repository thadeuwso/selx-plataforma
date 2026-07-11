import React from 'react';
import { Icon } from '../foundation/Icon.jsx';

/** Menu de ações — ações secundárias/contextuais atrás de um gatilho "…". */
export function ActionMenu({ items = [], label = 'Mais ações', icon = 'ellipsis', compact = false }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)} style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: compact ? 'var(--control-height-compact)' : 'var(--control-height)',
        height: compact ? 'var(--control-height-compact)' : 'var(--control-height)',
        border: '1px solid transparent', borderRadius: 'var(--radius-md)',
        background: open ? 'var(--surface-pressed)' : 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
        transition: 'background var(--duration-instant) var(--ease-standard)',
      }}>
        <Icon name={icon} size={16} />
      </button>
      {open && (
        <div role="menu" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 30, minWidth: 180,
          background: 'var(--surface-default)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--elevation-floating)', padding: 'var(--space-1)',
        }}>
          {items.map((item, i) => item === '-' ? (
            <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: 'var(--space-1) 0' }} />
          ) : (
            <button key={item.label} role="menuitem" onClick={() => { setOpen(false); item.onSelect && item.onSelect(); }} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%',
              padding: '7px var(--space-3)', border: 'none', borderRadius: 'var(--radius-md)', background: 'transparent',
              color: item.destructive ? 'var(--feedback-danger)' : 'var(--text-body)',
              fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-size)', textAlign: 'left', cursor: 'pointer',
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {item.icon && <Icon name={item.icon} size={16} />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
