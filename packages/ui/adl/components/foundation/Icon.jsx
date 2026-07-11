import React from 'react';

const cache = {};
const LUCIDE_BASE = 'https://unpkg.com/lucide-static@0.462.0/icons/';

/** Ícone Lucide — família única do ADL. Busca o SVG do CDN e herda currentColor. */
export function Icon({ name, size = 16, label, style }) {
  const [svg, setSvg] = React.useState(cache[name] || null);
  React.useEffect(() => {
    let alive = true;
    if (!name) return;
    if (cache[name]) { setSvg(cache[name]); return; }
    fetch(LUCIDE_BASE + name + '.svg')
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(text => {
        // extrai o conteúdo interno do <svg>
        const inner = text.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
        cache[name] = inner;
        if (alive) setSvg(inner);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [name]);

  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ flexShrink: 0, verticalAlign: 'middle', ...style }}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
