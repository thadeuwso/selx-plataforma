"use client";
import { api } from "@/lib/api";
import { createContext, useContext, useEffect, useState } from "react";
import { Gaveta } from "./formulario";

/** Compartilha entre o layout da central da vaga e as abas: sinal de "recarregar dados". */
export const VagaContexto = createContext<{ recarregarToken: number; pedirRecarga: () => void }>({
  recarregarToken: 0,
  pedirRecarga: () => {},
});
export const useVagaContexto = () => useContext(VagaContexto);

export interface Candidatura {
  codCdt: string;
  estagio: string;
  dhInc: string;
  codFun: string | null;
  knockoutJson: { pergunta: string } | null;
  candidato: {
    codCand: string;
    nomeCand: string;
    email: string;
    cidade: string | null;
    cargoAtual: string | null;
    tags?: { tag: { codTag: string; nome: string; cor: string } }[];
  };
  /** Só o favorito de quem está olhando — favorito é marca pessoal. */
  favoritas?: { codFav: string }[];
  canal: { nomeCanal: string };
  match: {
    scoreGeral: number;
    scoreContratacao: number;
    scoreCultura: number | null;
    driverPrincipal: string | null;
    qtdGapsCrit: number;
  } | null;
  processoAdmissao: { status: string } | null;
  convitesComportamentais: {
    tokenPub: string;
    status: string;
    sessao: {
      dhConclusao: string | null;
      resultado: { indicadorConsistencia: string; aderencias: { aderenciaGeral: number }[] } | null;
    } | null;
  }[];
}

export interface ListaPaginada {
  itens: Candidatura[];
  total: number;
  pagina: number;
  tamanhoPagina: number;
}

export interface DetalheComportamental {
  status: string;
  facetas: { codFat: string; faceta: string; percentualNormalizado: number; quantidade: number }[];
  sessao: {
    dhConclusao: string | null;
    tempoTotalSeg: number | null;
    resultado: {
      indicadorConsistencia: string;
      percRespNeutras: number;
      percRespUniformes: number;
      fatores: { fator: { sigla: string; nome: string }; percentualNormalizado: number; faixaInterpretativa: string }[];
      aderencias: {
        aderenciaGeral: number;
        fatores: { fator: { sigla: string; nome: string }; distanciaFaixa: number; aderenciaDimensao: number; dentroDaFaixa: string }[];
      }[];
    } | null;
  } | null;
}

export const ESTAGIOS: { chave: string; rotulo: string }[] = [
  { chave: "applied", rotulo: "Recebidas" },
  { chave: "screening", rotulo: "Triagem" },
  { chave: "analysis", rotulo: "Análise" },
  { chave: "shortlist", rotulo: "Shortlist" },
  { chave: "interview", rotulo: "Entrevista" },
  { chave: "offer", rotulo: "Proposta" },
  { chave: "hired", rotulo: "Contratado" },
];
export const ESTAGIOS_TERMINAIS = [
  { chave: "knockout", rotulo: "Eliminado (triagem)" },
  { chave: "not_selected", rotulo: "Não selecionado" },
  { chave: "rejected", rotulo: "Rejeitado" },
  { chave: "approved", rotulo: "Aprovado" },
  { chave: "archived", rotulo: "Arquivado" },
];
export const TODOS_ESTAGIOS = [...ESTAGIOS, ...ESTAGIOS_TERMINAIS];
export const rotuloEstagio = (chave: string) => TODOS_ESTAGIOS.find((e) => e.chave === chave)?.rotulo ?? chave;

export const ROTULO_STATUS_CONVITE: Record<string, string> = {
  PENDENTE: "Convite enviado",
  ACEITO: "Respondendo",
  REVOGADO: "Revogado",
  EXPIRADO: "Expirado",
};

export const FATORES_COMPORTAMENTAIS = [
  { sigla: "DIR", rotulo: "Direcionamento" },
  { sigla: "CON", rotulo: "Conexão" },
  { sigla: "SUS", rotulo: "Sustentação" },
  { sigla: "PRE", rotulo: "Precisão" },
] as const;

export const ROTULO_FAIXA: Record<string, string> = {
  muito_baixa: "Muito baixa",
  baixa: "Baixa",
  moderada: "Moderada",
  alta: "Alta",
  muito_alta: "Muito alta",
};

export const ROTULO_CONSISTENCIA: Record<string, string> = {
  ADEQUADA: "Adequada",
  REQUER_ATENCAO: "Requer atenção (muitas respostas neutras)",
  BAIXA_CONSISTENCIA: "Baixa consistência (respostas muito uniformes)",
};

export function corPorScore(score: number | null | undefined) {
  if (score == null) return null;
  if (score >= 75) return { bg: "var(--green-100, #D6E9DF)", fg: "var(--green-700, #1D533B)" };
  if (score >= 50) return { bg: "var(--amber-100, #F2E3C4)", fg: "var(--amber-700, #714E08)" };
  return { bg: "var(--red-100, #F4D9D6)", fg: "var(--red-700, #7A2A25)" };
}

export function ChipScore({ score, titulo }: { score: number | null | undefined; titulo?: string }) {
  const cor = corPorScore(score);
  if (!cor || score == null) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  return (
    <span title={titulo} style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: cor.bg, color: cor.fg }}>
      {score}
    </span>
  );
}

/** Comparação de 2-5 candidatos — match (aderência técnica/geral/cultura/gaps) + comportamental. */
export function GavetaComparacao({
  candidaturas,
  aberta,
  fechar,
}: {
  candidaturas: Candidatura[];
  aberta: boolean;
  fechar: () => void;
}) {
  const [comportamental, setComportamental] = useState<Record<string, DetalheComportamental | null>>({});

  useEffect(() => {
    if (!aberta || candidaturas.length === 0) return;
    let cancelado = false;
    void Promise.all(
      candidaturas.map((c) => api<DetalheComportamental>(`/candidaturas/${c.codCdt}/avaliacao-comportamental`)),
    ).then((rs) => {
      if (cancelado) return;
      const mapa: Record<string, DetalheComportamental | null> = {};
      rs.forEach((r, i) => (mapa[candidaturas[i].codCdt] = r.status === 200 ? r.json : null));
      setComportamental(mapa);
    });
    return () => { cancelado = true; };
  }, [aberta, candidaturas]);

  const estiloCelula: React.CSSProperties = { padding: "8px 10px", fontSize: 12, borderBottom: "1px solid var(--border-default)" };
  const estiloCabecalho: React.CSSProperties = { ...estiloCelula, fontWeight: 600, textAlign: "left", verticalAlign: "bottom" };

  const maiorContratacao = candidaturas.reduce<Candidatura | null>(
    (max, c) => (c.match && (!max?.match || c.match.scoreContratacao > max.match.scoreContratacao) ? c : max),
    null,
  );

  function LinhaNumero({ rotulo, valor, destacar }: { rotulo: string; valor: (c: Candidatura) => number | null; destacar?: boolean }) {
    const valores = candidaturas.map(valor);
    const maior = Math.max(...valores.filter((v): v is number => v != null));
    return (
      <tr>
        <td style={{ ...estiloCelula, fontWeight: 600 }}>{rotulo}</td>
        {candidaturas.map((c, i) => {
          const v = valores[i];
          const ehMaior = destacar && v != null && v === maior;
          return (
            <td key={c.codCdt} style={{ ...estiloCelula, fontWeight: ehMaior ? 700 : 400, color: ehMaior ? "var(--green-700, #1D533B)" : undefined }}>
              {v ?? "—"}
            </td>
          );
        })}
      </tr>
    );
  }

  return (
    <Gaveta
      titulo="Comparar candidatos"
      aberta={aberta}
      fechar={fechar}
      largura={candidaturas.length ? 200 + candidaturas.length * 150 : 640}
    >
      {candidaturas.length > 0 && (
        <div style={{ display: "grid", gap: 14 }}>
          {maiorContratacao && (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Maior prioridade SelX: <strong style={{ color: "var(--text-body)" }}>{maiorContratacao.candidato.nomeCand}</strong>
              {" "}(contratação {maiorContratacao.match!.scoreContratacao})
            </div>
          )}
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={estiloCabecalho}></th>
                  {candidaturas.map((c) => (
                    <th key={c.codCdt} style={estiloCabecalho}>{c.candidato.nomeCand}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <LinhaNumero rotulo="Prioridade (contratação)" valor={(c) => c.match?.scoreContratacao ?? null} destacar />
                <LinhaNumero rotulo="Aderência geral" valor={(c) => c.match?.scoreGeral ?? null} destacar />
                <LinhaNumero rotulo="Fit cultural" valor={(c) => c.match?.scoreCultura ?? null} destacar />
                <LinhaNumero rotulo="Gaps críticos" valor={(c) => c.match?.qtdGapsCrit ?? null} />
                <tr>
                  <td style={{ ...estiloCelula, fontWeight: 600 }}>Ponto forte</td>
                  {candidaturas.map((c) => (
                    <td key={c.codCdt} style={estiloCelula}>{c.match?.driverPrincipal ?? "—"}</td>
                  ))}
                </tr>
                <tr>
                  <td style={{ ...estiloCelula, fontWeight: 600 }}>Aderência comportamental</td>
                  {candidaturas.map((c) => {
                    const ader = comportamental[c.codCdt]?.sessao?.resultado?.aderencias[0]?.aderenciaGeral;
                    return <td key={c.codCdt} style={estiloCelula}>{ader ?? "—"}</td>;
                  })}
                </tr>
                {FATORES_COMPORTAMENTAIS.map((f) => (
                  <tr key={f.sigla}>
                    <td style={{ ...estiloCelula, fontWeight: 600 }}>{f.rotulo}</td>
                    {candidaturas.map((c) => {
                      const rf = comportamental[c.codCdt]?.sessao?.resultado?.fatores.find((x) => x.fator.sigla === f.sigla);
                      return (
                        <td key={c.codCdt} style={estiloCelula}>
                          {rf ? `${rf.percentualNormalizado}% · ${ROTULO_FAIXA[rf.faixaInterpretativa] ?? rf.faixaInterpretativa}` : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Gaveta>
  );
}
