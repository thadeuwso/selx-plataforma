import React from 'react';
import { Icon } from './Icon.jsx';

/** Estrutura-mestre de aplicação AION: nav lateral fixa + cabeçalho de contexto + área de trabalho. */
export function AppShell({ product = 'SelX', tenant, nav = [], activeItem, onNavigate, headerContent, user, children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-page)' }}>
      <nav aria-label="Navegação principal" style={{
        width: 'var(--sidebar-width)', flexShrink: 0, background: 'var(--surface-default)',
        borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ height: 'var(--header-height)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '0 var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
          {/* Marca em tipografia pura — logo do SelX ainda não existe */}
          <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 16, color: 'var(--text-strong)', letterSpacing: '-0.01em' }}>{product}</span>
          {tenant && <span style={{ fontSize: 'var(--type-caption-size)', color: 'var(--text-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-full)', padding: '1px 8px' }}>{tenant}</span>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-3) var(--space-2)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map((item) => item.section ? (
            <div key={item.section} style={{ padding: 'var(--space-4) var(--space-3) var(--space-1)', fontSize: 'var(--type-caption-size)', fontWeight: 'var(--weight-medium)', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.section}</div>
          ) : (
            <button key={item.id} onClick={() => onNavigate && onNavigate(item.id)} aria-current={activeItem === item.id ? 'page' : undefined} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%',
              padding: '7px var(--space-3)', border: 'none', borderRadius: 'var(--radius-md)',
              background: activeItem === item.id ? 'var(--surface-selected)' : 'transparent',
              color: activeItem === item.id ? 'var(--action-primary)' : 'var(--text-muted)',
              fontWeight: activeItem === item.id ? 'var(--weight-medium)' : 'var(--weight-regular)',
              fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-size)', cursor: 'pointer', textAlign: 'left',
              transition: 'background var(--duration-instant) var(--ease-standard)',
            }}>
              {item.icon && <Icon name={item.icon} size={16} />}
              {item.label}
            </button>
          ))}
        </div>
        {user && (
          <div style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 'var(--radius-full)', background: 'var(--brand-100)', color: 'var(--brand-700)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'var(--weight-semibold)' }}>{(user.name || '?').split(' ').map(p => p[0]).slice(0, 2).join('')}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 'var(--type-support-size)', fontWeight: 'var(--weight-medium)', color: 'var(--text-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--text-subtle)' }}>{user.role}</div>
            </div>
          </div>
        )}
      </nav>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {headerContent}
        <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}
