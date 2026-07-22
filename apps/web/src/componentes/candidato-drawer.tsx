"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, fetchAutenticado } from "@/lib/api";
import { Abas, BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "./formulario";
import { AnaliseIaCandidato } from "@/componentes/analise-ia-candidato";
import { PerfilComportamentalVisao } from "@/componentes/perfil-comportamental-visao";
import { ResumoCandidatura, type SituacaoCandidatura } from "@/componentes/resumo-candidatura";

const ROTULO_STATUS_ADMISSAO: Record<string, string> = {
  AGUARDANDO_CANDIDATO: "Aguardando candidato",
  AGUARDANDO_APROVACAO_DP: "Aguardando aprovação do DP",
  AJUSTES_SOLICITADOS: "Ajustes solicitados",
  APROVADO: "Aprovado",
};

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
    perfilCulturalOrigem: string | null;
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
  situacao: SituacaoCandidatura | null;
  culturaEfetiva: { perfil: Record<string, number> | null; origem: "VAGA" | "EMPRESA" | null } | null;
  requisitosAvaliados: {
    codVagReq: string;
    descrReq: string;
    tipoReq: string;
    scorePct: number;
    nivelInformado: number | null;
    tempoInformado: number | null;
    evidenciaTexto: string | null;
    evidenciaCurriculo: string | null;
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
    } | null;
  } | null;
  aderenciaPadrao: {
    aderenciaGeral: number;
    fatores: { fator: { sigla: string; nome: string }; distanciaFaixa: number; aderenciaDimensao: number; dentroDaFaixa: string }[];
  } | null;
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
  const res = await fetchAutenticado(`/candidatos/${codCand}/curriculo/${codCandCv}/arquivo`);
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
  const [anotacoes, setAnotacoes] = useState<EventoHistorico[] | null>(null);
  const [novaNota, setNovaNota] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [mudandoEstagio, setMudandoEstagio] = useState(false);
  const [entrevistaAberta, setEntrevistaAberta] = useState(false);
  const [formEntrev, setFormEntrev] = useState({ data: "", hora: "", duracaoMin: "45", tipo: "VIDEO", local: "", linkReuniao: "" });
  const [salvandoEntrev, setSalvandoEntrev] = useState(false);
  const [erroEntrev, setErroEntrev] = useState<string | null>(null);

  /** Marca a entrevista direto — quem já sabe o horário não precisa da grade. */
  async function agendarEntrevista(e: React.FormEvent) {
    e.preventDefault();
    if (!codCdt) return;
    setErroEntrev(null);
    if (!formEntrev.data || !formEntrev.hora) {
      setErroEntrev("Informe data e hora.");
      return;
    }
    setSalvandoEntrev(true);
    const r = await api(`/candidaturas/${codCdt}/entrevistas`, {
      metodo: "POST",
      corpo: {
        dhInicio: new Date(`${formEntrev.data}T${formEntrev.hora}`).toISOString(),
        duracaoMin: Number(formEntrev.duracaoMin),
        tipo: formEntrev.tipo,
        local: formEntrev.local || undefined,
        linkReuniao: formEntrev.linkReuniao || undefined,
      },
    });
    setSalvandoEntrev(false);
    if (r.status !== 201) {
      setErroEntrev("Não foi possível marcar a entrevista.");
      return;
    }
    setEntrevistaAberta(false);
    await carregarDetalhe();
    aoAtualizar();
  }

  /**
   * Convida o candidato a escolher um horário da grade da vaga. Sem isso, a
   * grade fica dependendo de o candidato abrir o portal por conta própria.
   */
  async function convidarParaEscolher() {
    if (!codCdt) return;
    setErroEntrev(null);
    setSalvandoEntrev(true);
    const r = await api<{ horariosLivres: number }>(`/candidaturas/${codCdt}/entrevistas/convite`, { metodo: "POST" });
    setSalvandoEntrev(false);
    if (r.status !== 201) {
      setErroEntrev("Não há horários abertos nesta vaga. Abra a grade na aba Entrevistas da vaga.");
      return;
    }
    setEntrevistaAberta(false);
    alert(`Convite enviado. O candidato pode escolher entre ${r.json?.horariosLivres} horário(s).`);
  }

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
    setAnotacoes(null);
    setNovaNota("");
    if (codCdt) void carregarDetalhe();
  }, [codCdt, carregarDetalhe]);

  useEffect(() => {
    if (!codCdt || !detalhe) return;
    if (tab === "curriculo" && curriculos === null) {
      void api<Curriculo[]>(`/candidatos/${detalhe.candidato.codCand}/curriculo`).then((r) => {
        if (r.status === 200 && r.json) setCurriculos(r.json);
      });
    }
    if (tab === "dossie" && comportamental === null) {
      void api<DetalheComportamental>(`/candidaturas/${codCdt}/avaliacao-comportamental`).then((r) => {
        setComportamental(r.status === 200 && r.json ? r.json : "sem_convite");
      });
    }
    if (tab === "historico" && historico === null) {
      void api<EventoHistorico[]>(`/candidaturas/${codCdt}/timeline`).then((r) => {
        if (r.status === 200 && r.json) setHistorico(r.json);
      });
    }
    if (tab === "anotacoes" && anotacoes === null) {
      void api<EventoHistorico[]>(`/candidaturas/${codCdt}/anotacoes`).then((r) => {
        if (r.status === 200 && r.json) setAnotacoes(r.json);
      });
    }
  }, [tab, codCdt, detalhe, curriculos, comportamental, historico, anotacoes]);

  async function mudarEstagio(estagio: string) {
    if (!codCdt) return;
    setMudandoEstagio(true);
    await api(`/candidaturas/${codCdt}/estagio`, { metodo: "PATCH", corpo: { estagio } });
    setMudandoEstagio(false);
    setHistorico(null);
    await carregarDetalhe();
    aoAtualizar();
  }

  async function adicionarNota() {
    if (!codCdt || !novaNota.trim()) return;
    setSalvandoNota(true);
    const r = await api(`/candidaturas/${codCdt}/anotacoes`, { metodo: "POST", corpo: { nota: novaNota.trim() } });
    setSalvandoNota(false);
    if (r.status !== 201) { alert("Não foi possível salvar a anotação."); return; }
    setNovaNota("");
    setAnotacoes(null);
  }

  async function enviarCurriculo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo || !detalhe) return;
    setEnviandoCv(true);
    const form = new FormData();
    form.set("arquivo", arquivo);
    // FormData define seu próprio content-type (com boundary) — não sobrescrever.
    const res = await fetchAutenticado(`/candidatos/${detalhe.candidato.codCand}/curriculo`, {
      method: "POST",
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

  /** Link único do candidato: acompanha o processo e reúne o que está pendente dele. */
  async function copiarLinkAcompanhamento() {
    if (!codCdt) return;
    const r = await api<{ tokenPub: string }>(`/candidaturas/${codCdt}/link-acompanhamento`, { metodo: "POST" });
    if (r.status !== 201 || !r.json) {
      alert("Não foi possível gerar o link de acompanhamento.");
      return;
    }
    const url = `${window.location.origin}/acompanhar/${r.json.tokenPub}`;
    try {
      await navigator.clipboard.writeText(url);
      alert(`Link copiado para a área de transferência:\n${url}`);
    } catch {
      alert(`Link de acompanhamento:\n${url}`);
    }
  }


  return (
    <Gaveta titulo={detalhe ? detalhe.candidato.nomeCand : "Candidato"} aberta={!!codCdt} fechar={fechar} largura={1420}>
      {!detalhe ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando...</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {detalhe.candidato.email} · via {detalhe.canal.nomeCanal}
              {" · "}
              <button
                onClick={copiarLinkAcompanhamento}
                title="Link onde o candidato acompanha o processo e vê o que está pendente"
                style={{ border: "none", background: "none", color: "var(--text-link)", cursor: "pointer", fontFamily: "inherit", fontSize: 12, padding: 0 }}
              >
                copiar link de acompanhamento
              </button>
            </div>
            {detalhe.candidato.cidade && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{detalhe.candidato.cidade}</div>}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { estagio: "screening", rotulo: "Avançar p/ Triagem" },
              { estagio: "not_selected", rotulo: "Reprovar" },
            ].filter((a) => a.estagio !== detalhe.estagio).map((a) => (
              <button
                key={a.estagio}
                onClick={() => mudarEstagio(a.estagio)}
                disabled={mudandoEstagio}
                style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--surface-default)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
              >
                {a.rotulo}
              </button>
            ))}
            {/* Marcar entrevista abre o agendamento de verdade. Antes este
                botão só mudava a etapa, prometendo algo que não fazia. */}
            <button
              onClick={() => setEntrevistaAberta(true)}
              disabled={mudandoEstagio}
              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--surface-default)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
            >
              Marcar entrevista
            </button>
          </div>

          <Abas
            ativa={tab}
            aoMudar={setTab}
            abas={[
              { id: "perfil", rotulo: "Resumo" },
              { id: "curriculo", rotulo: "Currículo" },
              { id: "dossie", rotulo: "Dossiê" },
              { id: "historico", rotulo: "Histórico" },
              { id: "anotacoes", rotulo: "Anotações" },
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

              <ResumoCandidatura
                estagio={detalhe.estagio}
                situacao={detalhe.situacao ?? null}
                match={detalhe.match}
                requisitos={detalhe.requisitosAvaliados}
                perfilCandidato={detalhe.candidato.perfilCulturalJson}
                perfilIdeal={(detalhe.culturaEfetiva?.perfil as Record<string, number> | null) ?? detalhe.vaga.perfilCulturalIdealJson}
                origemCandidato={detalhe.candidato.perfilCulturalOrigem ?? null}
                origemVaga={detalhe.culturaEfetiva?.origem ?? null}
                aoIrParaDossie={() => setTab("dossie")}
              />

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
                        background: "var(--surface-default)", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
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
                          style={{ background: "none", border: "none", color: "var(--text-link)", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}
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

          {tab === "dossie" && (
            <div style={{ display: "grid", gap: 22 }}>
              {/* Perfil comportamental e leitura do candidato numa página só:
                  eram duas abas, e quem lê os fatores quer, no mesmo fôlego,
                  o que eles significam para esta vaga. */}
              <section>
                <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 10px" }}>Perfil comportamental</h3>
                <PerfilComportamentalVisao
                  comportamental={comportamental}
                  convidando={convidando}
                  aoConvidar={convidarComportamental}
                />
              </section>

              <section style={{ borderTop: "1px solid var(--border-default)", paddingTop: 20 }}>
                {codCdt && <AnaliseIaCandidato codCdt={codCdt} />}
              </section>
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

          {tab === "anotacoes" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <textarea
                  value={novaNota}
                  onChange={(e) => setNovaNota(e.target.value)}
                  rows={3}
                  placeholder="Anotação interna sobre o candidato…"
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-default)", fontFamily: "inherit", fontSize: 13, resize: "vertical" }}
                />
                <button
                  onClick={adicionarNota}
                  disabled={salvandoNota || !novaNota.trim()}
                  style={{ justifySelf: "start", padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--surface-default)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", opacity: !novaNota.trim() ? 0.6 : 1 }}
                >
                  {salvandoNota ? "Salvando..." : "Adicionar anotação"}
                </button>
              </div>
              {anotacoes === null ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando...</p>
              ) : anotacoes.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Nenhuma anotação ainda.</p>
              ) : (
                anotacoes.map((ev) => (
                  <div key={ev.codCdtHis} style={{ border: "1px solid var(--border-default)", borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(ev.dhInc).toLocaleString("pt-BR")}</div>
                    <div style={{ fontSize: 13, marginTop: 2 }}>{ev.notaInterna}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <Gaveta titulo="Marcar entrevista" aberta={entrevistaAberta} fechar={() => setEntrevistaAberta(false)} largura={520}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.55 }}>
          Marque o horário aqui, ou convide o candidato a escolher entre os horários que a vaga tem
          abertos — nesse caso ele recebe um e-mail e escolhe pelo portal.
        </p>
        <form onSubmit={agendarEntrevista} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Campo rotulo="Data">
              <Entrada type="date" value={formEntrev.data} onChange={(e) => setFormEntrev({ ...formEntrev, data: e.target.value })} />
            </Campo>
            <Campo rotulo="Hora">
              <Entrada type="time" value={formEntrev.hora} onChange={(e) => setFormEntrev({ ...formEntrev, hora: e.target.value })} />
            </Campo>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Campo rotulo="Duração (min)">
              <Entrada type="number" min={5} max={480} value={formEntrev.duracaoMin} onChange={(e) => setFormEntrev({ ...formEntrev, duracaoMin: e.target.value })} />
            </Campo>
            <Campo rotulo="Formato">
              <Selecao value={formEntrev.tipo} onChange={(e) => setFormEntrev({ ...formEntrev, tipo: e.target.value })}>
                <option value="VIDEO">Vídeo</option>
                <option value="PRESENCIAL">Presencial</option>
                <option value="TELEFONE">Telefone</option>
              </Selecao>
            </Campo>
          </div>
          {formEntrev.tipo === "PRESENCIAL" && (
            <Campo rotulo="Local">
              <Entrada value={formEntrev.local} onChange={(e) => setFormEntrev({ ...formEntrev, local: e.target.value })} />
            </Campo>
          )}
          {formEntrev.tipo === "VIDEO" && (
            <Campo rotulo="Link da reunião">
              <Entrada placeholder="https://…" value={formEntrev.linkReuniao} onChange={(e) => setFormEntrev({ ...formEntrev, linkReuniao: e.target.value })} />
            </Campo>
          )}
          <Erro mensagem={erroEntrev} />
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <BotaoPrimario type="submit" disabled={salvandoEntrev}>
              {salvandoEntrev ? "Marcando…" : "Marcar e avisar o candidato"}
            </BotaoPrimario>
            <button
              type="button"
              onClick={convidarParaEscolher}
              disabled={salvandoEntrev}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--surface-default)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
            >
              Deixar o candidato escolher
            </button>
          </div>
        </form>
      </Gaveta>
    </Gaveta>
  );
}
