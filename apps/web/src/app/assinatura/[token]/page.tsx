"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * Assinatura eletrônica simples (Lei 14.063/2020) — sem login, por token opaco.
 * O aceite registra consentimento + timestamp + IP no backend; aqui a
 * responsabilidade é deixar o conteúdo legível e o ato de assinar inequívoco.
 */

interface Assinatura {
  status: string;
  conteudoRenderizado: string;
  dhAssinatura: string | null;
  documento: { nomeDoc: string };
  funcionario: { nomeFun: string };
}

const estiloPagina: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--surface-page)",
  fontFamily: "var(--font-sans)",
  padding: "32px 16px",
};
const estiloCartao: React.CSSProperties = {
  width: 720,
  maxWidth: "100%",
  margin: "0 auto",
  background: "var(--surface-default)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-lg, 10px)",
  padding: 32,
};

export default function AssinaturaPublica() {
  const { token } = useParams<{ token: string }>();
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aceito, setAceito] = useState(false);
  const [assinando, setAssinando] = useState(false);

  const carregar = useCallback(async () => {
    const r = await api<Assinatura>(`/assinaturas/publico/${token}`, { token: null });
    if (r.status !== 200 || !r.json) {
      setErro("Este link é inválido ou expirou. Peça um novo link à empresa.");
      return;
    }
    setAssinatura(r.json);
  }, [token]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function assinar() {
    setAssinando(true);
    const r = await api(`/assinaturas/publico/${token}/assinar`, { metodo: "POST", token: null });
    setAssinando(false);
    if (r.status !== 201) {
      setErro("Não foi possível registrar a assinatura. Tente novamente.");
      return;
    }
    await carregar();
  }

  if (erro) {
    return (
      <main style={estiloPagina}>
        <div style={estiloCartao}>
          <p style={{ margin: 0, color: "var(--text-body)" }}>{erro}</p>
        </div>
      </main>
    );
  }
  if (!assinatura) return null;

  const jaAssinado = assinatura.status === "ASSINADO";

  return (
    <main style={estiloPagina}>
      <div style={estiloCartao}>
        <header style={{ marginBottom: 20 }}>
          <img
            src="/marca/SelexOps_Kit_Identidade/svg/selexops-logo-horizontal-fundo-claro.svg"
            alt="SelexOps"
            style={{ height: 34, marginBottom: 16 }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "var(--text-strong)" }}>
            {assinatura.documento.nomeDoc}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Documento para {assinatura.funcionario.nomeFun}
          </p>
        </header>

        {jaAssinado && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--green-100, #D6E9DF)", color: "var(--green-700, #1D533B)", fontSize: 13, marginBottom: 20 }}>
            Documento assinado
            {assinatura.dhAssinatura && ` em ${new Date(assinatura.dhAssinatura).toLocaleString("pt-BR")}`}. Você pode
            fechar esta página.
          </div>
        )}

        <div
          style={{
            border: "1px solid var(--border-default)",
            borderRadius: 8,
            padding: 20,
            background: "var(--surface-page)",
            maxHeight: 420,
            overflowY: "auto",
            whiteSpace: "pre-wrap",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--text-body)",
            marginBottom: 20,
          }}
        >
          {assinatura.conteudoRenderizado}
        </div>

        {!jaAssinado && (
          <>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "var(--text-body)", marginBottom: 16 }}>
              <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} style={{ marginTop: 3 }} />
              <span>
                Li o documento acima e concordo com o seu conteúdo. Entendo que este aceite tem valor de assinatura
                eletrônica e que a data, a hora e o meu endereço de IP serão registrados.
              </span>
            </label>
            <button
              onClick={assinar}
              disabled={!aceito || assinando}
              style={{
                padding: "11px 18px",
                borderRadius: 8,
                border: "none",
                background: "var(--action-primary, var(--brand-700))",
                color: "#fff",
                fontWeight: 600,
                fontFamily: "inherit",
                fontSize: 14,
                cursor: aceito && !assinando ? "pointer" : "not-allowed",
                opacity: aceito && !assinando ? 1 : 0.5,
              }}
            >
              {assinando ? "Registrando..." : "Assinar documento"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
