"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Colaborador360 } from "@/componentes/colaborador-360/header";
import { GraficoEvolucao } from "@/componentes/colaborador-360/grafico-evolucao";
import { ProximosPassos } from "@/componentes/colaborador-360/proximos-passos";
import { Potencial360 } from "@/componentes/colaborador-360/potencial-360";
import { ResumoIA } from "@/componentes/colaborador-360/resumo-ia";
import { Riscos360 } from "@/componentes/colaborador-360/riscos-360";

const NIVEL: Record<string, { texto: string; cor: string }> = {
  ADERENTE: { texto: "Aderente", cor: "var(--feedback-success, #15803d)" },
  ATENCAO: { texto: "Atenção", cor: "var(--amber-700, #714E08)" },
  RISCO: { texto: "Em risco", cor: "var(--feedback-danger, #b91c1c)" },
};

interface Desempenho {
  classificacao: { chave: string; rotulo: string } | null;
  notaAtual: number | null;
  notaAnterior: number | null;
  tendencia: number | null;
  totalCriterios: number;
  criteriosAvaliados: number;
  evolucao: { ciclo: string; dtFim: string; nota: number }[];
  distribuicao: { chave: string; rotulo: string; quantidade: number; percentual: number }[];
  destaques: { competencia: string; nota: number }[];
  atencao: { competencia: string; nota: number }[];
}

/**
 * Visão 360 (performance-360, Fase 4) — resumo executivo, evolução, distribuição,
 * destaques / pontos de atenção e próximos passos. Prioridade de leitura:
 * resumo → evolução → destaques → atenção → próximos passos → contexto.
 */
export function Visao360({ dados }: { dados: Colaborador360 }) {
  const codFun = dados.colaborador.codFun;
  const [d, setD] = useState<Desempenho | null>(null);
  const nivel = NIVEL[dados.aderencia.nivel];

  useEffect(() => {
    void api<Desempenho>(`/gestao-pessoas/colaboradores/${codFun}/desempenho`).then((r) => {
      if (r.status === 200 && r.json) setD(r.json);
    });
  }, [codFun]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Resumo inteligente por IA */}
      <ResumoIA codFun={codFun} />

      {/* Resumo executivo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
        <Cartao titulo="Nota geral">
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 700 }}>{d?.notaAtual != null ? d.notaAtual.toFixed(1) : "—"}</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>de 5,0</span>
          </div>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            {d?.classificacao ? <span style={{ fontWeight: 600 }}>{d.classificacao.rotulo}</span> : <span style={{ color: "var(--text-muted)" }}>Sem avaliação</span>}
            {d?.tendencia != null && d.tendencia !== 0 && (
              <span style={{ marginLeft: 8, color: d.tendencia > 0 ? "var(--feedback-success, #15803d)" : "var(--feedback-danger, #b91c1c)" }}>
                {d.tendencia > 0 ? "▲" : "▼"} {Math.abs(d.tendencia).toFixed(1)}
              </span>
            )}
          </div>
        </Cartao>

        <Cartao titulo="Avaliação">
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            {d ? `${d.criteriosAvaliados}/${d.totalCriterios}` : "—"}
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}> critérios avaliados</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            {dados.avaliacao?.avaliador ? `Avaliador: ${dados.avaliacao.avaliador}` : "Sem avaliador definido"}
          </div>
        </Cartao>

        <Cartao titulo="Aderência ao desenvolvimento">
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 30, fontWeight: 700 }}>{dados.aderencia.score}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: nivel.cor }}>{nivel.texto}</span>
          </div>
        </Cartao>

        <Cartao titulo="Desenvolvimento">
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>
            <div>{dados.resumo.planosAtivos} plano(s) · {dados.resumo.acoesPendentes} ação(ões) pendente(s)</div>
            <div>
              Metas: {dados.resumo.metasConcluidas}/{dados.resumo.metasTotal} concluídas ({dados.resumo.metasProgresso}%)
              {dados.resumo.metasEmRisco > 0 && (
                <span style={{ color: "var(--feedback-danger, #b91c1c)" }}> · {dados.resumo.metasEmRisco} em risco/atraso</span>
              )}
            </div>
            <div>
              {dados.resumo.feedbacks} feedback(s)
              {dados.resumo.feedbacksSemCiencia > 0 && (
                <span style={{ color: "var(--amber-700, #714E08)" }}> · {dados.resumo.feedbacksSemCiencia} sem ciência</span>
              )}
            </div>
            <div>
              Treinos: {dados.resumo.treinosConcluidos} concluído(s) · {dados.resumo.treinosPendentes} em curso
              {dados.resumo.treinosVencidos > 0 && (
                <span style={{ color: "var(--feedback-danger, #b91c1c)" }}> · {dados.resumo.treinosVencidos} vencido(s)</span>
              )}
            </div>
          </div>
        </Cartao>
      </div>

      {/* Riscos e alertas */}
      <Riscos360 codFun={codFun} />

      {/* Potencial (9-box) */}
      <Potencial360 codFun={codFun} />

      {/* Evolução + distribuição */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12 }}>
        <Cartao titulo="Evolução no período">
          {d ? <GraficoEvolucao pontos={d.evolucao.map((e) => ({ rotulo: e.ciclo, valor: e.nota }))} /> : <Carregando />}
        </Cartao>
        <Cartao titulo="Resumo da avaliação">
          {d ? <Distribuicao dados={d.distribuicao} total={d.criteriosAvaliados} /> : <Carregando />}
        </Cartao>
      </div>

      {/* Destaques + atenção */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Cartao titulo="Maiores destaques">
          <ListaCompetencias itens={d?.destaques ?? null} cor="var(--feedback-success, #15803d)" vazio="Sem competências avaliadas." />
        </Cartao>
        <Cartao titulo="Pontos de atenção">
          <ListaCompetencias itens={d?.atencao ?? null} cor="var(--amber-700, #714E08)" vazio="Sem competências avaliadas." />
        </Cartao>
      </div>

      {/* Próximos passos */}
      <ProximosPassos codFun={codFun} />
    </div>
  );
}

function Distribuicao({ dados, total }: { dados: Desempenho["distribuicao"]; total: number }) {
  if (total === 0) return <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhum critério avaliado ainda.</p>;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {dados.map((f) => (
        <div key={f.chave}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
            <span>{f.rotulo}</span>
            <span style={{ color: "var(--text-muted)" }}>{f.percentual}% ({f.quantidade})</span>
          </div>
          <div style={{ height: 6, background: "var(--border-default)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${f.percentual}%`, background: "var(--brand-700)", borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListaCompetencias({ itens, cor, vazio }: { itens: { competencia: string; nota: number }[] | null; cor: string; vazio: string }) {
  if (itens === null) return <Carregando />;
  if (itens.length === 0) return <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{vazio}</p>;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {itens.map((c, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 13 }}>{c.competencia}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: cor, flexShrink: 0 }}>★ {c.nota.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--border-default)", borderRadius: 10, padding: 16, background: "var(--surface-default)" }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>{titulo}</div>
      {children}
    </div>
  );
}

function Carregando() {
  return <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Carregando…</p>;
}
