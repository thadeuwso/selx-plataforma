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
  _count: { candidaturas: number };
}
interface ProcessoAdmissao {
  codCdt: string;
  status: string;
  candidatura: { candidato: { nomeCand: string }; vaga: { titulo: string } };
}
interface Assinatura {
  codAssin: string;
  status: string;
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
  const [candidatos, setCandidatos] = useState<unknown[]>([]);
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
        api<unknown[]>("/candidatos"),
        api<ProcessoAdmissao[]>("/admissoes"),
        api<Assinatura[]>("/assinaturas"),
      ]);
      if (f.status === 200 && f.json) setFuncionarios(f.json);
      if (v.status === 200 && v.json) setVagas(v.json);
      if (c.status === 200 && c.json) setCandidatos(c.json);
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
        <CardKpi rotulo="Candidatos no banco de talentos" valor={candidatos.length} />
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
            <Link
              key={a.codAssin}
              href="/app/empresa/funcionarios"
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
              {a.funcionario.nomeFun} — assinatura de {a.documento.nomeDoc} pendente
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
