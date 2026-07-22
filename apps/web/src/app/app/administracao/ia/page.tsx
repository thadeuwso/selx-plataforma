"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Erro } from "@/componentes/formulario";

type Provedor = "nuvem" | "local";

const OPCOES: { valor: Provedor; titulo: string; descricao: string; contrapartida: string }[] = [
  {
    valor: "nuvem",
    titulo: "Modelo em nuvem",
    descricao:
      "Melhor qualidade de análise em português. CPF, e-mail e telefone são removidos antes do envio, mas o histórico profissional do candidato é enviado ao provedor.",
    contrapartida: "Recomendado para a maioria das operações.",
  },
  {
    valor: "local",
    titulo: "Modelo local",
    descricao:
      "Nenhum dado do candidato sai da sua infraestrutura. Indicado para operação com exigência contratual de não trafegar dados para terceiros.",
    contrapartida: "O modelo local é bem menor: as análises ficam mais rasas e genéricas.",
  },
];

export default function PaginaConfiguracoesIa() {
  const [provedor, setProvedor] = useState<Provedor | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    void api<{ provedorIa: Provedor }>("/configuracoes/ia").then((r) => {
      if (r.status === 200 && r.json) setProvedor(r.json.provedorIa);
    });
  }, []);

  async function salvar(novo: Provedor) {
    setErro(null);
    setSalvo(false);
    setSalvando(true);
    const r = await api<{ provedorIa: Provedor }>("/configuracoes/ia", {
      metodo: "PATCH",
      corpo: { provedorIa: novo },
    });
    setSalvando(false);
    if (r.status !== 200) {
      setErro("Não foi possível salvar a preferência.");
      return;
    }
    setProvedor(novo);
    setSalvo(true);
  }

  return (
    <main style={{ padding: 32, maxWidth: 780 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>Inteligência artificial</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 24px", lineHeight: 1.6 }}>
        Onde processar as análises que carregam dados do candidato — análise de currículo, resumo
        comportamental e sugestão de perguntas.
      </p>

      {provedor === null ? (
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Carregando…</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {OPCOES.map((op) => {
            const ativa = provedor === op.valor;
            return (
              <button
                key={op.valor}
                onClick={() => salvar(op.valor)}
                disabled={salvando || ativa}
                style={{
                  textAlign: "left",
                  padding: 16,
                  borderRadius: 10,
                  border: `1px solid ${ativa ? "var(--action-primary, var(--brand-700))" : "var(--border-default)"}`,
                  background: "var(--surface-default)",
                  font: "inherit",
                  cursor: ativa || salvando ? "default" : "pointer",
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{op.titulo}</span>
                  {ativa && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--action-primary, var(--brand-700))" }}>
                      Em uso
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>{op.descricao}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>{op.contrapartida}</span>
              </button>
            );
          })}
        </div>
      )}

      <Erro mensagem={erro} />
      {salvo && (
        <p style={{ fontSize: 13, color: "var(--feedback-success, #15803d)", marginTop: 12 }}>
          Preferência salva. Vale para as próximas análises — as já geradas não mudam.
        </p>
      )}

      <div
        style={{
          marginTop: 28,
          padding: 14,
          borderRadius: 10,
          border: "1px solid var(--border-default)",
          fontSize: 12,
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ fontWeight: 600, color: "var(--text-body)" }}>Independente desta escolha:</strong> a
        IA da plataforma explica resultados já calculados — ela não atribui nota, não classifica
        candidato e não recomenda contratação. O ranking continua vindo do match determinístico, que
        é auditável e não usa IA.
      </div>
    </main>
  );
}
