"use client";
import { useState } from "react";
import { FATORES_COMPORTAMENTAIS, ROTULO_STATUS_CONVITE } from "./recrutamento-compartilhado";

const ROTULO_FAIXA: Record<string, string> = {
  muito_baixa: "Muito baixa",
  baixa: "Baixa",
  moderada: "Moderada",
  alta: "Alta",
  muito_alta: "Muito alta",
};

const ROTULO_CONSISTENCIA: Record<string, string> = {
  ADEQUADA: "Adequada",
  REQUER_ATENCAO: "Requer atenção (muitas respostas neutras)",
  BAIXA_CONSISTENCIA: "Baixa consistência (respostas muito uniformes)",
};

export interface FacetaComportamental {
  codFat: string;
  faceta: string;
  percentualNormalizado: number;
  quantidade: number;
}

export interface DetalheComportamental {
  status: string;
  facetas: FacetaComportamental[];
  sessao: {
    dhConclusao: string | null;
    tempoTotalSeg: number | null;
    resultado: {
      indicadorConsistencia: string;
      percRespNeutras: number;
      percRespUniformes: number;
      fatores: { fator: { sigla: string; nome: string }; percentualNormalizado: number; faixaInterpretativa: string }[];
      aderencias: {
        aderenciaGeral: number;
        fatores: { fator: { sigla: string; nome: string }; distanciaFaixa: number; aderenciaDimensao: number; dentroDaFaixa: string }[];
      }[];
    } | null;
  } | null;
  aderenciaPadrao: {
    aderenciaGeral: number;
    fatores: { fator: { sigla: string; nome: string }; distanciaFaixa: number; aderenciaDimensao: number; dentroDaFaixa: string }[];
  } | null;
}

function formatarTempo(segundos: number | null) {
  if (segundos == null) return null;
  const min = Math.floor(segundos / 60);
  return `${min}min ${String(segundos % 60).padStart(2, "0")}s`;
}

/**
 * Perfil comportamental em formato compacto.
 *
 * A versão anterior desenhava as ~30 facetas sempre abertas, empilhadas: para
 * ler qualquer outra coisa era preciso rolar por tudo. Aqui os 4 fatores viram
 * cartões lado a lado — que é o nível em que a decisão acontece — e as facetas
 * ficam atrás de um clique, para quem quiser descer ao detalhe.
 */
export function PerfilComportamentalVisao({
  comportamental,
  convidando,
  aoConvidar,
}: {
  comportamental: DetalheComportamental | "sem_convite" | null;
  convidando: boolean;
  aoConvidar: () => void;
}) {
  const [fatorAberto, setFatorAberto] = useState<string | null>(null);

  if (comportamental === null) {
    return <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Carregando…</p>;
  }

  if (comportamental === "sem_convite") {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Este candidato ainda não recebeu a avaliação comportamental.
        </p>
        <button
          onClick={aoConvidar}
          disabled={convidando}
          style={{
            padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border-default)",
            background: "var(--surface-default)", fontSize: 13, cursor: "pointer",
            fontFamily: "inherit", width: "fit-content",
          }}
        >
          {convidando ? "Gerando link…" : "Convidar para a avaliação"}
        </button>
      </div>
    );
  }

  const resultado = comportamental.sessao?.resultado;
  if (!resultado) {
    return (
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
        {ROTULO_STATUS_CONVITE[comportamental.status] ?? comportamental.status} — aguardando o candidato concluir.
      </p>
    );
  }

  const aderenciaVaga = resultado.aderencias[0] ?? comportamental.aderenciaPadrao ?? undefined;
  const aderenciaViaPadrao = !resultado.aderencias[0] && !!comportamental.aderenciaPadrao;
  const facetas = [...comportamental.facetas].sort((a, b) => b.percentualNormalizado - a.percentualNormalizado);
  const maiorForca = facetas[0];
  const maiorAtencao = facetas[facetas.length - 1];
  const tempo = formatarTempo(comportamental.sessao?.tempoTotalSeg ?? null);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "baseline", fontSize: 12, color: "var(--text-muted)" }}>
        <span>{facetas.reduce((s, f) => s + f.quantidade, 0)} respostas</span>
        {tempo && <span>· {tempo} de duração</span>}
        {aderenciaVaga && (
          <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-body)" }}>
            Aderência à vaga{" "}
            <strong style={{ fontSize: 18, fontWeight: 700 }}>{aderenciaVaga.aderenciaGeral}</strong>
            {aderenciaViaPadrao && <span style={{ color: "var(--text-muted)" }}> (padrão da empresa)</span>}
          </span>
        )}
      </div>

      {resultado.indicadorConsistencia !== "ADEQUADA" && (
        <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--amber-100, #F2E3C4)", color: "var(--amber-700, #714E08)", fontSize: 12 }}>
          ⚠ {ROTULO_CONSISTENCIA[resultado.indicadorConsistencia] ?? resultado.indicadorConsistencia}
          {" — "}
          {Math.round(resultado.percRespNeutras)}% de respostas neutras, {Math.round(resultado.percRespUniformes)}% na mesma alternativa.
        </div>
      )}

      {maiorForca && maiorAtencao && maiorForca.faceta !== maiorAtencao.faceta && (
        // Largura contida: esticados na gaveta inteira, dois cartões com três
        // linhas de texto viram duas faixas quase vazias.
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 260px))", gap: 10 }}>
          <Destaque rotulo="Ponto mais forte" faceta={maiorForca.faceta} valor={maiorForca.percentualNormalizado} />
          <Destaque rotulo="Ponto de atenção" faceta={maiorAtencao.faceta} valor={maiorAtencao.percentualNormalizado} />
        </div>
      )}

      {/* Os 4 fatores lado a lado: é o nível em que o recrutador compara.
          `alignItems: start` impede que abrir as facetas de um fator estique
          os outros três até a mesma altura, deixando caixas vazias ao lado. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10, alignItems: "start" }}>
        {FATORES_COMPORTAMENTAIS.map((f) => {
          const rf = resultado.fatores.find((x) => x.fator.sigla === f.sigla);
          if (!rf) return null;
          const af = aderenciaVaga?.fatores.find((x) => x.fator.sigla === f.sigla);
          const facetasFator = facetas.filter((x) => x.codFat === f.sigla);
          const aberto = fatorAberto === f.sigla;
          return (
            <div key={f.sigla} style={{ border: "1px solid var(--border-default)", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{f.rotulo}</span>
                <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {Math.round(rf.percentualNormalizado)}%
                </span>
              </div>
              <div style={{ height: 6, background: "var(--border-default)", borderRadius: 999, overflow: "hidden", margin: "6px 0 4px" }}>
                <div style={{ height: "100%", width: `${rf.percentualNormalizado}%`, background: "var(--brand-700)" }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {ROTULO_FAIXA[rf.faixaInterpretativa] ?? rf.faixaInterpretativa}
              </div>
              {af && (
                <div style={{ fontSize: 11, marginTop: 4, color: af.dentroDaFaixa === "S" ? "var(--green-700, #1D533B)" : "var(--red-600, #9A3833)" }}>
                  {af.dentroDaFaixa === "S" ? "Dentro da faixa da vaga" : `Fora da faixa (aderência ${af.aderenciaDimensao})`}
                </div>
              )}
              {facetasFator.length > 0 && (
                <>
                  <button
                    onClick={() => setFatorAberto(aberto ? null : f.sigla)}
                    style={{
                      marginTop: 8, background: "none", border: "none", padding: 0,
                      color: "var(--text-link)", cursor: "pointer", fontFamily: "inherit", fontSize: 11,
                    }}
                  >
                    {aberto ? "ocultar facetas" : `ver ${facetasFator.length} facetas`}
                  </button>
                  {aberto && (
                    <div style={{ marginTop: 8, display: "grid", gap: 5 }}>
                      {facetasFator.map((ft) => (
                        <div key={ft.faceta} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", flex: "0 0 46%" }}>{ft.faceta}</span>
                          <div style={{ flex: 1, height: 4, background: "var(--border-default)", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${ft.percentualNormalizado}%`, background: "var(--brand-500, #8A5B3F)" }} />
                          </div>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", width: 30, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                            {Math.round(ft.percentualNormalizado)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Destaque({ rotulo, faceta, valor }: { rotulo: string; faceta: string; valor: number }) {
  return (
    <div style={{ border: "1px solid var(--border-default)", borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{rotulo}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{faceta}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{Math.round(valor)}%</div>
    </div>
  );
}
