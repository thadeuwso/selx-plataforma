"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Eu {
  nome: string;
}
interface Funcionario {
  situacao: string;
}
interface Vaga {
  status: string;
}
interface ProcessoAdmissao {
  codCdt: string;
  status: string;
  candidatura: { candidato: { nomeCand: string }; vaga: { titulo: string } };
}
interface Assinatura {
  codAssin: string;
  status: string;
  tokenPub: string;
  documento: { nomeDoc: string };
  funcionario: { nomeFun: string };
}

function CardKpi({ rotulo, valor }: { rotulo: string; valor: number | string }) {
  return (
    <div
      style={{
        background: "var(--surface-default)",
        border: "1px solid var(--border-default)",
        borderRadius: 10,
        padding: "16px 20px",
      }}
    >
      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{rotulo}</div>
      <div style={{ fontSize: 30, fontWeight: 600, marginTop: 4 }}>{valor}</div>
    </div>
  );
}

export default function PaginaDashboard() {
  const rotear = useRouter();
  const [eu, setEu] = useState<Eu | null>(null);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [totalCandidatos, setTotalCandidatos] = useState(0);
  const [admissoes, setAdmissoes] = useState<ProcessoAdmissao[]>([]);
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);

  useEffect(() => {
    (async () => {
      const rEu = await api<Eu>("/auth/eu");
      if (rEu.status !== 200) {
        rotear.replace("/login");
        return;
      }
      setEu(rEu.json);

      const [f, v, c, a, s] = await Promise.all([
        api<Funcionario[]>("/funcionarios"),
        api<Vaga[]>("/vagas"),
        // Só o total interessa aqui — `tamanhoPagina=1` evita baixar o banco de
        // talentos inteiro (com as candidaturas de cada um) para exibir um número.
        api<{ total: number }>("/candidatos?tamanhoPagina=1"),
        api<ProcessoAdmissao[]>("/admissoes"),
        api<Assinatura[]>("/assinaturas"),
      ]);
      if (f.status === 200 && f.json) setFuncionarios(f.json);
      if (v.status === 200 && v.json) setVagas(v.json);
      if (c.status === 200 && c.json) setTotalCandidatos(c.json.total);
      if (a.status === 200 && a.json) setAdmissoes(a.json);
      if (s.status === 200 && s.json) setAssinaturas(s.json);
    })();
  }, [rotear]);

  if (!eu) return null;

  const funcionariosAtivos = funcionarios.filter((f) => f.situacao === "ATIVO").length;
  const vagasAbertas = vagas.filter((v) => v.status === "ABERTA").length;
  const admissoesEmAndamento = admissoes.filter((a) => a.status !== "APROVADO").length;
  const admissoesPendentesDp = admissoes.filter((a) => a.status === "AGUARDANDO_APROVACAO_DP");
  const assinaturasPendentes = assinaturas.filter((a) => a.status === "PENDENTE");
  const temPendencia = admissoesPendentesDp.length > 0 || assinaturasPendentes.length > 0;

  return (
    <main style={{ padding: 32 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Olá, {eu.nome}</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Visão geral do seu grupo econômico.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <CardKpi rotulo="Funcionários ativos" valor={funcionariosAtivos} />
        <CardKpi rotulo="Vagas abertas" valor={vagasAbertas} />
        <CardKpi rotulo="Candidatos no banco de talentos" valor={totalCandidatos} />
        <CardKpi rotulo="Processos de admissão em andamento" valor={admissoesEmAndamento} />
      </div>

      <div
        style={{
          background: "var(--surface-default)",
          border: "1px solid var(--border-default)",
          borderRadius: 10,
          padding: 20,
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>Precisa da sua atenção</h2>

        {!temPendencia && (
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>Tudo em dia — nenhuma pendência.</p>
        )}

        <div style={{ display: "grid", gap: 8 }}>
          {admissoesPendentesDp.map((a) => (
            <Link
              key={a.codCdt}
              href={`/app/recrutamento/admissao/${a.codCdt}`}
              style={{
                display: "block",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border-default)",
                color: "var(--text-body)",
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              {a.candidatura.candidato.nomeCand} aguardando aprovação — {a.candidatura.vaga.titulo}
            </Link>
          ))}
          {assinaturasPendentes.map((a) => (
            <div
              key={a.codAssin}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border-default)",
                color: "var(--text-body)",
                fontSize: 14,
              }}
            >
              <span>
                {a.funcionario.nomeFun} — assinatura de {a.documento.nomeDoc} pendente
              </span>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/assinatura/${a.tokenPub}`;
                  navigator.clipboard.writeText(url).catch(() => {});
                  alert(`Link de assinatura copiado:\n${url}`);
                }}
                style={{ border: "none", background: "none", color: "var(--text-link)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, whiteSpace: "nowrap" }}
              >
                Copiar link
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
