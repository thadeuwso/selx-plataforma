"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Alerta {
  chave: string;
  tipo: string;
  nivel: "BAIXO" | "MEDIO" | "ALTO";
  titulo: string;
  regra: string;
  evidencias: string[];
  acaoRecomendada: string;
  status: string;
}

const NIVEL: Record<string, { texto: string; cor: string }> = {
  ALTO: { texto: "Alto", cor: "var(--feedback-danger, #b91c1c)" },
  MEDIO: { texto: "Médio", cor: "var(--amber-700, #714E08)" },
  BAIXO: { texto: "Baixo", cor: "var(--text-muted)" },
};
const botao: React.CSSProperties = {
  padding: "3px 10px", borderRadius: 6, border: "1px solid var(--border-default)",
  background: "var(--surface-default)", color: "var(--text-body)", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
};

/**
 * Riscos e alertas (RN-GP-033). Cada alerta mostra a REGRA que o disparou e as
 * evidências — nada de caixa-preta. A decisão é humana: revisar ou descartar.
 */
export function Riscos360({ codFun }: { codFun: string }) {
  const [itens, setItens] = useState<Alerta[] | null>(null);
  const [abrir, setAbrir] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<{ itens: Alerta[] }>(`/gestao-pessoas/colaboradores/${codFun}/riscos`);
    if (r.status === 200 && r.json) setItens(r.json.itens);
  }, [codFun]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function agir(chave: string, status: string) {
    await api(`/gestao-pessoas/colaboradores/${codFun}/riscos/${chave}`, { metodo: "PATCH", corpo: { status } });
    await carregar();
  }

  if (!itens) return null;

  return (
    <div style={{ border: "1px solid var(--border-default)", borderRadius: 10, padding: 16, background: "var(--surface-default)" }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
        Riscos e alertas {itens.length > 0 && <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}>· {itens.length}</span>}
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>Por regras transparentes — cada um mostra a regra e as evidências.</p>

      {itens.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--feedback-success, #15803d)", margin: 0 }}>✓ Nenhum alerta ativo.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {itens.map((a) => {
            const nv = NIVEL[a.nivel];
            const aberto = abrir === a.chave;
            return (
              <div key={a.chave} style={{ border: "1px solid var(--border-default)", borderLeft: `3px solid ${nv.cor}`, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{a.titulo}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: nv.cor, marginLeft: 8 }}>{nv.texto}</span>
                    {a.status === "EM_REVISAO" && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>· em revisão</span>}
                  </div>
                  <button onClick={() => setAbrir(aberto ? null : a.chave)} style={{ ...botao, border: "none", color: "var(--text-link)" }}>{aberto ? "Fechar" : "Detalhes"}</button>
                </div>
                {aberto && (
                  <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 12 }}><strong>Regra:</strong> {a.regra}</div>
                    <div style={{ fontSize: 12 }}>
                      <strong>Evidências:</strong>
                      <ul style={{ margin: "2px 0 0", paddingLeft: 18 }}>{a.evidencias.map((e, i) => <li key={i}>{e}</li>)}</ul>
                    </div>
                    <div style={{ fontSize: 12 }}><strong>Ação recomendada:</strong> {a.acaoRecomendada}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      {a.status !== "EM_REVISAO" && <button onClick={() => agir(a.chave, "EM_REVISAO")} style={botao}>Marcar em revisão</button>}
                      <button onClick={() => agir(a.chave, "RESOLVIDO")} style={botao}>Resolver</button>
                      <button onClick={() => agir(a.chave, "DESCARTADO")} style={botao}>Descartar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
