"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Selecao } from "@/componentes/formulario";
import { rotuloEstagio } from "@/componentes/recrutamento-compartilhado";

interface Relatorio {
  janelaDias: number;
  totais: { candidaturas: number; vagasAbertas: number; novasVagas: number; contratacoes: number };
  funil: { etapa: string; alcancaram: number; taxaDaEtapaAnterior: number | null }[];
  tempoContratacao: { dias: number; baseContratacoes: number } | null;
  propostas: { enviadas: number; aceitas: number; recusadas: number; recusasComMotivo: number };
}

const cartao: React.CSSProperties = {
  background: "var(--surface-default)",
  border: "1px solid var(--border-default)",
  borderRadius: 12,
  padding: 18,
};

export default function PaginaRelatorio() {
  const [dados, setDados] = useState<Relatorio | null>(null);
  const [janela, setJanela] = useState(90);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const r = await api<Relatorio>(`/recrutamento/relatorio?dias=${janela}`);
    if (r.status === 200 && r.json) setDados(r.json);
    setCarregando(false);
  }, [janela]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const maxFunil = dados ? Math.max(1, ...dados.funil.map((f) => f.alcancaram)) : 1;

  return (
    <main style={{ padding: 32, maxWidth: 980 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px" }}>Relatório de recrutamento</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
            Candidaturas do período e o que aconteceu com elas.
          </p>
        </div>
        <Selecao value={String(janela)} onChange={(e) => setJanela(Number(e.target.value))} aria-label="Período">
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="180">Últimos 6 meses</option>
          <option value="365">Últimos 12 meses</option>
        </Selecao>
      </header>

      {carregando || !dados ? (
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Carregando…</p>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <Kpi rotulo="Candidaturas no período" valor={dados.totais.candidaturas} />
            <Kpi rotulo="Vagas abertas agora" valor={dados.totais.vagasAbertas} />
            <Kpi rotulo="Vagas criadas no período" valor={dados.totais.novasVagas} />
            <Kpi rotulo="Contratações" valor={dados.totais.contratacoes} destaque />
          </div>

          <section style={cartao}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Funil</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px" }}>
              Quantas candidaturas chegaram ao menos até cada etapa — quem foi entrevistado e recusado
              continua contando na entrevista. À direita, a conversão da etapa anterior.
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              {dados.funil.map((f) => (
                <div key={f.etapa} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, width: 150, flexShrink: 0 }}>{rotuloEstagio(f.etapa)}</span>
                  <div style={{ flex: 1, height: 22, background: "var(--surface-page)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(f.alcancaram / maxFunil) * 100}%`,
                        minWidth: f.alcancaram > 0 ? 2 : 0,
                        background: "var(--brand-700)",
                        borderRadius: 6,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, width: 44, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {f.alcancaram}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", width: 52, textAlign: "right" }}>
                    {f.taxaDaEtapaAnterior != null ? `${f.taxaDaEtapaAnterior}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <section style={cartao}>
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>Tempo até contratar</h2>
              {dados.tempoContratacao ? (
                <>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>
                    {dados.tempoContratacao.dias} <span style={{ fontSize: 16, fontWeight: 400, color: "var(--text-muted)" }}>dias em média</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "6px 0 0" }}>
                    Da candidatura até a contratação, sobre {dados.tempoContratacao.baseContratacoes} contratação(ões).
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                  Nenhuma contratação no período — sem base para calcular o tempo.
                </p>
              )}
            </section>

            <section style={cartao}>
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>Propostas</h2>
              {dados.propostas.enviadas === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhuma proposta enviada no período.</p>
              ) : (
                <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                  <Linha rotulo="Enviadas" valor={dados.propostas.enviadas} />
                  <Linha rotulo="Aceitas" valor={dados.propostas.aceitas} cor="var(--feedback-success, #15803d)" />
                  <Linha rotulo="Recusadas" valor={dados.propostas.recusadas} cor="var(--feedback-danger, #b91c1c)" />
                  {dados.propostas.recusadas > 0 && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "6px 0 0" }}>
                      {dados.propostas.recusasComMotivo} de {dados.propostas.recusadas} recusa(s) informaram o motivo —
                      veja no histórico de cada candidatura.
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </main>
  );
}

function Kpi({ rotulo, valor, destaque }: { rotulo: string; valor: number; destaque?: boolean }) {
  return (
    <div style={cartao}>
      <div style={{ fontSize: 28, fontWeight: 700, color: destaque && valor > 0 ? "var(--green-700, #1D533B)" : "var(--text-body)" }}>
        {valor}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{rotulo}</div>
    </div>
  );
}

function Linha({ rotulo, valor, cor }: { rotulo: string; valor: number; cor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--text-muted)" }}>{rotulo}</span>
      <span style={{ fontWeight: 600, color: cor }}>{valor}</span>
    </div>
  );
}
