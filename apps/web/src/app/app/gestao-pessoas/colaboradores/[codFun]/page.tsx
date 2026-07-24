"use client";
import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Colaborador360Header, type Colaborador360 } from "@/componentes/colaborador-360/header";
import { Visao360 } from "@/componentes/colaborador-360/visao-360";
import { PdiFuncionario } from "@/componentes/pdi-funcionario";
import { FeedbackFuncionario } from "@/componentes/feedback-funcionario";
import { AvaliacoesFuncionario } from "@/componentes/avaliacoes-funcionario";
import { Competencias360 } from "@/componentes/colaborador-360/competencias-360";
import { Metas360 } from "@/componentes/colaborador-360/metas-360";
import { Treinamentos360 } from "@/componentes/colaborador-360/treinamentos-360";
import { Comportamental360 } from "@/componentes/colaborador-360/comportamental-360";
import { Auditoria360 } from "@/componentes/colaborador-360/auditoria-360";

const ABAS = [
  { id: "visao", rotulo: "Visão 360" },
  { id: "desempenho", rotulo: "Desempenho" },
  { id: "competencias", rotulo: "Competências" },
  { id: "metas", rotulo: "Metas" },
  { id: "feedbacks", rotulo: "Feedbacks" },
  { id: "pdi", rotulo: "PDI" },
  { id: "treinamentos", rotulo: "Treinamentos" },
  { id: "comportamental", rotulo: "Perfil comportamental" },
  { id: "historico", rotulo: "Histórico" },
  { id: "auditoria", rotulo: "Auditoria" },
] as const;

// Abas ainda não implementadas nesta fase — placeholder honesto por fase.
const EM_BREVE: Record<string, string> = {
  historico: "Timeline unificada da vida do colaborador na empresa (Fase 11).",
};

export default function PaginaColaborador360({ params }: { params: Promise<{ codFun: string }> }) {
  const { codFun } = use(params);
  const [dados, setDados] = useState<Colaborador360 | null>(null);
  const [erro, setErro] = useState(false);
  const [aba, setAba] = useState<string>("visao");

  useEffect(() => {
    void api<Colaborador360>(`/gestao-pessoas/colaboradores/${codFun}/360`).then((r) => {
      if (r.status === 200 && r.json) setDados(r.json);
      else setErro(true);
    });
  }, [codFun]);

  if (erro) {
    return (
      <main style={{ padding: 32 }}>
        <p style={{ color: "var(--text-muted)" }}>Colaborador não encontrado.</p>
      </main>
    );
  }
  if (!dados) {
    return (
      <main style={{ padding: 32 }}>
        <p style={{ color: "var(--text-muted)" }}>Carregando painel…</p>
      </main>
    );
  }

  return (
    <div>
      <Colaborador360Header dados={dados} />

      {/* Navegação de abas — rolável, contexto preservado */}
      <div style={{ position: "sticky", top: 0, zIndex: 9 }}>
        <div
          style={{
            display: "flex",
            gap: 2,
            padding: "0 32px",
            borderBottom: "1px solid var(--border-default)",
            background: "var(--surface-page)",
            overflowX: "auto",
          }}
        >
          {ABAS.map((t) => (
            <button
              key={t.id}
              onClick={() => setAba(t.id)}
              style={{
                padding: "12px 14px",
                border: "none",
                borderBottom: aba === t.id ? "2px solid var(--brand-700)" : "2px solid transparent",
                background: "none",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: aba === t.id ? 600 : 400,
                color: aba === t.id ? "var(--text-body)" : "var(--text-muted)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                marginBottom: -1,
              }}
            >
              {t.rotulo}
            </button>
          ))}
        </div>
      </div>

      <main style={{ padding: 32, maxWidth: 1100 }}>
        {aba === "visao" && <Visao360 dados={dados} />}
        {aba === "desempenho" && <AvaliacoesFuncionario codFun={codFun} />}
        {aba === "competencias" && <Competencias360 codFun={codFun} />}
        {aba === "metas" && <Metas360 codFun={codFun} />}
        {aba === "feedbacks" && <FeedbackFuncionario codFun={codFun} />}
        {aba === "treinamentos" && <Treinamentos360 codFun={codFun} />}
        {aba === "comportamental" && <Comportamental360 codFun={codFun} />}
        {aba === "auditoria" && <Auditoria360 codFun={codFun} />}
        {aba === "pdi" && <PdiFuncionario codFun={codFun} />}
        {EM_BREVE[aba] && (
          <div style={{ border: "1px dashed var(--border-default)", borderRadius: 10, padding: 24, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
            {EM_BREVE[aba]}
          </div>
        )}
      </main>
    </div>
  );
}
