import React from 'react';

/** Divisor horizontal sutil — usar apenas quando o espaço não basta. */
export function Divider({ spacing = 'var(--space-4)', vertical = false, style }) {
  if (vertical) {
    return <span role="separator" aria-orientation="vertical" style={{ alignSelf: 'stretch', width: 1, background: 'var(--border-subtle)', margin: `0 ${spacing}`, ...style }}></span>;
  }
  return <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: `${spacing} 0`, ...style }} />;
}
