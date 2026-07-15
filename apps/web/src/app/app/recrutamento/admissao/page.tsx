"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface ProcessoAdmissao {
  codAdmProc: string;
  codCdt: string;
  status: string;
  dhInicio: string;
  candidatura: { candidato: { nomeCand: string }; vaga: { titulo: string } };
}

const celula: React.CSSProperties = { padding: "10px 14px" };

const CORES_STATUS: Record<string, { fundo: string; texto: string; rotulo: string }> = {
  AGUARDANDO_CANDIDATO: { fundo: "var(--neutral-100)", texto: "var(--text-muted)", rotulo: "Aguardando candidato" },
  AGUARDANDO_APROVACAO_DP: { fundo: "var(--amber-100, #F2E3C4)", texto: "var(--amber-700, #714E08)", rotulo: "Aguardando aprovação do DP" },
  AJUSTES_SOLICITADOS: { fundo: "var(--amber-100, #F2E3C4)", texto: "var(--amber-700, #714E08)", rotulo: "Ajustes solicitados" },
  APROVADO: { fundo: "var(--green-100, #D6E9DF)", texto: "var(--green-700, #1D533B)", rotulo: "Aprovado" },
};

export default function PaginaAdmissao() {
  const [processos, setProcessos] = useState<ProcessoAdmissao[]>([]);

  const carregar = useCallback(async () => {
    const r = await api<ProcessoAdmissao[]>("/admissoes");
    if (r.status === 200 && r.json) setProcessos(r.json);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <main style={{ padding: 32 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Admissão</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Processos de admissão em andamento — o candidato preenche dados e documentos por um link público, e o DP
          revisa aqui.
        </p>
      </header>

      <div style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "var(--surface-page)", textAlign: "left" }}>
              <th style={{ ...celula, fontWeight: 600 }}>Candidato</th>
              <th style={{ ...celula, fontWeight: 600 }}>Vaga</th>
              <th style={{ ...celula, fontWeight: 600 }}>Status</th>
              <th style={{ ...celula, fontWeight: 600 }}>Início</th>
            </tr>
          </thead>
          <tbody>
            {processos.map((p) => {
              const cor = CORES_STATUS[p.status] ?? CORES_STATUS.AGUARDANDO_CANDIDATO;
              return (
                <tr key={p.codAdmProc} style={{ borderTop: "1px solid var(--border-default)" }}>
                  <td style={celula}>
                    <Link href={`/app/recrutamento/admissao/${p.codCdt}`} style={{ color: "var(--text-link)" }}>
                      {p.candidatura.candidato.nomeCand}
                    </Link>
                  </td>
                  <td style={{ ...celula, color: "var(--text-muted)" }}>{p.candidatura.vaga.titulo}</td>
                  <td style={celula}>
                    <span style={{ background: cor.fundo, color: cor.texto, padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                      {cor.rotulo}
                    </span>
                  </td>
                  <td style={{ ...celula, color: "var(--text-muted)" }}>{new Date(p.dhInicio).toLocaleDateString("pt-BR")}</td>
                </tr>
              );
            })}
            {processos.length === 0 && (
              <tr>
                <td style={{ ...celula, color: "var(--text-muted)" }} colSpan={4}>
                  Nenhum processo de admissão ainda — inicie um a partir de uma candidatura em &quot;Contratado&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
