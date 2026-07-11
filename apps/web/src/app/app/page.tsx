"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Eu {
  nome: string;
  permissoes: string[];
}
interface Empresa {
  codEmp: string;
  nomeFantasia: string;
  razaoSocial: string;
  codEmpMatriz: string | null;
  situacao: string;
}

export default function AreaLogada() {
  const rotear = useRouter();
  const [eu, setEu] = useState<Eu | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  useEffect(() => {
    (async () => {
      const rEu = await api<Eu>("/auth/eu");
      if (rEu.status !== 200) {
        rotear.replace("/login");
        return;
      }
      setEu(rEu.json);
      const rEmp = await api<Empresa[]>("/empresas");
      if (rEmp.status === 200 && rEmp.json) setEmpresas(rEmp.json);
    })();
  }, [rotear]);

  async function sair() {
    await api("/auth/sair", {
      metodo: "POST",
      corpo: { refreshToken: localStorage.getItem("refreshToken") },
    });
    localStorage.clear();
    rotear.replace("/login");
  }

  if (!eu) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        background: "var(--surface-page)",
        fontFamily: "var(--font-sans)",
        color: "var(--text-default)",
      }}
    >
      <aside
        style={{
          background: "var(--brand-900, #232238)",
          color: "#fff",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <img src="/marca/SelX_Kit_Identidade/svg/selx-logo-horizontal-fundo-escuro.svg" alt="SelX" style={{ height: 34 }} />
        <nav style={{ display: "grid", gap: 4, fontSize: 14 }}>
          <span style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,.12)" }}>
            Empresas
          </span>
          <span style={{ padding: "8px 10px", opacity: 0.6 }}>Funcionários (em breve)</span>
          <span style={{ padding: "8px 10px", opacity: 0.6 }}>Benefícios (em breve)</span>
        </nav>
        <button
          onClick={sair}
          style={{
            marginTop: "auto",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,.25)",
            background: "transparent",
            color: "#fff",
            font: "inherit",
            cursor: "pointer",
          }}
        >
          Sair
        </button>
      </aside>

      <main style={{ padding: 32 }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Empresas e filiais</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Olá, {eu.nome} — {empresas.length} empresa(s) no seu grupo.
          </p>
        </header>
        <div
          style={{
            background: "var(--surface-default)",
            border: "1px solid var(--border-default)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--surface-page)", textAlign: "left" }}>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Código</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Nome fantasia</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Razão social</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((e) => (
                <tr key={e.codEmp} style={{ borderTop: "1px solid var(--border-default)" }}>
                  <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)" }}>{e.codEmp}</td>
                  <td style={{ padding: "10px 14px" }}>{e.nomeFantasia}</td>
                  <td style={{ padding: "10px 14px", color: "var(--text-muted)" }}>{e.razaoSocial}</td>
                  <td style={{ padding: "10px 14px" }}>{e.codEmpMatriz ? "Filial" : "Matriz"}</td>
                </tr>
              ))}
              {empresas.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 24, color: "var(--text-muted)", textAlign: "center" }}>
                    Nenhuma empresa visível para o seu perfil.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
