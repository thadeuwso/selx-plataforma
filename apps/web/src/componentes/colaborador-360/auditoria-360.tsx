"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Log {
  codAud: string;
  operacao: string;
  origem: string;
  detalhe: Record<string, unknown> | null;
  dhAlt: string;
  usuario: string;
}

const OPERACAO: Record<string, { texto: string; cor: string }> = {
  VISUALIZACAO: { texto: "Visualização", cor: "var(--text-muted)" },
  IA_RESUMO: { texto: "Resumo por IA", cor: "var(--brand-700)" },
  IA_ROTEIRO: { texto: "Roteiro por IA", cor: "var(--brand-700)" },
  EXPORTACAO: { texto: "Exportação", cor: "var(--amber-700, #714E08)" },
};
const dataHora = (iso: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

/**
 * Trilha de auditoria do painel (RN-GP-034). Quem viu, gerou IA ou exportou os
 * dados deste colaborador, e quando. O painel expõe dados sensíveis — ver deixa
 * rastro.
 */
export function Auditoria360({ codFun }: { codFun: string }) {
  const [logs, setLogs] = useState<Log[] | null>(null);

  useEffect(() => {
    void api<Log[]>(`/gestao-pessoas/colaboradores/${codFun}/auditoria`).then((r) => {
      if (r.status === 200 && r.json) setLogs(r.json);
    });
  }, [codFun]);

  if (!logs) return <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
        Acessos, gerações de IA e exportações deste painel. Só leitura.
      </p>
      {logs.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhum registro ainda.</p>
      ) : (
        <div style={{ border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.6fr 1fr", gap: 8, padding: "10px 14px", background: "var(--surface-muted, rgba(0,0,0,.03))", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".03em" }}>
            <span>Ação</span>
            <span>Quem</span>
            <span style={{ textAlign: "right" }}>Quando</span>
          </div>
          {logs.map((l) => {
            const op = OPERACAO[l.operacao] ?? { texto: l.operacao, cor: "var(--text-muted)" };
            const prov = l.detalhe && typeof l.detalhe === "object" ? (l.detalhe as { provedor?: string }).provedor : undefined;
            return (
              <div key={l.codAud} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.6fr 1fr", gap: 8, padding: "10px 14px", borderTop: "1px solid var(--border-default)", fontSize: 13, alignItems: "center" }}>
                <span style={{ fontWeight: 600, color: op.cor }}>{op.texto}{prov ? <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}> · {prov}</span> : null}</span>
                <span>{l.usuario}</span>
                <span style={{ textAlign: "right", color: "var(--text-muted)", fontSize: 12 }}>{dataHora(l.dhAlt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
