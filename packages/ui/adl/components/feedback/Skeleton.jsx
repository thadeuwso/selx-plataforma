import React from 'react';

/** Skeleton — a espera parece preparação, não bloqueio. Usar onde a estrutura da tela é conhecida. */
export function Skeleton({ width = '100%', height = 16, circle = false, lines = 1, style }) {
  const bar = (w, key) => (
    <span key={key} aria-hidden="true" style={{
      display: 'block', width: w, height, borderRadius: circle ? 'var(--radius-full)' : 'var(--radius-sm)',
      background: 'linear-gradient(90deg, var(--surface-sunken) 25%, var(--surface-hover) 50%, var(--surface-sunken) 75%)',
      backgroundSize: '200% 100%', animation: 'adl-shimmer 1.4s ease infinite',
      ...style,
    }}></span>
  );
  return (
    <span role="status" aria-label="Carregando" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <style>{'@keyframes adl-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }'}</style>
      {Array.from({ length: lines }, (_, i) => bar(circle ? height : (i === lines - 1 && lines > 1 ? '60%' : width), i))}
    </span>
  );
}
