"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, BASE } from "@/lib/api";
import { Abas, Gaveta } from "./formulario";

const DIMENSOES_CULTURA = [
  { chave: "autonomy", rotulo: "Autonomia" },
  { chave: "pace", rotulo: "Ritmo" },
  { chave: "collaboration", rotulo: "Colaboração" },
  { chave: "structure", rotulo: "Estrutura" },
  { chave: "dataDriven", rotulo: "Orientação a dados" },
  { chave: "directCommunication", rotulo: "Comunicação direta" },
] as const;

const FATORES_COMPORTAMENTAIS = [
  { sigla: "DIR", rotulo: "Direcionamento" },
  { sigla: "CON", rotulo: "Conexão" },
  { sigla: "SUS", rotulo: "Sustentação" },
  { sigla: "PRE", rotulo: "Precisão" },
] as const;

const ROTULO_FAIXA: Record<string, string> = {
  muito_baixa: "Muito baixa",
  baixa: "Baixa",
  moderada: "Moderada",
  alta: "Alta",
  muito_alta: "Muito alta",
};

const ROTULO_CONSISTENCIA: Record<string, string> = {
  ADEQUADA: "Adequada",
  REQUER_ATENCAO: "Requer atenção (muitas respostas neutras)",
  BAIXA_CONSISTENCIA: "Baixa consistência (respostas muito uniformes)",
};

const ROTULO_STATUS_ADMISSAO: Record<string, string> = {
  AGUARDANDO_CANDIDATO: "Aguardando candidato",
  AGUARDANDO_APROVACAO_DP: "Aguardando aprovação do DP",
  AJUSTES_SOLICITADOS: "Ajustes solicitados",
  APROVADO: "Aprovado",
};

const ROTULO_STATUS_CONVITE: Record<string, string> = {
  PENDENTE: "Convite enviado",
  ACEITO: "Respondendo",
  REVOGADO: "Revogado",
  EXPIRADO: "Expirado",
};

function formatarTempo(segundos: number | null) {
  if (segundos == null) return null;
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min}min ${String(seg).padStart(2, "0")}s`;
}

interface DetalheCandidatura {
  codCdt: string;
  estagio: string;
  codFun: string | null;
  knockoutJson: { pergunta: string } | null;
  candidato: {
    codCand: string;
    nomeCand: string;
    email: string;
    cidade: string | null;
    fone: string | null;
    linkedin: string | null;
    perfilCulturalJson: Record<string, number> | null;
  };
  canal: { nomeCanal: string };
  vaga: {
    codVag: string;
    titulo: string;
    perfilCulturalIdealJson: Record<string, number> | null;
    requisitos: { codVagReq: string; descrReq: string; tipoReq: string }[];
  };
  match: {
    scoreGeral: number;
    scoreContratacao: number;
    scoreCultura: number | null;
    driverPrincipal: string | null;
    qtdGapsCrit: number;
  } | null;
  processoAdmissao: { status: string } | null;
  requisitosAvaliados: {
    codVagReq: string;
    descrReq: string;
    tipoReq: string;
    scorePct: number;
    nivelInformado: number | null;
    tempoInformado: number | null;
    evidenciaTexto: string | null;
  }[];
}

interface Curriculo {
  codCandCv: string;
  arquivo: string;
  dhInc: string;
  textoExtraido: string | null;
}

interface FacetaComportamental {
  codFat: string;
  faceta: string;
  percentualNormalizado: number;
  quantidade: number;
}
interface DetalheComportamental {
  status: string;
  facetas: FacetaComportamental[];
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
      iaResumos: { tipo: string; conteudoJson: unknown }[];
    } | null;
  } | null;
}

interface RespostaResumoIa {
  resumo: string;
  pontosFortes: string[];
  pontosAtencao: string[];
}
interface RespostaPerguntasIa {
  perguntas: { pergunta: string; motivo: string }[];
}

interface EventoHistorico {
  codCdtHis: string;
  tipoEvento: string;
  estagioAnt: string | null;
  estagioNovo: string | null;
  rotuloPub: string | null;
  notaInterna: string | null;
  tipoAtor: string;
  dhInc: string;
}

function termosDosRequisitos(requisitos: { descrReq: string }[]): string[] {
  const palavras = new Set<string>();
  for (const r of requisitos) {
    for (const p of r.descrReq.split(/\s+/)) {
      const limpo = p.replace(/[^\p{L}\p{N}]/gu, "");
      if (limpo.length >= 4) palavras.add(limpo.toLowerCase());
    }
  }
  return Array.from(palavras);
}

function destacarTermos(texto: string, termos: string[]) {
  if (termos.length === 0) return texto;
  const escapados = termos.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escapados.join("|")})`, "gi");
  const partes = texto.split(regex);
  return partes.map((parte, i) =>
    termos.includes(parte.toLowerCase()) ? (
      <mark key={i} style={{ background: "var(--amber-100, #F2E3C4)", color: "inherit" }}>{parte}</mark>
    ) : (
      <span key={i}>{parte}</span>
    ),
  );
}

async function baixarArquivo(codCand: string, codCandCv: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const res = await fetch(`${BASE}/candidatos/${codCand}/curriculo/${codCandCv}/arquivo`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    alert("Não foi possível abrir o arquivo.");
    return;
  }
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), "_blank");
}

export function CandidatoDrawer({
  codCdt,
  fechar,
  aoAtualizar,
}: {
  codCdt: string | null;
  fechar: () => void;
  aoAtualizar: () => void;
}) {
  const rotear = useRouter();
  const [tab, setTab] = useState("perfil");
  const [detalhe, setDetalhe] = useState<DetalheCandidatura | null>(null);
  const [curriculos, setCurriculos] = useState<Curriculo[] | null>(null);
  const [comportamental, setComportamental] = useState<DetalheComportamental | "sem_convite" | null>(null);
  const [historico, setHistorico] = useState<EventoHistorico[] | null>(null);
  const [enviandoCv, setEnviandoCv] = useState(false);
  const [convidando, setConvidando] = useState(false);
  const [iniciandoAdmissao, setIniciandoAdmissao] = useState(false);
  const [gerandoResumo, setGerandoResumo] = useState(false);
  const [gerandoPerguntas, setGerandoPerguntas] = useState(false);

  const carregarDetalhe = useCallback(async () => {
    if (!codCdt) return;
    const r = await api<DetalheCandidatura>(`/candidaturas/${codCdt}`);
    if (r.status === 200 && r.json) setDetalhe(r.json);
  }, [codCdt]);

  useEffect(() => {
    setTab("perfil");
    setDetalhe(null);
    setCurriculos(null);
    setComportamental(null);
    setHistorico(null);
    if (codCdt) void carregarDetalhe();
  }, [codCdt, carregarDetalhe]);

  useEffect(() => {
    if (!codCdt || !detalhe) return;
    if (tab === "curriculo" && curriculos === null) {
      void api<Curriculo[]>(`/candidatos/${detalhe.candidato.codCand}/curriculo`).then((r) => {
        if (r.status === 200 && r.json) setCurriculos(r.json);
      });
    }
    if (tab === "comportamental" && comportamental === null) {
      void api<DetalheComportamental>(`/candidaturas/${codCdt}/avaliacao-comportamental`).then((r) => {
        setComportamental(r.status === 200 && r.json ? r.json : "sem_convite");
      });
    }
    if (tab === "historico" && historico === null) {
      void api<EventoHistorico[]>(`/candidaturas/${codCdt}/timeline`).then((r) => {
        if (r.status === 200 && r.json) setHistorico(r.json);
      });
    }
  }, [tab, codCdt, detalhe, curriculos, comportamental, historico]);

  async function enviarCurriculo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo || !detalhe) return;
    setEnviandoCv(true);
    const form = new FormData();
    form.set("arquivo", arquivo);
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const res = await fetch(`${BASE}/candidatos/${detalhe.candidato.codCand}/curriculo`, {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: form,
    });
    setEnviandoCv(false);
    e.target.value = "";
    if (!res.ok) {
      alert("Não foi possível enviar o currículo (formatos aceitos: PDF, DOCX, TXT — até 8MB).");
      return;
    }
    setCurriculos(null);
    const r = await api<Curriculo[]>(`/candidatos/${detalhe.candidato.codCand}/curriculo`);
    if (r.status === 200 && r.json) setCurriculos(r.json);
  }

  async function convidarComportamental() {
    if (!codCdt) return;
    setConvidando(true);
    const r = await api<{ tokenPub: string }>(`/candidaturas/${codCdt}/avaliacao-comportamental/convidar`, { metodo: "POST" });
    setConvidando(false);
    if (r.status !== 201 || !r.json) {
      alert("Não foi possível gerar o convite da avaliação comportamental.");
      return;
    }
    const url = `${window.location.origin}/avaliacao-comportamental/${r.json.tokenPub}`;
    try {
      await navigator.clipboard.writeText(url);
      alert(`Link copiado para a área de transferência:\n${url}`);
    } catch {
      alert(`Link do convite:\n${url}`);
    }
    setComportamental(null);
    const detalheR = await api<DetalheComportamental>(`/candidaturas/${codCdt}/avaliacao-comportamental`);
    setComportamental(detalheR.status === 200 && detalheR.json ? detalheR.json : "sem_convite");
    aoAtualizar();
  }

  async function iniciarAdmissao() {
    if (!codCdt) return;
    setIniciandoAdmissao(true);
    const r = await api(`/candidaturas/${codCdt}/admissao/iniciar`, { metodo: "POST" });
    setIniciandoAdmissao(false);
    if (r.status !== 201) {
      alert("Não foi possível iniciar a admissão.");
      return;
    }
    rotear.push(`/app/recrutamento/admissao/${codCdt}`);
  }

  async function recarregarComportamental() {
    if (!codCdt) return;
    const r = await api<DetalheComportamental>(`/candidaturas/${codCdt}/avaliacao-comportamental`);
    setComportamental(r.status === 200 && r.json ? r.json : "sem_convite");
  }

  async function gerarResumoIa() {
    if (!codCdt) return;
    setGerandoResumo(true);
    const r = await api(`/candidaturas/${codCdt}/avaliacao-comportamental/gerar-resumo`, { metodo: "POST" });
    setGerandoResumo(false);
    if (r.status !== 201) {
      alert("Não foi possível gerar o resumo com IA. Tente novamente em instantes.");
      return;
    }
    await recarregarComportamental();
  }

  async function gerarPerguntasIa() {
    if (!codCdt) return;
    setGerandoPerguntas(true);
    const r = await api(`/candidaturas/${codCdt}/avaliacao-comportamental/gerar-perguntas-entrevista`, { metodo: "POST" });
    setGerandoPerguntas(false);
    if (r.status !== 201) {
      alert("Não foi possível gerar as perguntas com IA. Tente novamente em instantes.");
      return;
    }
    await recarregarComportamental();
  }

  return (
    <Gaveta titulo={detalhe ? detalhe.candidato.nomeCand : "Candidato"} aberta={!!codCdt} fechar={fechar} largura={680}>
      {!detalhe ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando...</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{detalhe.candidato.email} · via {detalhe.canal.nomeCanal}</div>
            {detalhe.candidato.cidade && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{detalhe.candidato.cidade}</div>}
          </div>

          <Abas
            ativa={tab}
            aoMudar={setTab}
            abas={[
              { id: "perfil", rotulo: "Perfil" },
              { id: "curriculo", rotulo: "Currículo" },
              { id: "comportamental", rotulo: "Comportamental" },
              { id: "historico", rotulo: "Histórico" },
            ]}
          />

          {tab === "perfil" && (
            <div style={{ display: "grid", gap: 16 }}>
              {detalhe.knockoutJson && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--amber-100, #F2E3C4)",
                    color: "var(--amber-700, #714E08)",
                    fontSize: 12,
                  }}
                >
                  ⚠ Resposta eliminatória sinalizada em &quot;{detalhe.knockoutJson.pergunta}&quot; — decisão é sua.
                </div>
              )}

              {detalhe.match && (
                <div>
                  <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Score geral</div>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>{detalhe.match.scoreGeral}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Contratação</div>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>{detalhe.match.scoreContratacao}</div>
                    </div>
                    {detalhe.match.scoreCultura != null && (
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Fit cultural</div>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>{detalhe.match.scoreCultura}</div>
                      </div>
                    )}
                  </div>
                  {detalhe.match.driverPrincipal && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Ponto forte: {detalhe.match.driverPrincipal}</div>
                  )}
                  {detalhe.match.qtdGapsCrit > 0 && (
                    <div style={{ fontSize: 12, color: "var(--red-600, #9A3833)" }}>{detalhe.match.qtdGapsCrit} gap(s) crítico(s)</div>
                  )}
                </div>
              )}

              {detalhe.requisitosAvaliados.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Requisitos</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {detalhe.requisitosAvaliados.map((r) => (
                      <div key={r.codVagReq}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                          <span>
                            {r.descrReq}
                            {r.tipoReq === "OBRIGATORIO" && <span style={{ color: "var(--text-muted)" }}> (obrigatório)</span>}
                          </span>
                          <span style={{ color: "var(--text-muted)" }}>{r.scorePct}%</span>
                        </div>
                        <div style={{ height: 5, background: "var(--border-default)", borderRadius: 999, overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${r.scorePct}%`,
                              background: r.scorePct >= 75 ? "var(--green-600, #2C7A4B)" : r.scorePct >= 50 ? "var(--amber-600, #96690C)" : "var(--red-600, #9A3833)",
                            }}
                          />
                        </div>
                        {r.evidenciaTexto && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{r.evidenciaTexto}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(detalhe.vaga.perfilCulturalIdealJson || detalhe.candidato.perfilCulturalJson) && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Perfil cultural — ideal da vaga × candidato</div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {DIMENSOES_CULTURA.map((d) => {
                      const ideal = detalhe.vaga.perfilCulturalIdealJson?.[d.chave];
                      const cand = detalhe.candidato.perfilCulturalJson?.[d.chave];
                      if (ideal == null && cand == null) return null;
                      return (
                        <div key={d.chave} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span style={{ color: "var(--text-muted)" }}>{d.rotulo}</span>
                          <span>
                            {ideal ?? "—"} <span style={{ color: "var(--text-muted)" }}>ideal</span> · {cand ?? "—"}{" "}
                            <span style={{ color: "var(--text-muted)" }}>candidato</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {detalhe.estagio === "hired" && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Admissão</div>
                  {detalhe.codFun ? (
                    <span
                      style={{
                        display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                        background: "var(--green-100, #D6E9DF)", color: "var(--green-700, #1D533B)",
                      }}
                    >
                      Admitido
                    </span>
                  ) : detalhe.processoAdmissao ? (
                    <Link href={`/app/recrutamento/admissao/${detalhe.codCdt}`} style={{ fontSize: 13, color: "var(--text-link)" }}>
                      Admissão: {ROTULO_STATUS_ADMISSAO[detalhe.processoAdmissao.status] ?? detalhe.processoAdmissao.status}
                    </Link>
                  ) : (
                    <button
                      onClick={iniciarAdmissao}
                      disabled={iniciandoAdmissao}
                      style={{
                        padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border-default)",
                        background: "var(--surface-default)", fontSize: 13, cursor: "pointer", font: "inherit",
                      }}
                    >
                      {iniciandoAdmissao ? "Iniciando..." : "Iniciar Admissão"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "curriculo" && (
            <div style={{ display: "grid", gap: 12 }}>
              <label
                style={{
                  display: "inline-block", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border-default)",
                  background: "var(--surface-default)", fontSize: 13, cursor: "pointer", width: "fit-content",
                }}
              >
                {enviandoCv ? "Enviando..." : "Enviar currículo (PDF, DOCX ou TXT)"}
                <input type="file" accept=".pdf,.docx,.txt" onChange={enviarCurriculo} disabled={enviandoCv} style={{ display: "none" }} />
              </label>

              {curriculos === null ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando...</p>
              ) : curriculos.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Nenhum currículo enviado ainda.</p>
              ) : (
                curriculos.map((cv) => {
                  const termos = termosDosRequisitos(detalhe.vaga.requisitos);
                  return (
                    <div key={cv.codCandCv} style={{ border: "1px solid var(--border-default)", borderRadius: 8, padding: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          Enviado em {new Date(cv.dhInc).toLocaleDateString("pt-BR")}
                        </span>
                        <button
                          onClick={() => baixarArquivo(detalhe.candidato.codCand, cv.codCandCv)}
                          style={{ background: "none", border: "none", color: "var(--text-link)", cursor: "pointer", font: "inherit", fontSize: 12 }}
                        >
                          Abrir arquivo original
                        </button>
                      </div>
                      {cv.textoExtraido ? (
                        <div
                          style={{
                            fontSize: 12, whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto",
                            padding: 8, background: "var(--surface-page)", borderRadius: 6, lineHeight: 1.5,
                          }}
                        >
                          {destacarTermos(cv.textoExtraido, termos)}
                        </div>
                      ) : (
                        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Texto não pôde ser extraído deste arquivo.</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === "comportamental" && (
            <div style={{ display: "grid", gap: 16 }}>
              {comportamental === null ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando...</p>
              ) : comportamental === "sem_convite" ? (
                <button
                  onClick={convidarComportamental}
                  disabled={convidando}
                  style={{
                    padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border-default)",
                    background: "var(--surface-default)", fontSize: 13, cursor: "pointer", font: "inherit", width: "fit-content",
                  }}
                >
                  {convidando ? "Gerando link..." : "Convidar avaliação comportamental"}
                </button>
              ) : !comportamental.sessao?.resultado ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {ROTULO_STATUS_CONVITE[comportamental.status] ?? comportamental.status} — aguardando o candidato concluir.
                </p>
              ) : (
                (() => {
                  const resultado = comportamental.sessao.resultado;
                  const aderenciaVaga = resultado.aderencias[0];
                  const facetas = [...comportamental.facetas].sort((a, b) => b.percentualNormalizado - a.percentualNormalizado);
                  const maiorForca = facetas[0];
                  const maiorAtencao = facetas[facetas.length - 1];
                  const tempo = formatarTempo(comportamental.sessao.tempoTotalSeg);
                  return (
                    <>
                      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)" }}>
                        <span>{facetas.reduce((s, f) => s + f.quantidade, 0)} respostas</span>
                        {tempo && <span>· {tempo} de duração</span>}
                      </div>

                      {resultado.indicadorConsistencia !== "ADEQUADA" && (
                        <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--amber-100, #F2E3C4)", color: "var(--amber-700, #714E08)", fontSize: 12 }}>
                          ⚠ {ROTULO_CONSISTENCIA[resultado.indicadorConsistencia] ?? resultado.indicadorConsistencia}
                          {" — "}
                          {Math.round(resultado.percRespNeutras)}% de respostas neutras, {Math.round(resultado.percRespUniformes)}% na mesma alternativa.
                        </div>
                      )}

                      {aderenciaVaga && (
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Aderência geral à vaga</div>
                          <div style={{ fontSize: 28, fontWeight: 700 }}>{aderenciaVaga.aderenciaGeral}</div>
                        </div>
                      )}

                      {maiorForca && maiorAtencao && maiorForca.faceta !== maiorAtencao.faceta && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <div style={{ border: "1px solid var(--border-default)", borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Ponto mais forte</div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{maiorForca.faceta}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{maiorForca.percentualNormalizado}%</div>
                          </div>
                          <div style={{ border: "1px solid var(--border-default)", borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Ponto de atenção</div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{maiorAtencao.faceta}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{maiorAtencao.percentualNormalizado}%</div>
                          </div>
                        </div>
                      )}

                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Fatores comportamentais</div>
                        <div style={{ display: "grid", gap: 16 }}>
                          {FATORES_COMPORTAMENTAIS.map((f) => {
                            const rf = resultado.fatores.find((x) => x.fator.sigla === f.sigla);
                            if (!rf) return null;
                            const af = aderenciaVaga?.fatores.find((x) => x.fator.sigla === f.sigla);
                            const facetasFator = facetas.filter((x) => x.codFat === f.sigla);
                            return (
                              <div key={f.sigla}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                                  <span style={{ fontWeight: 600 }}>{f.rotulo}</span>
                                  <span style={{ color: "var(--text-muted)" }}>
                                    {rf.percentualNormalizado}% · {ROTULO_FAIXA[rf.faixaInterpretativa] ?? rf.faixaInterpretativa}
                                  </span>
                                </div>
                                <div style={{ height: 6, background: "var(--border-default)", borderRadius: 999, overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${rf.percentualNormalizado}%`, background: "var(--brand-700)" }} />
                                </div>
                                {af && (
                                  <div style={{ fontSize: 11, color: af.dentroDaFaixa === "S" ? "var(--green-700, #1D533B)" : "var(--red-600, #9A3833)", marginTop: 2 }}>
                                    {af.dentroDaFaixa === "S" ? "Dentro da faixa desejada pela vaga" : `Fora da faixa desejada pela vaga (aderência ${af.aderenciaDimensao})`}
                                  </div>
                                )}
                                {facetasFator.length > 0 && (
                                  <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: "2px solid var(--border-default)", display: "grid", gap: 6 }}>
                                    {facetasFator.map((ft) => (
                                      <div key={ft.faceta} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 11, color: "var(--text-muted)", width: 170, flexShrink: 0 }}>{ft.faceta}</span>
                                        <div style={{ flex: 1, height: 4, background: "var(--border-default)", borderRadius: 999, overflow: "hidden" }}>
                                          <div style={{ height: "100%", width: `${ft.percentualNormalizado}%`, background: "var(--brand-500, #8A5B3F)" }} />
                                        </div>
                                        <span style={{ fontSize: 11, color: "var(--text-muted)", width: 32, textAlign: "right" }}>
                                          {Math.round(ft.percentualNormalizado)}%
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {(() => {
                        const resumoIa = resultado.iaResumos.find((r) => r.tipo === "RESUMO_EXECUTIVO")?.conteudoJson as RespostaResumoIa | undefined;
                        const perguntasIa = resultado.iaResumos.find((r) => r.tipo === "PERGUNTAS_ENTREVISTA")?.conteudoJson as RespostaPerguntasIa | undefined;
                        return (
                          <div style={{ display: "grid", gap: 16, borderTop: "1px solid var(--border-default)", paddingTop: 16 }}>
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>Resumo executivo (IA)</div>
                                {!resumoIa && (
                                  <button
                                    onClick={gerarResumoIa}
                                    disabled={gerandoResumo}
                                    style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--surface-default)", fontSize: 12, cursor: "pointer", font: "inherit" }}
                                  >
                                    {gerandoResumo ? "Gerando..." : "Gerar resumo"}
                                  </button>
                                )}
                              </div>
                              {resumoIa ? (
                                <div style={{ fontSize: 12, display: "grid", gap: 8 }}>
                                  <p style={{ margin: 0 }}>{resumoIa.resumo}</p>
                                  {resumoIa.pontosFortes.length > 0 && (
                                    <div>
                                      <span style={{ color: "var(--text-muted)" }}>Pontos fortes: </span>
                                      {resumoIa.pontosFortes.join(" · ")}
                                    </div>
                                  )}
                                  {resumoIa.pontosAtencao.length > 0 && (
                                    <div>
                                      <span style={{ color: "var(--text-muted)" }}>Explorar na entrevista: </span>
                                      {resumoIa.pontosAtencao.join(" · ")}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                  Gera uma explicação em linguagem simples do resultado acima — a IA só explica, nunca recalcula o score.
                                </p>
                              )}
                            </div>

                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>Perguntas de entrevista sugeridas (IA)</div>
                                {!perguntasIa && (
                                  <button
                                    onClick={gerarPerguntasIa}
                                    disabled={gerandoPerguntas}
                                    style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--surface-default)", fontSize: 12, cursor: "pointer", font: "inherit" }}
                                  >
                                    {gerandoPerguntas ? "Gerando..." : "Sugerir perguntas"}
                                  </button>
                                )}
                              </div>
                              {perguntasIa ? (
                                <div style={{ display: "grid", gap: 8 }}>
                                  {perguntasIa.perguntas.map((p, i) => (
                                    <div key={i} style={{ fontSize: 12 }}>
                                      <div style={{ fontWeight: 600 }}>{p.pergunta}</div>
                                      <div style={{ color: "var(--text-muted)" }}>{p.motivo}</div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                  Sugere perguntas pra validar na entrevista os pontos identificados no resultado.
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  );
                })()
              )}
            </div>
          )}

          {tab === "historico" && (
            <div style={{ display: "grid", gap: 10 }}>
              {historico === null ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando...</p>
              ) : historico.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Sem eventos registrados.</p>
              ) : (
                historico.map((ev) => (
                  <div key={ev.codCdtHis} style={{ borderLeft: "2px solid var(--border-default)", paddingLeft: 10 }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(ev.dhInc).toLocaleString("pt-BR")}</div>
                    <div style={{ fontSize: 13 }}>
                      {ev.rotuloPub ?? (ev.estagioNovo ? `${ev.estagioAnt ?? "—"} → ${ev.estagioNovo}` : ev.tipoEvento)}
                    </div>
                    {ev.notaInterna && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{ev.notaInterna}</div>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </Gaveta>
  );
}
