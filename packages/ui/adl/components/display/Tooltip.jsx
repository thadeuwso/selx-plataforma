import React from 'react';

/** Tooltip — complemento breve; se o design precisa dele para ser compreendido, o design falhou. */
export function Tooltip({ content, position = 'top', children }) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top: { bottom: '100%', left: '50%', transform: 'translate(-50%, -6px)' },
    bottom: { top: '100%', left: '50%', transform: 'translate(-50%, 6px)' },
    right: { left: '100%', top: '50%', transform: 'translate(6px, -50%)' },
    left: { right: '100%', top: '50%', transform: 'translate(-6px, -50%)' },
  }[position];
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)} onBlur={() => setShow(false)}>
      {children}
      {show && (
        <span role="tooltip" style={{
          position: 'absolute', zIndex: 40, ...pos,
          background: 'var(--surface-inverse)', color: 'var(--text-inverse)',
          fontSize: 'var(--type-caption-size)', lineHeight: '16px', fontFamily: 'var(--font-sans)',
          padding: '4px 8px', borderRadius: 'var(--radius-md)', whiteSpace: 'nowrap',
          boxShadow: 'var(--elevation-floating)',
        }}>{content}</span>
      )}
    </span>
  );
}
