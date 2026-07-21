"use client";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario } from "@/componentes/formulario";
import { GavetaNovaCandidatura } from "@/componentes/gaveta-nova-candidatura";
import { VagaContexto } from "@/componentes/recrutamento-compartilhado";

interface VagaHub {
  codVag: string;
  titulo: string;
  status: string;
  local: string | null;
  perguntas: { codVagPer: string; pergunta: string }[];
  requisitos: { codVagReq: string; descrReq: string; nivelEsperado: number | null; tempoEspMeses: number | null }[];
  kpis: {
    totalCandidatos: number;
    novos: number;
    altaAderencia: number;
    aguardandoAvaliacao: number;
    entrevistas: number;
    propostas: number;
    diasEmAberto: number;
  };
}

const CORES_STATUS: Record<string, { fundo: string; texto: string; rotulo: string }> = {
  RASCUNHO: { fundo: "var(--neutral-100)", texto: "var(--text-muted)", rotulo: "Rascunho" },
  EM_APROVACAO: { fundo: "var(--amber-100, #F2E3C4)", texto: "var(--amber-700, #714E08)", rotulo: "Em aprovação" },
  AJUSTES: { fundo: "var(--amber-100, #F2E3C4)", texto: "var(--amber-700, #714E08)", rotulo: "Ajustes pedidos" },
  ABERTA: { fundo: "var(--green-100, #D6E9DF)", texto: "var(--green-700, #1D533B)", rotulo: "Aberta" },
  FECHADA: { fundo: "var(--brand-100)", texto: "var(--brand-800)", rotulo: "Fechada" },
  CANCELADA: { fundo: "var(--neutral-100)", texto: "var(--text-muted)", rotulo: "Cancelada" },
};

function Indicador({ rotulo, valor, destaque }: { rotulo: string; valor: number; destaque?: boolean }) {
  return (
    <div style={{ padding: "8px 14px", background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 8, minWidth: 92 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: destaque && valor > 0 ? "var(--green-700, #1D533B)" : "var(--text-strong)" }}>{valor}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{rotulo}</div>
    </div>
  );
}

export default function LayoutCentralVaga({ children }: { children: ReactNode }) {
  const { codVag } = useParams<{ codVag: string }>();
  const pathname = usePathname();
  const rotear = useRouter();
  const [vaga, setVaga] = useState<VagaHub | null>(null);
  const [novaAberta, setNovaAberta] = useState(false);
  const [recarregarToken, setRecarregarToken] = useState(0);
  const pedirRecarga = useCallback(() => setRecarregarToken((t) => t + 1), []);

  const carregarVaga = useCallback(async () => {
    const r = await api<VagaHub>(`/vagas/${codVag}`);
    if (r.status === 200 && r.json) setVaga(r.json);
  }, [codVag]);

  useEffect(() => { void carregarVaga(); }, [carregarVaga, recarregarToken]);

  async function transicionar(acao: string) {
    const r = await api(`/vagas/${codVag}/status`, { metodo: "PATCH", corpo: { acao } });
    if (r.status !== 200) { alert("Não foi possível executar a ação (verifique sua permissão)."); return; }
    await carregarVaga();
  }

  function compartilhar() {
    const url = `${window.location.origin}/app/recrutamento/vagas/${codVag}`;
    navigator.clipboard.writeText(url).then(() => alert("Link da vaga copiado.")).catch(() => alert(url));
  }

  const base = `/app/recrutamento/vagas/${codVag}`;
  const abas = [
    { rota: `${base}/visao-geral`, rotulo: "Visão geral" },
    { rota: base, rotulo: "Candidatos" },
    { rota: `${base}/avaliacoes`, rotulo: "Avaliações" },
    { rota: `${base}/entrevistas`, rotulo: "Entrevistas" },
    { rota: `${base}/configuracoes`, rotulo: "Configurações" },
  ];

  if (!vaga) return null;
  const cor = CORES_STATUS[vaga.status] ?? CORES_STATUS.RASCUNHO;
  const k = vaga.kpis;

  return (
    <VagaContexto.Provider value={{ recarregarToken, pedirRecarga }}>
      <div style={{ padding: "24px 32px 0", borderBottom: "1px solid var(--border-default)", background: "var(--surface-page)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <Link href="/app/recrutamento/vagas" style={{ fontSize: 12, color: "var(--text-link)", textDecoration: "none" }}>← Vagas</Link>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{vaga.titulo}</h1>
              <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 12, background: cor.fundo, color: cor.texto }}>{cor.rotulo}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              {[vaga.local, `${k.totalCandidatos} candidato(s)`, `${k.diasEmAberto} dia(s) em aberto`].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href={`${base}/configuracoes`} style={estiloBotaoSec}>Editar vaga</Link>
            <button onClick={compartilhar} style={estiloBotaoSec}>Compartilhar</button>
            {vaga.status === "ABERTA" && <button onClick={() => transicionar("fechar")} style={estiloBotaoSec}>Encerrar</button>}
            <BotaoPrimario onClick={() => setNovaAberta(true)}>Adicionar candidato</BotaoPrimario>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <Indicador rotulo="Total" valor={k.totalCandidatos} />
          <Indicador rotulo="Novos (7d)" valor={k.novos} />
          <Indicador rotulo="Alta aderência" valor={k.altaAderencia} destaque />
          <Indicador rotulo="Aguardando aval." valor={k.aguardandoAvaliacao} />
          <Indicador rotulo="Entrevistas" valor={k.entrevistas} />
          <Indicador rotulo="Propostas" valor={k.propostas} />
        </div>

        <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
          {abas.map((a) => {
            const ativa = pathname === a.rota;
            return (
              <Link
                key={a.rota}
                href={a.rota}
                style={{
                  padding: "10px 14px", fontSize: 14, textDecoration: "none",
                  borderBottom: ativa ? "2px solid var(--brand-700)" : "2px solid transparent",
                  color: ativa ? "var(--text-body)" : "var(--text-muted)", fontWeight: ativa ? 600 : 400, marginBottom: -1,
                }}
              >
                {a.rotulo}
              </Link>
            );
          })}
        </div>
      </div>

      {children}

      <GavetaNovaCandidatura
        codVag={codVag}
        aberta={novaAberta}
        fechar={() => setNovaAberta(false)}
        vagaAberta={vaga.status === "ABERTA"}
        perguntas={vaga.perguntas}
        requisitos={vaga.requisitos}
        aoRegistrar={() => { pedirRecarga(); rotear.push(base); }}
      />
    </VagaContexto.Provider>
  );
}

const estiloBotaoSec: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--surface-default)",
  color: "var(--text-body)", fontSize: 14, textDecoration: "none", cursor: "pointer", font: "inherit", display: "inline-flex", alignItems: "center",
};
