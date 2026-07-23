"use client";
import { useState } from "react";
import { PdiFuncionario } from "@/componentes/pdi-funcionario";
import { FeedbackFuncionario } from "@/componentes/feedback-funcionario";
import { AvaliacoesFuncionario } from "@/componentes/avaliacoes-funcionario";
import { AderenciaFuncionario } from "@/componentes/aderencia-funcionario";

/**
 * Sub-navegação da aba Desenvolvimento: plano (PDI), feedbacks, avaliações e
 * aderência são frentes distintas do mesmo tema, cada uma densa o bastante para
 * não caberem empilhadas na mesma rolagem.
 */
export function DesenvolvimentoTabs({ codFun }: { codFun: string }) {
  const [sub, setSub] = useState<"pdi" | "feedback" | "avaliacao" | "aderencia">("pdi");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border-default)" }}>
        {[
          { id: "pdi" as const, rotulo: "Plano" },
          { id: "feedback" as const, rotulo: "Feedbacks" },
          { id: "avaliacao" as const, rotulo: "Avaliações" },
          { id: "aderencia" as const, rotulo: "Aderência" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setSub(s.id)}
            style={{
              padding: "8px 14px",
              border: "none",
              borderBottom: sub === s.id ? "2px solid var(--brand-700)" : "2px solid transparent",
              background: "none",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: sub === s.id ? 600 : 400,
              color: sub === s.id ? "var(--text-body)" : "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            {s.rotulo}
          </button>
        ))}
      </div>

      {sub === "pdi" ? (
        <PdiFuncionario codFun={codFun} />
      ) : sub === "feedback" ? (
        <FeedbackFuncionario codFun={codFun} />
      ) : sub === "avaliacao" ? (
        <AvaliacoesFuncionario codFun={codFun} />
      ) : (
        <AderenciaFuncionario codFun={codFun} />
      )}
    </div>
  );
}
