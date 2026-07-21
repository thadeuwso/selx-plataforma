"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ChipScore, ListaPaginada, useVagaContexto, type Candidatura } from "@/componentes/recrutamento-compartilhado";
import { CandidatoDrawer } from "@/componentes/candidato-drawer";

export default function EntrevistasVaga() {
  const { codVag } = useParams<{ codVag: string }>();
  const { recarregarToken, pedirRecarga } = useVagaContexto();
  const [itens, setItens] = useState<Candidatura[]>([]);
  const [drawerCodCdt, setDrawerCodCdt] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<ListaPaginada>(`/vagas/${codVag}/candidaturas?estagio=interview&tamanhoPagina=200&ordenar=prioridade`);
    if (r.status === 200 && r.json) setItens(r.json.itens);
  }, [codVag]);

  useEffect(() => { void carregar(); }, [carregar, recarregarToken]);

  const cel: React.CSSProperties = { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--border-default)", textAlign: "left" };

  return (
    <main style={{ padding: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>Em entrevista ({itens.length})</h2>
      {itens.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Nenhum candidato na etapa de entrevista.</p>
      ) : (
        <div style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface-page)" }}>
                <th style={{ ...cel, fontWeight: 600, color: "var(--text-muted)" }}>Candidato</th>
                <th style={{ ...cel, fontWeight: 600, color: "var(--text-muted)" }}>Cargo atual</th>
                <th style={{ ...cel, fontWeight: 600, color: "var(--text-muted)" }}>Aderência</th>
                <th style={{ ...cel, fontWeight: 600, color: "var(--text-muted)" }}>Origem</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((c) => (
                <tr key={c.codCdt} onClick={() => setDrawerCodCdt(c.codCdt)} style={{ cursor: "pointer" }}>
                  <td style={cel}>
                    <div style={{ fontWeight: 600 }}>{c.candidato.nomeCand}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.candidato.email}</div>
                  </td>
                  <td style={{ ...cel, color: "var(--text-muted)" }}>{c.candidato.cargoAtual ?? "—"}</td>
                  <td style={cel}><ChipScore score={c.match?.scoreContratacao} /></td>
                  <td style={{ ...cel, color: "var(--text-muted)" }}>{c.canal.nomeCanal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CandidatoDrawer codCdt={drawerCodCdt} fechar={() => setDrawerCodCdt(null)} aoAtualizar={() => { void carregar(); pedirRecarga(); }} />
    </main>
  );
}
