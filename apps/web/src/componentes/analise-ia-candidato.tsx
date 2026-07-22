"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Erro } from "@/componentes/formulario";

interface ItemComEvidencia {
  ponto: string;
  evidencia: string;
}
interface Risco {
  risco: string;
  severidade: "BAIXA" | "MEDIA" | "ALTA";
  motivo: string;
}
interface PerguntaSugerida {
  pergunta: string;
  motivo: string;
}
export interface ConteudoAnalise {
  resumoExecutivo: string;
  aderenciaTecnica: {
    sintese: string;
    atende: string[];
    atendeParcialmente: string[];
    naoAtende: string[];
    impactoNaVaga: string;
  };
  aderenciaComportamental: {
    sintese: string;
    padroesObservados: string[];
    impactoNaEquipe: string;
  } | null;
  pontosFortes: ItemComEvidencia[];
  pontosAtencao: ItemComEvidencia[];
  riscos: Risco[];
  perguntasEntrevista: PerguntaSugerida[];
  proximoPasso: string;
  dadosFaltantes: string[];
}
interface Analise {
  conteudoJson: ConteudoAnalise;
  provedor: string | null;
  modeloUsado: string | null;
  dhInc: string;
  desatualizada: boolean;
}

const COR_SEVERIDADE: Record<Risco["severidade"], string> = {
  BAIXA: "var(--text-muted)",
  MEDIA: "var(--amber-700, #714E08)",
  ALTA: "var(--feedback-danger, #b91c1c)",
};

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 8px" }}>{titulo}</h4>
      {children}
    </section>
  );
}

/** Lista de requisitos com o sinal do dossiê — verde/âmbar/vermelho, sem inventar grau. */
function ListaRequisitos({ itens, cor }: { itens: string[]; cor: string }) {
  if (itens.length === 0) return null;
  return (
    <ul style={{ margin: "0 0 8px", paddingLeft: 0, listStyle: "none", display: "grid", gap: 4 }}>
      {itens.map((item) => (
        <li key={item} style={{ fontSize: 12, display: "flex", gap: 8 }}>
          <span aria-hidden style={{ color: cor, flexShrink: 0 }}>●</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Análise de candidato por IA.
 *
 * A evidência aparece SEMPRE junto do ponto, em vez de escondida num tooltip:
 * a citação é o que permite ao recrutador conferir se a afirmação se sustenta —
 * esconder isso transformaria a análise em opinião de caixa-preta.
 */
export function AnaliseIaCandidato({ codCdt }: { codCdt: string }) {
  const [analise, setAnalise] = useState<Analise | null | "nenhuma">(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<Analise | null>(`/candidaturas/${codCdt}/analise-ia`);
    setAnalise(r.status === 200 && r.json ? r.json : "nenhuma");
  }, [codCdt]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function gerar() {
    setErro(null);
    setGerando(true);
    const r = await api<Analise>(`/candidaturas/${codCdt}/analise-ia`, { metodo: "POST" });
    setGerando(false);
    if (r.status !== 200 && r.status !== 201) {
      setErro("Não foi possível gerar a análise agora. O serviço de IA pode estar indisponível.");
      return;
    }
    if (r.json) setAnalise(r.json);
  }

  if (analise === null) return <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>;

  if (analise === "nenhuma") {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>
          A IA lê o currículo, as respostas de triagem e o resultado comportamental e devolve uma
          leitura em linguagem de recrutador — pontos fortes e de risco, cada um com a citação que o
          sustenta, e perguntas para a entrevista.
          <br />
          <strong style={{ fontWeight: 600 }}>Ela não pontua e não recomenda contratar:</strong> o
          score continua sendo o do match determinístico.
        </p>
        <Erro mensagem={erro} />
        <div>
          <BotaoPrimario onClick={gerar} disabled={gerando}>
            {gerando ? "Analisando…" : "Analisar candidato"}
          </BotaoPrimario>
        </div>
      </div>
    );
  }

  const c = analise.conteudoJson;
  return (
    <div style={{ display: "grid", gap: 18, fontSize: 13 }}>
      {analise.desatualizada && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "var(--amber-100, #F2E3C4)",
            color: "var(--amber-700, #714E08)",
            fontSize: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>Algo mudou desde esta análise (currículo, avaliação ou requisitos).</span>
          <button
            onClick={gerar}
            disabled={gerando}
            style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 600, background: "none", border: "none", cursor: "pointer", color: "inherit", textDecoration: "underline" }}
          >
            {gerando ? "Analisando…" : "Refazer"}
          </button>
        </div>
      )}

      <Erro mensagem={erro} />

      <Secao titulo="Resumo executivo">
        <p style={{ margin: 0, lineHeight: 1.6 }}>{c.resumoExecutivo}</p>
      </Secao>

      <Secao titulo="Aderência técnica">
        <p style={{ margin: "0 0 10px", lineHeight: 1.6, color: "var(--text-muted)" }}>{c.aderenciaTecnica.sintese}</p>
        <ListaRequisitos itens={c.aderenciaTecnica.atende} cor="var(--feedback-success, #15803d)" />
        <ListaRequisitos itens={c.aderenciaTecnica.atendeParcialmente} cor="var(--amber-700, #714E08)" />
        <ListaRequisitos itens={c.aderenciaTecnica.naoAtende} cor="var(--feedback-danger, #b91c1c)" />
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{c.aderenciaTecnica.impactoNaVaga}</p>
      </Secao>

      {c.aderenciaComportamental && (
        <Secao titulo="Aderência comportamental">
          <p style={{ margin: "0 0 6px", lineHeight: 1.6 }}>{c.aderenciaComportamental.sintese}</p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>{c.aderenciaComportamental.impactoNaEquipe}</p>
        </Secao>
      )}

      {c.pontosFortes.length > 0 && (
        <Secao titulo="Pontos fortes">
          <div style={{ display: "grid", gap: 8 }}>
            {c.pontosFortes.map((p) => (
              <ItemEvidenciado key={p.ponto} ponto={p.ponto} evidencia={p.evidencia} cor="var(--feedback-success, #15803d)" />
            ))}
          </div>
        </Secao>
      )}

      {c.pontosAtencao.length > 0 && (
        <Secao titulo="Pontos de atenção">
          <div style={{ display: "grid", gap: 8 }}>
            {c.pontosAtencao.map((p) => (
              <ItemEvidenciado key={p.ponto} ponto={p.ponto} evidencia={p.evidencia} cor="var(--amber-700, #714E08)" />
            ))}
          </div>
        </Secao>
      )}

      {c.riscos.length > 0 && (
        <Secao titulo="Riscos">
          <div style={{ display: "grid", gap: 8 }}>
            {c.riscos.map((r) => (
              <div key={r.risco} style={{ borderLeft: `3px solid ${COR_SEVERIDADE[r.severidade]}`, paddingLeft: 10 }}>
                <div style={{ fontWeight: 500 }}>
                  {r.risco}{" "}
                  <span style={{ fontSize: 11, color: COR_SEVERIDADE[r.severidade], fontWeight: 600 }}>
                    {r.severidade}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.motivo}</div>
              </div>
            ))}
          </div>
        </Secao>
      )}

      {c.perguntasEntrevista.length > 0 && (
        <Secao titulo="Perguntas para a entrevista">
          <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
            {c.perguntasEntrevista.map((p) => (
              <li key={p.pergunta}>
                <div>{p.pergunta}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.motivo}</div>
              </li>
            ))}
          </ol>
        </Secao>
      )}

      <Secao titulo="Próximo passo sugerido">
        <p style={{ margin: 0, lineHeight: 1.6 }}>{c.proximoPasso}</p>
      </Secao>

      {c.dadosFaltantes.length > 0 && (
        <Secao titulo="O que faltou para a análise">
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
            {c.dadosFaltantes.join(" · ")} — a leitura acima é limitada por essa ausência.
          </p>
        </Secao>
      )}

      <footer style={{ fontSize: 11, color: "var(--text-muted)", borderTop: "1px solid var(--border-default)", paddingTop: 10, lineHeight: 1.5 }}>
        Análise gerada em {new Date(analise.dhInc).toLocaleString("pt-BR")} ·{" "}
        {analise.provedor === "ollama" ? "modelo local" : "modelo em nuvem"}
        {analise.modeloUsado ? ` (${analise.modeloUsado})` : ""}.
        <br />
        Apoio à decisão — não substitui a avaliação do recrutador, e não produz nota.
      </footer>
    </div>
  );
}

function ItemEvidenciado({ ponto, evidencia, cor }: { ponto: string; evidencia: string; cor: string }) {
  return (
    <div style={{ borderLeft: `3px solid ${cor}`, paddingLeft: 10 }}>
      <div style={{ fontWeight: 500 }}>{ponto}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>“{evidencia}”</div>
    </div>
  );
}
