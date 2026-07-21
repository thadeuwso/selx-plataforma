"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ChipScore, ListaPaginada, ROTULO_STATUS_CONVITE, useVagaContexto, type Candidatura } from "@/componentes/recrutamento-compartilhado";
import { CandidatoDrawer } from "@/componentes/candidato-drawer";

export default function AvaliacoesVaga() {
  const { codVag } = useParams<{ codVag: string }>();
  const { recarregarToken, pedirRecarga } = useVagaContexto();
  const [itens, setItens] = useState<Candidatura[]>([]);
  const [drawerCodCdt, setDrawerCodCdt] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<ListaPaginada>(`/vagas/${codVag}/candidaturas?tamanhoPagina=200&ordenar=prioridade`);
    if (r.status === 200 && r.json) setItens(r.json.itens.filter((c) => c.convitesComportamentais.length > 0));
  }, [codVag]);

  useEffect(() => { void carregar(); }, [carregar, recarregarToken]);

  const cel: React.CSSProperties = { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid var(--border-default)", textAlign: "left" };

  function statusTexto(c: Candidatura) {
    const conv = c.convitesComportamentais[0];
    if (conv?.sessao?.resultado) {
      const ader = conv.sessao.resultado.aderencias[0]?.aderenciaGeral;
      return { texto: ader != null ? `Concluída · aderência ${ader}` : "Concluída", cor: "var(--green-700, #1D533B)" };
    }
    return { texto: ROTULO_STATUS_CONVITE[conv?.status ?? ""] ?? "Pendente", cor: "var(--amber-700, #714E08)" };
  }

  return (
    <main style={{ padding: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>Avaliações comportamentais ({itens.length})</h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 12px" }}>Candidaturas que já receberam convite de avaliação.</p>
      {itens.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Nenhuma avaliação solicitada ainda — convide candidatos pela lista ou pelo painel do candidato.</p>
      ) : (
        <div style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface-page)" }}>
                <th style={{ ...cel, fontWeight: 600, color: "var(--text-muted)" }}>Candidato</th>
                <th style={{ ...cel, fontWeight: 600, color: "var(--text-muted)" }}>Status da avaliação</th>
                <th style={{ ...cel, fontWeight: 600, color: "var(--text-muted)" }}>Aderência à vaga</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((c) => {
                const st = statusTexto(c);
                const ader = c.convitesComportamentais[0]?.sessao?.resultado?.aderencias[0]?.aderenciaGeral;
                return (
                  <tr key={c.codCdt} onClick={() => setDrawerCodCdt(c.codCdt)} style={{ cursor: "pointer" }}>
                    <td style={cel}>
                      <div style={{ fontWeight: 600 }}>{c.candidato.nomeCand}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.candidato.email}</div>
                    </td>
                    <td style={{ ...cel, color: st.cor }}>{st.texto}</td>
                    <td style={cel}>{ader != null ? <ChipScore score={ader} /> : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <CandidatoDrawer codCdt={drawerCodCdt} fechar={() => setDrawerCodCdt(null)} aoAtualizar={() => { void carregar(); pedirRecarga(); }} />
    </main>
  );
}
