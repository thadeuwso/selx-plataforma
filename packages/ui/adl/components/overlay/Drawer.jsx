import React from 'react';
import { Icon } from '../foundation/Icon.jsx';

/** Painel lateral (drawer) — detalhe/edição em contexto sem sair da tela. */
export function Drawer({ open, title, children, footer, onClose, width = 420 }) {
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
      animation: 'adl-fade-in var(--duration-base) var(--ease-standard)',
    }}>
      <style>{'@keyframes adl-fade-in { from { opacity: 0; } } @keyframes adl-slide-in { from { transform: translateX(24px); opacity: 0; } }'}</style>
      <aside role="dialog" aria-modal="true" aria-label={title} style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: width,
        background: 'var(--surface-default)', boxShadow: 'var(--elevation-overlay)',
        display: 'flex', flexDirection: 'column',
        animation: 'adl-slide-in var(--duration-base) var(--ease-standard)',
      }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--type-subtitle-size)', lineHeight: 'var(--type-subtitle-line)', fontWeight: 'var(--type-subtitle-weight)', color: 'var(--text-strong)' }}>{title}</h2>
          {onClose && (
            <button onClick={onClose} aria-label="Fechar painel" style={{ border: 'none', background: 'none', padding: 4, color: 'var(--text-subtle)', cursor: 'pointer', display: 'inline-flex' }}>
              <Icon name="x" size={18} />
            </button>
          )}
        </header>
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)' }}>{children}</div>
        {footer && <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border-subtle)' }}>{footer}</footer>}
      </aside>
    </div>
  );
}
