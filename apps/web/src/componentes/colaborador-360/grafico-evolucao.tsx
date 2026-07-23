"use client";

interface Ponto {
  rotulo: string;
  valor: number;
}

/**
 * Evolução da nota no tempo — série única (performance-360, Fase 4).
 *
 * SVG próprio (decisão B4), sem dependência. Segue a cartilha de dataviz: uma
 * escala só (1..5), linha fina, marcadores com **valor rotulado direto** (nunca
 * só cor), grid recessivo, hover via <title>. Série única → sem legenda.
 */
export function GraficoEvolucao({ pontos }: { pontos: Ponto[] }) {
  const W = 560;
  const H = 220;
  const padL = 28;
  const padR = 16;
  const padT = 24;
  const padB = 40;
  const min = 1;
  const max = 5;

  if (pontos.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
        Ainda não há ciclos concluídos para desenhar a evolução.
      </p>
    );
  }

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const x = (i: number) =>
    padL + (pontos.length === 1 ? innerW / 2 : (i / (pontos.length - 1)) * innerW);
  const y = (v: number) => padT + innerH - ((v - min) / (max - min)) * innerH;

  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.valor)}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Evolução da nota por ciclo">
        {/* Grid recessivo + rótulos do eixo Y */}
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="var(--border-default)" strokeWidth={1} opacity={0.5} />
            <text x={padL - 8} y={y(v) + 3} textAnchor="end" fontSize={10} fill="var(--text-muted)">
              {v}
            </text>
          </g>
        ))}

        {/* Linha da série */}
        <path d={linha} fill="none" stroke="var(--brand-700)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Marcadores + valor rotulado + hover */}
        {pontos.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.valor)} r={4.5} fill="var(--brand-700)" stroke="var(--surface-default)" strokeWidth={2}>
              <title>{`${p.rotulo}: ${p.valor.toFixed(1)}`}</title>
            </circle>
            <text x={x(i)} y={y(p.valor) - 10} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--text-body)">
              {p.valor.toFixed(1)}
            </text>
            <text x={x(i)} y={H - padB + 16} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
              {p.rotulo.length > 14 ? p.rotulo.slice(0, 13) + "…" : p.rotulo}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
