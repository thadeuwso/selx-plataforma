"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario } from "@/componentes/formulario";

interface Sinais {
  planosAtivos: number;
  progressoMedio: number | null;
  acoesAtrasadas: number;
  feedbacksConstrutivosSemCiencia: number;
  ultimaNotaDesempenho: number | null;
}
interface AderenciaDetalhe {
  codFun: string;
  nomeFun: string;
  score: number;
  nivel: "ADERENTE" | "ATENCAO" | "RISCO";
  motivos: string[];
  recomendacoes: string[];
  lacunas: string[];
  ultimoCiclo: string | null;
  sinais: Sinais;
}

export const NIVEL: Record<string, { texto: string; cor: string }> = {
  ADERENTE: { texto: "Aderente", cor: "var(--feedback-success, #15803d)" },
  ATENCAO: { texto: "Atenção", cor: "var(--amber-700, #714E08)" },
  RISCO: { texto: "Em risco", cor: "var(--feedback-danger, #b91c1c)" },
};

/**
 * Aderência ao desenvolvimento do funcionário (RN-GP-023).
 *
 * Um número derivado dos sinais (planos, ações, feedback, desempenho) — nunca um
 * campo guardado. Mostra por que caiu (motivos), o que fazer (recomendações) e o
 * botão que fecha o ciclo: gerar um plano a partir das lacunas do último ciclo.
 */
export function AderenciaFuncionario({ codFun }: { codFun: string }) {
  const [d, setD] = useState<AderenciaDetalhe | null>(null);
  const [gerando, setGerando] = useState(false);
  const [feito, setFeito] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<AderenciaDetalhe>(`/gestao-pessoas/aderencia/detalhe?codFun=${codFun}`);
    if (r.status === 200 && r.json) setD(r.json);
  }, [codFun]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function gerarPlano() {
    setGerando(true);
    setFeito(null);
    const r = await api<{ codPdi: string; acoesCriadas: number }>(`/gestao-pessoas/aderencia/${codFun}/plano`, {
      metodo: "POST",
    });
    setGerando(false);
    if (r.status === 201 && r.json) {
      setFeito(
        r.json.acoesCriadas > 0
          ? `Plano criado com ${r.json.acoesCriadas} ação(ões) a partir das lacunas. Veja na aba Plano.`
          : "Plano criado. Sem lacunas do último ciclo — adicione as ações na aba Plano.",
      );
      await carregar();
    }
  }

  if (!d) return <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>;

  const nivel = NIVEL[d.nivel];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Score */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: "50%",
            border: `4px solid ${nivel.cor}`,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 24, fontWeight: 700 }}>{d.score}</span>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: nivel.cor }}>{nivel.texto}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, marginTop: 2 }}>
            Aderência ao desenvolvimento, calculada dos planos, feedbacks e do desempenho. Não é uma nota
            guardada — muda quando a realidade muda.
          </div>
        </div>
      </div>

      {/* Sinais */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Sinal rotulo="Planos ativos" valor={String(d.sinais.planosAtivos)} />
        <Sinal rotulo="Progresso médio" valor={d.sinais.progressoMedio === null ? "—" : `${d.sinais.progressoMedio}%`} />
        <Sinal rotulo="Ações atrasadas" valor={String(d.sinais.acoesAtrasadas)} alerta={d.sinais.acoesAtrasadas > 0} />
        <Sinal
          rotulo="Feedback sem ciência"
          valor={String(d.sinais.feedbacksConstrutivosSemCiencia)}
          alerta={d.sinais.feedbacksConstrutivosSemCiencia > 0}
        />
        <Sinal
          rotulo="Desempenho (último ciclo)"
          valor={d.sinais.ultimaNotaDesempenho === null ? "—" : d.sinais.ultimaNotaDesempenho.toFixed(1)}
        />
      </div>

      {/* Motivos */}
      {d.motivos.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Por que caiu</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
            {d.motivos.map((m, i) => (
              <li key={i} style={{ fontSize: 13 }}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recomendações */}
      {d.recomendacoes.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>O que fazer</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
            {d.recomendacoes.map((r, i) => (
              <li key={i} style={{ fontSize: 13 }}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Realimentação */}
      <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: 14 }}>
        {d.lacunas.length > 0 && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 8px" }}>
            Lacunas do último ciclo{d.ultimoCiclo ? ` (${d.ultimoCiclo})` : ""}: <strong>{d.lacunas.join(", ")}</strong>.
            Cada uma vira uma ação no novo plano.
          </p>
        )}
        <BotaoPrimario onClick={gerarPlano} disabled={gerando} style={{ justifySelf: "start" }}>
          {gerando ? "Gerando…" : "Gerar plano a partir das lacunas"}
        </BotaoPrimario>
        {feito && <p style={{ fontSize: 12, color: "var(--feedback-success, #15803d)", margin: "8px 0 0" }}>{feito}</p>}
      </div>
    </div>
  );
}

function Sinal({ rotulo, valor, alerta }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <div style={{ border: "1px solid var(--border-default)", borderRadius: 8, padding: "8px 10px" }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{rotulo}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: alerta ? "var(--feedback-danger, #b91c1c)" : "var(--text-body)" }}>
        {valor}
      </div>
    </div>
  );
}
