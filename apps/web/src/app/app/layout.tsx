"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

const itens = [
  { rota: "/app", rotulo: "Empresas" },
  { rota: "/app/vagas", rotulo: "Vagas" },
  { rota: "/app/candidatos", rotulo: "Candidatos" },
  { rota: "/app/funcionarios", rotulo: "Funcionários" },
  { rota: "/app/organizacao", rotulo: "Organização" },
  { rota: "/app/usuarios", rotulo: "Usuários" },
];

export default function LayoutApp({ children }: { children: ReactNode }) {
  const rota = usePathname();
  const rotear = useRouter();
  const [tema, setTema] = useState<"light" | "dark">("light");

  useEffect(() => {
    const salvo = (localStorage.getItem("tema") as "light" | "dark") ?? "light";
    setTema(salvo);
    document.documentElement.dataset.theme = salvo;
  }, []);

  function alternarTema() {
    const novo = tema === "light" ? "dark" : "light";
    setTema(novo);
    localStorage.setItem("tema", novo);
    document.documentElement.dataset.theme = novo;
  }

  async function sair() {
    await api("/auth/sair", {
      metodo: "POST",
      corpo: { refreshToken: localStorage.getItem("refreshToken") },
    });
    localStorage.clear();
    rotear.replace("/login");
  }

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
          background: "var(--brand-900, #3A2717)",
          color: "#fff",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <img
          src="/marca/SelX_Kit_Identidade/svg/selx-logo-horizontal-fundo-escuro.svg"
          alt="SelX"
          style={{ height: 34 }}
        />
        <nav style={{ display: "grid", gap: 4, fontSize: 14 }}>
          {itens.map((i) => (
            <Link
              key={i.rota}
              href={i.rota}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                color: "#fff",
                textDecoration: "none",
                background: rota === i.rota ? "rgba(255,255,255,.14)" : "transparent",
                opacity: rota === i.rota ? 1 : 0.75,
              }}
            >
              {i.rotulo}
            </Link>
          ))}
        </nav>
        <button
          onClick={alternarTema}
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
          {tema === "light" ? "🌙 Tema escuro" : "☀️ Tema claro"}
        </button>
        <button
          onClick={sair}
          style={{
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
      <div>{children}</div>
    </div>
  );
}
