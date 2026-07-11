import React from 'react';

/** Popover — conteúdo leve ancorado a um gatilho (filtros, detalhes rápidos). */
export function Popover({ trigger, children, position = 'bottom', width = 280 }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const pos = position === 'top'
    ? { bottom: 'calc(100% + 6px)', left: 0 }
    : { top: 'calc(100% + 6px)', left: 0 };
  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <span onClick={() => setOpen(o => !o)}>{trigger}</span>
      {open && (
        <div role="dialog" style={{
          position: 'absolute', zIndex: 40, ...pos, width,
          background: 'var(--surface-default)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--elevation-floating)',
          padding: 'var(--space-4)',
        }}>{children}</div>
      )}
    </span>
  );
}
