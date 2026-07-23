"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

interface ItemNav {
  rota: string;
  rotulo: string;
}
interface GrupoNav {
  grupo: string;
  itens: ItemNav[];
}

const navegacao: GrupoNav[] = [
  { grupo: "", itens: [{ rota: "/app", rotulo: "Visão Geral" }] },
  {
    grupo: "Recrutamento e Seleção",
    itens: [
      { rota: "/app/recrutamento/vagas", rotulo: "Vagas" },
      { rota: "/app/recrutamento/candidatos", rotulo: "Candidatos" },
      { rota: "/app/recrutamento/relatorio", rotulo: "Relatório" },
      { rota: "/app/recrutamento/admissao", rotulo: "Admissão" },
      { rota: "/app/recrutamento/banco-perguntas", rotulo: "Banco de perguntas" },
      { rota: "/app/recrutamento/comportamental-padrao", rotulo: "Padrão Comportamental" },
      { rota: "/app/recrutamento/cultura-empresa", rotulo: "Cultura da empresa" },
    ],
  },
  {
    grupo: "Empresa",
    itens: [
      { rota: "/app/empresa/cadastro", rotulo: "Empresas e filiais" },
      { rota: "/app/empresa/funcionarios", rotulo: "Funcionários" },
      { rota: "/app/empresa/organizacao", rotulo: "Departamentos e cargos" },
      { rota: "/app/empresa/projetos", rotulo: "Projetos e contratos" },
    ],
  },
  {
    grupo: "Gestão de Pessoas",
    itens: [
      { rota: "/app/gestao-pessoas/desempenho", rotulo: "Avaliação de desempenho" },
      { rota: "/app/gestao-pessoas/aderencia", rotulo: "Painel de aderência" },
      { rota: "/app/gestao-pessoas/modelos-360", rotulo: "Modelos de avaliação 360" },
      { rota: "/app/gestao-pessoas/competencias-cargo", rotulo: "Competências do cargo" },
    ],
  },
  {
    grupo: "Administração",
    itens: [
      { rota: "/app/administracao/usuarios", rotulo: "Usuários" },
      { rota: "/app/administracao/ia", rotulo: "Inteligência artificial" },
      { rota: "/app/conta", rotulo: "Minha conta" },
    ],
  },
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
        color: "var(--text-body)",
      }}
    >
      <aside
        style={{
          background: "var(--brand-900)",
          color: "#fff",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <img
          src="/marca/SelexOps_Kit_Identidade/svg/selexops-logo-horizontal-fundo-escuro.svg"
          alt="SelexOps"
          style={{ height: 34 }}
        />
        <nav style={{ display: "grid", gap: 2, fontSize: 14 }}>
          {navegacao.map((g) => (
            <div key={g.grupo || "raiz"} style={{ marginBottom: 8 }}>
              {g.grupo && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    opacity: 0.55,
                    padding: "12px 10px 4px",
                  }}
                >
                  {g.grupo}
                </div>
              )}
              {g.itens.map((i) => (
                <Link
                  key={i.rota}
                  href={i.rota}
                  style={{
                    display: "block",
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
            </div>
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
            fontFamily: "inherit", fontSize: "inherit",
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
            fontFamily: "inherit", fontSize: "inherit",
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
