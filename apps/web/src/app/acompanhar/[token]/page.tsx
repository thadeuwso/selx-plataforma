"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * Portal de acompanhamento do candidato — sem login. Responde a duas perguntas:
 * "em que pé está?" e "o que falta de mim?". Nenhum dado interno (score,
 * knockout, nota do recrutador) chega aqui — ver o controller público.
 */

interface Acompanhamento {
  candidato: string;
  vaga: { titulo: string; local: string | null; empresa: string };
  dhCandidatura: string;
  estagio: { rotulo: string; descricao: string; encerrado: boolean };
  etapas: { rotulo: string; dhInc: string }[];
  pendencias: { tipo: string; rotulo: string; url: string }[];
}

const estiloPagina: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--surface-page)",
  fontFamily: "var(--font-sans)",
  padding: "32px 16px",
};
const estiloCartao: React.CSSProperties = {
  width: 620,
  maxWidth: "100%",
  margin: "0 auto",
  background: "var(--surface-default)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-lg, 10px)",
  padding: 32,
};

export default function AcompanharProcesso() {
  const { token } = useParams<{ token: string }>();
  const [dados, setDados] = useState<Acompanhamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<Acompanhamento>(`/acompanhamento/publico/${token}`, { token: null });
    if (r.status !== 200 || !r.json) {
      setErro("Este link é inválido ou expirou. Peça um novo link à empresa.");
      return;
    }
    setDados(r.json);
  }, [token]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (erro) {
    return (
      <main style={estiloPagina}>
        <div style={estiloCartao}>
          <p style={{ margin: 0, color: "var(--text-body)" }}>{erro}</p>
        </div>
      </main>
    );
  }
  if (!dados) return null;

  return (
    <main style={estiloPagina}>
      <div style={estiloCartao}>
        <header style={{ marginBottom: 24 }}>
          <img
            src="/marca/SelexOps_Kit_Identidade/svg/selexops-logo-horizontal-fundo-claro.svg"
            alt="SelexOps"
            style={{ height: 32, marginBottom: 16 }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "var(--text-strong)" }}>{dados.vaga.titulo}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            {[dados.vaga.empresa, dados.vaga.local].filter(Boolean).join(" · ")}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>
            Olá, {dados.candidato} — você se candidatou em{" "}
            {new Date(dados.dhCandidatura).toLocaleDateString("pt-BR")}.
          </p>
        </header>

        <section
          style={{
            padding: "16px 18px",
            borderRadius: 10,
            background: dados.estagio.encerrado ? "var(--surface-page)" : "var(--brand-100)",
            color: dados.estagio.encerrado ? "var(--text-body)" : "var(--brand-800)",
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.8 }}>
            Situação atual
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{dados.estagio.rotulo}</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{dados.estagio.descricao}</div>
        </section>

        {dados.pendencias.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px", color: "var(--text-strong)" }}>
              O que falta de você
            </h2>
            <div style={{ display: "grid", gap: 8 }}>
              {dados.pendencias.map((p) => (
                <a
                  key={p.tipo}
                  href={p.url}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--border-default)",
                    background: "var(--amber-100, #F2E3C4)",
                    color: "var(--amber-700, #714E08)",
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {p.rotulo}
                  <span aria-hidden>→</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {dados.etapas.length > 0 && (
          <section>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px", color: "var(--text-strong)" }}>
              Seu histórico
            </h2>
            <div style={{ display: "grid", gap: 12 }}>
              {dados.etapas.map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div
                    aria-hidden
                    style={{
                      width: 8, height: 8, borderRadius: 999, marginTop: 6, flexShrink: 0,
                      background: "var(--brand-700)",
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 14, color: "var(--text-body)" }}>{e.rotulo}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {new Date(e.dhInc).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 28, marginBottom: 0 }}>
          Guarde este link: ele é o seu acompanhamento e continua funcionando durante todo o processo.
        </p>
      </div>
    </main>
  );
}
