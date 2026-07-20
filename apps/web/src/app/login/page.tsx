"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export default function PaginaLogin() {
  const rotear = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const r = await api<{ accessToken: string; refreshToken: string }>("/auth/login", {
      metodo: "POST",
      corpo: { email, senha },
      token: null,
    });
    setCarregando(false);
    if (r.status !== 201 || !r.json?.accessToken) {
      setErro("E-mail ou senha incorretos. Verifique e tente novamente.");
      return;
    }
    localStorage.setItem("accessToken", r.json.accessToken);
    localStorage.setItem("refreshToken", r.json.refreshToken);
    rotear.push("/app");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--surface-page)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <form
        onSubmit={entrar}
        style={{
          width: 380,
          background: "var(--surface-default)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg, 10px)",
          padding: 32,
          display: "grid",
          gap: 16,
        }}
      >
        <div>
          <img src="/marca/SelexOps_Kit_Identidade/svg/selexops-logo-horizontal-fundo-claro.svg" alt="SelexOps" style={{ height: 44, alignSelf: "start" }} />
          <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Plataforma Inteligente de Gestão de Pessoas
          </div>
        </div>
        <label style={{ display: "grid", gap: 6, fontSize: 13, color: "var(--text-body)" }}>
          E-mail
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              background: "var(--surface-default)",
              color: "var(--text-body)",
              font: "inherit",
            }}
          />
        </label>
        <label style={{ display: "grid", gap: 6, fontSize: 13, color: "var(--text-body)" }}>
          Senha
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              background: "var(--surface-default)",
              color: "var(--text-body)",
              font: "inherit",
            }}
          />
        </label>
        {erro && (
          <div style={{ color: "var(--feedback-danger, #B4443E)", fontSize: 13 }}>{erro}</div>
        )}
        <button
          type="submit"
          disabled={carregando}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "none",
            background: "var(--action-primary, var(--brand-700))",
            color: "#fff",
            fontWeight: 600,
            font: "inherit",
            cursor: "pointer",
            opacity: carregando ? 0.7 : 1,
          }}
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
