"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { NIVEL } from "@/componentes/aderencia-funcionario";

interface LinhaAderencia {
  codFun: string;
  nomeFun: string;
  numCad: string | null;
  score: number;
  nivel: "ADERENTE" | "ATENCAO" | "RISCO";
  motivos: string[];
}

export default function PaginaPainelAderencia() {
  const [linhas, setLinhas] = useState<LinhaAderencia[] | null>(null);

  useEffect(() => {
    void api<LinhaAderencia[]>("/gestao-pessoas/aderencia").then((r) => {
      if (r.status === 200 && r.json) setLinhas(r.json);
    });
  }, []);

  const contagem = (nivel: string) => (linhas ?? []).filter((l) => l.nivel === nivel).length;

  return (
    <main style={{ padding: 32, maxWidth: 920 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>Painel de aderência</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 20px", lineHeight: 1.6, maxWidth: 680 }}>
        Quem está engajando no próprio desenvolvimento e quem precisa de atenção — derivado dos planos,
        feedbacks e do desempenho. Ordenado do menor score ao maior: quem precisa aparece primeiro.
      </p>

      {linhas === null ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>
      ) : linhas.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Nenhum funcionário ativo para acompanhar.</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {(["RISCO", "ATENCAO", "ADERENTE"] as const).map((n) => (
              <div key={n} style={{ border: "1px solid var(--border-default)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: NIVEL[n].cor }}>{contagem(n)}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{NIVEL[n].texto}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            {linhas.map((l) => {
              const nv = NIVEL[l.nivel];
              return (
                <div key={l.codFun} style={{ display: "flex", alignItems: "center", gap: 14, border: "1px solid var(--border-default)", borderLeft: `4px solid ${nv.cor}`, borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ width: 44, textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{l.score}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{l.nomeFun}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.motivos.length > 0 ? l.motivos.join(" · ") : "Tudo em dia"}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: nv.cor, flexShrink: 0 }}>{nv.texto}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
