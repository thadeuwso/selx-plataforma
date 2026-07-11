import React from 'react';

const avatarSizes = { sm: 24, md: 32, lg: 40, xl: 56 };

/** Avatar — círculo com foto ou iniciais; a exceção de imagem nos produtos ADL. */
export function Avatar({ name = '', src, size = 'md', style }) {
  const px = avatarSizes[size] || size;
  const initials = name.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span role="img" aria-label={name} style={{
      width: px, height: px, borderRadius: 'var(--radius-full)', flexShrink: 0,
      background: src ? 'var(--surface-sunken)' : 'var(--brand-100)', color: 'var(--brand-700)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(px * 0.38), fontWeight: 'var(--weight-semibold)', fontFamily: 'var(--font-sans)',
      overflow: 'hidden', ...style,
    }}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </span>
  );
}
