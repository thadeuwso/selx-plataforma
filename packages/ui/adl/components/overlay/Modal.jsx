import React from 'react';
import { Icon } from '../foundation/Icon.jsx';

/** Modal — sobreposição para decisão ou tarefa curta; scrim escuro, entrada 200ms. */
export function Modal({ open, title, children, footer, onClose, width = 480 }) {
  React.useEffect(() => {
    if (!open) return;
    const esc = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }} style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'var(--surface-overlay)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)',
      animation: 'adl-fade-in var(--duration-base) var(--ease-standard)',
    }}>
      <style>{'@keyframes adl-fade-in { from { opacity: 0; } } @keyframes adl-rise-in { from { opacity: 0; transform: translateY(8px); } }'}</style>
      <div role="dialog" aria-modal="true" aria-label={title} style={{
        width: '100%', maxWidth: width, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        background: 'var(--surface-default)', borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--elevation-overlay)', animation: 'adl-rise-in var(--duration-base) var(--ease-standard)',
      }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', padding: 'var(--space-5) var(--space-6) 0' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--type-title-size)', lineHeight: 'var(--type-title-line)', fontWeight: 'var(--type-title-weight)', color: 'var(--text-strong)' }}>{title}</h2>
          {onClose && (
            <button onClick={onClose} aria-label="Fechar" style={{ border: 'none', background: 'none', padding: 4, color: 'var(--text-subtle)', cursor: 'pointer', display: 'inline-flex', borderRadius: 'var(--radius-sm)' }}>
              <Icon name="x" size={18} />
            </button>
          )}
        </header>
        <div style={{ padding: 'var(--space-4) var(--space-6)', overflowY: 'auto', color: 'var(--text-body)' }}>{children}</div>
        {footer && <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', padding: '0 var(--space-6) var(--space-5)' }}>{footer}</footer>}
      </div>
    </div>
  );
}
