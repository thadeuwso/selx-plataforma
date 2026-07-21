"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";
import { CandidatoDrawer } from "@/componentes/candidato-drawer";

interface Candidatura {
  codCdt: string;
  estagio: string;
  dhInc: string;
  codFun: string | null;
  knockoutJson: { pergunta: string } | null;
  candidato: { codCand: string; nomeCand: string; email: string; cidade: string | null };
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

const DIMENSOES_CULTURA = [
  { chave: "autonomy", rotulo: "Autonomia" },
  { chave: "pace", rotulo: "Ritmo" },
  { chave: "collaboration", rotulo: "Colaboração" },
  { chave: "structure", rotulo: "Estrutura" },
  { chave: "dataDriven", rotulo: "Orientação a dados" },
  { chave: "directCommunication", rotulo: "Comunicação direta" },
] as const;

const ROTULO_STATUS_CONVITE: Record<string, string> = {
  PENDENTE: "Convite enviado",
  ACEITO: "Respondendo",
  REVOGADO: "Revogado",
  EXPIRADO: "Expirado",
};

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
}

interface PerfilComportamentalFator {
  fator: { sigla: string };
  minimo: number;
  maximo: number;
  peso: number;
  importancia: string;
  eliminatorio: string;
}
interface PerfilComportamental {
  codPerVag: string;
  fatores: PerfilComportamentalFator[];
}
interface Vaga {
  codVag: string;
  titulo: string;
  status: string;
  perguntas: { codVagPer: string; pergunta: string }[];
  requisitos: { codVagReq: string; descrReq: string; nivelEsperado: number | null; tempoEspMeses: number | null }[];
}
interface Canal {
  codCanal: string;
  nomeCanal: string;
}

const ESTAGIOS: { chave: string; rotulo: string }[] = [
  { chave: "applied", rotulo: "Recebidas" },
  { chave: "screening", rotulo: "Triagem" },
  { chave: "analysis", rotulo: "Análise" },
  { chave: "shortlist", rotulo: "Shortlist" },
  { chave: "interview", rotulo: "Entrevista" },
  { chave: "offer", rotulo: "Proposta" },
  { chave: "hired", rotulo: "Contratado" },
];
const ESTAGIOS_TERMINAIS = [
  { chave: "knockout", rotulo: "Eliminado (triagem)" },
  { chave: "not_selected", rotulo: "Não selecionado" },
  { chave: "rejected", rotulo: "Rejeitado" },
  { chave: "approved", rotulo: "Aprovado" },
  { chave: "archived", rotulo: "Arquivado" },
];
const TODOS_ESTAGIOS = [...ESTAGIOS, ...ESTAGIOS_TERMINAIS];
const rotuloEstagio = (chave: string) => TODOS_ESTAGIOS.find((e) => e.chave === chave)?.rotulo ?? chave;

export default function PipelineVaga() {
  const { codVag } = useParams<{ codVag: string }>();
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [canais, setCanais] = useState<Canal[]>([]);
  const [aberta, setAberta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nomeCand: "", email: "", codCanal: "" });
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [autoavaliacao, setAutoavaliacao] = useState<Record<string, { nivel: string; tempoMeses: string; evidenciaTexto: string }>>({});
  const [perfilCultural, setPerfilCultural] = useState<Record<string, string>>({});
  const [perfilComportamental, setPerfilComportamental] = useState<PerfilComportamental | null>(null);
  const [perfilAberta, setPerfilAberta] = useState(false);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [perfilForm, setPerfilForm] = useState<
    Record<string, { incluir: boolean; minimo: string; maximo: string; eliminatorio: boolean }>
  >({});
  const [drawerCodCdt, setDrawerCodCdt] = useState<string | null>(null);
  const [selecionadosComparar, setSelecionadosComparar] = useState<string[]>([]);
  const [comparacao, setComparacao] = useState<{ nomeCand: string; dados: DetalheComportamental }[] | null>(null);
  const [carregandoComparacao, setCarregandoComparacao] = useState(false);

  const carregar = useCallback(async () => {
    const [v, c, ca, p] = await Promise.all([
      api<Vaga>(`/vagas/${codVag}`),
      api<Candidatura[]>(`/vagas/${codVag}/candidaturas`),
      api<Canal[]>("/canais"),
      api<PerfilComportamental | null>(`/vagas/${codVag}/perfil-comportamental`),
    ]);
    if (v.status === 200 && v.json) setVaga(v.json);
    if (c.status === 200 && c.json) setCandidaturas(c.json);
    if (ca.status === 200 && ca.json) setCanais(ca.json);
    if (p.status === 200) {
      setPerfilComportamental(p.json);
      if (p.json) {
        const preenchido: typeof perfilForm = {};
        for (const f of p.json.fatores) {
          preenchido[f.fator.sigla] = {
            incluir: true,
            minimo: String(f.minimo),
            maximo: String(f.maximo),
            eliminatorio: f.eliminatorio === "S",
          };
        }
        setPerfilForm(preenchido);
      }
    }
  }, [codVag]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function moverEstagio(codCdt: string, estagio: string) {
    await api(`/candidaturas/${codCdt}/estagio`, { metodo: "PATCH", corpo: { estagio } });
    await carregar();
  }

  function alternarSelecaoComparar(codCdt: string) {
    setSelecionadosComparar((atual) => {
      if (atual.includes(codCdt)) return atual.filter((c) => c !== codCdt);
      if (atual.length >= 5) {
        alert("É possível comparar até 5 candidatos por vez.");
        return atual;
      }
      return [...atual, codCdt];
    });
  }

  async function abrirComparacao() {
    setCarregandoComparacao(true);
    const selecionados = candidaturas.filter((c) => selecionadosComparar.includes(c.codCdt));
    const respostas = await Promise.all(
      selecionados.map((c) => api<DetalheComportamental>(`/candidaturas/${c.codCdt}/avaliacao-comportamental`)),
    );
    setCarregandoComparacao(false);
    const dados = respostas
      .map((r, i) => (r.status === 200 && r.json ? { nomeCand: selecionados[i].candidato.nomeCand, dados: r.json } : null))
      .filter((x): x is { nomeCand: string; dados: DetalheComportamental } => x !== null);
    setComparacao(dados);
  }

  async function salvarPerfilComportamental(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoPerfil(true);
    const fatores = FATORES_COMPORTAMENTAIS.filter((f) => perfilForm[f.sigla]?.incluir).map((f) => {
      const v = perfilForm[f.sigla];
      return {
        sigla: f.sigla,
        minimo: Number(v.minimo || 0),
        maximo: Number(v.maximo || 100),
        eliminatorio: v.eliminatorio ? "S" : "N",
      };
    });
    const r = await api(`/vagas/${codVag}/perfil-comportamental`, { metodo: "POST", corpo: { fatores } });
    setSalvandoPerfil(false);
    if (r.status !== 201) {
      alert("Não foi possível salvar o perfil comportamental.");
      return;
    }
    setPerfilAberta(false);
    await carregar();
  }

  async function candidatar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const autoavaliacaoCorpo = Object.fromEntries(
      Object.entries(autoavaliacao)
        .filter(([, v]) => v.nivel || v.tempoMeses || v.evidenciaTexto)
        .map(([codVagReq, v]) => [
          codVagReq,
          {
            nivel: v.nivel ? Number(v.nivel) : undefined,
            tempoMeses: v.tempoMeses ? Number(v.tempoMeses) : undefined,
            evidenciaTexto: v.evidenciaTexto || undefined,
          },
        ]),
    );
    const perfilCulturalCorpo = Object.fromEntries(
      Object.entries(perfilCultural).filter(([, v]) => v.trim()).map(([k, v]) => [k, Number(v)]),
    );
    const r = await api<{ sinalizadoKnockout?: boolean }>(`/vagas/${codVag}/candidaturas`, {
      metodo: "POST",
      corpo: {
        candidato: { nomeCand: form.nomeCand, email: form.email, perfilCultural: perfilCulturalCorpo },
        codCanal: form.codCanal,
        respostas,
        autoavaliacao: autoavaliacaoCorpo,
      },
    });
    setSalvando(false);
    if (r.status !== 201) {
      setErro(r.status === 400 ? "Vaga precisa estar ABERTA para receber candidaturas." : "Não foi possível registrar a candidatura.");
      return;
    }
    setAberta(false);
    setForm({ nomeCand: "", email: "", codCanal: "" });
    setRespostas({});
    setAutoavaliacao({});
    setPerfilCultural({});
    if (r.json?.sinalizadoKnockout) {
      alert("Candidatura registrada — atenção: uma resposta eliminatória foi sinalizada na triagem.");
    }
    await carregar();
  }

  if (!vaga) return null;

  return (
    <main style={{ padding: 32 }}>
      <header style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{vaga.titulo}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Pipeline · {candidaturas.length} candidatura(s)
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setPerfilAberta(true)}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid var(--border-default)",
              background: "var(--surface-default)",
              fontSize: 14,
              cursor: "pointer",
              font: "inherit",
            }}
          >
            Perfil comportamental{perfilComportamental && " ✓"}
          </button>
          <BotaoPrimario onClick={() => setAberta(true)} disabled={vaga.status !== "ABERTA"}>
            Nova candidatura
          </BotaoPrimario>
        </div>
      </header>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {ESTAGIOS.map((col) => {
          const itens = candidaturas.filter((c) => c.estagio === col.chave);
          return (
            <div
              key={col.chave}
              style={{
                minWidth: 240,
                background: "var(--surface-page)",
                border: "1px solid var(--border-default)",
                borderRadius: 10,
                padding: 10,
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                {col.rotulo}
                <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{itens.length}</span>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {itens.map((c) => {
                  const convite = c.convitesComportamentais[0];
                  const comportamentalConcluido = convite?.sessao?.resultado;
                  const corScore =
                    c.match == null ? null
                    : c.match.scoreGeral >= 75 ? { bg: "var(--green-100, #D6E9DF)", fg: "var(--green-700, #1D533B)" }
                    : c.match.scoreGeral >= 50 ? { bg: "var(--amber-100, #F2E3C4)", fg: "var(--amber-700, #714E08)" }
                    : { bg: "var(--red-100, #F4D9D6)", fg: "var(--red-700, #7A2A25)" };
                  return (
                    <div
                      key={c.codCdt}
                      onClick={() => setDrawerCodCdt(c.codCdt)}
                      style={{
                        background: "var(--surface-default)",
                        border: "1px solid var(--border-default)",
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{c.candidato.nomeCand}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>via {c.canal.nomeCanal}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        {corScore && (
                          <span
                            title={`Score de match: ${c.match!.scoreGeral}${c.match!.qtdGapsCrit > 0 ? ` · ${c.match!.qtdGapsCrit} gap(s) crítico(s)` : ""}`}
                            style={{ padding: "2px 7px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: corScore.bg, color: corScore.fg }}
                          >
                            {c.match!.scoreGeral}
                          </span>
                        )}
                        {c.knockoutJson && <span title={`Resposta eliminatória em "${c.knockoutJson.pergunta}"`}>⚠️</span>}
                        {comportamentalConcluido ? (
                          <span title="Avaliação comportamental concluída">
                            🧭 {comportamentalConcluido.aderencias[0]?.aderenciaGeral ?? ""}
                          </span>
                        ) : convite ? (
                          <span title={`Avaliação comportamental: ${ROTULO_STATUS_CONVITE[convite.status] ?? convite.status}`} style={{ opacity: 0.5 }}>
                            🧭
                          </span>
                        ) : null}
                        {comportamentalConcluido && (
                          <label
                            title="Selecionar para comparar"
                            onClick={(e) => e.stopPropagation()}
                            style={{ display: "flex", alignItems: "center", cursor: "pointer", marginLeft: "auto" }}
                          >
                            <input
                              type="checkbox"
                              checked={selecionadosComparar.includes(c.codCdt)}
                              onChange={() => alternarSelecaoComparar(c.codCdt)}
                            />
                          </label>
                        )}
                      </div>
                      <Selecao
                        value={c.estagio}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => moverEstagio(c.codCdt, e.target.value)}
                        style={{ marginTop: 8, fontSize: 12, padding: "4px 6px" }}
                      >
                        {TODOS_ESTAGIOS.map((e) => (
                          <option key={e.chave} value={e.chave}>{e.rotulo}</option>
                        ))}
                      </Selecao>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selecionadosComparar.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--surface-default)",
            border: "1px solid var(--border-default)",
            borderRadius: 10,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,.15)",
            zIndex: 40,
          }}
        >
          <span style={{ fontSize: 13 }}>{selecionadosComparar.length} selecionado(s) para comparar</span>
          <button
            onClick={() => setSelecionadosComparar([])}
            style={{ background: "none", border: "none", color: "var(--text-link)", cursor: "pointer", font: "inherit", fontSize: 13 }}
          >
            Limpar
          </button>
          <BotaoPrimario onClick={abrirComparacao} disabled={selecionadosComparar.length < 2 || carregandoComparacao}>
            {carregandoComparacao ? "Carregando..." : "Comparar"}
          </BotaoPrimario>
        </div>
      )}

      {candidaturas.some((c) => ESTAGIOS_TERMINAIS.some((e) => e.chave === c.estagio)) && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-muted)" }}>Encerradas</div>
          <div style={{ display: "grid", gap: 6 }}>
            {candidaturas
              .filter((c) => ESTAGIOS_TERMINAIS.some((e) => e.chave === c.estagio))
              .map((c) => (
                <div
                  key={c.codCdt}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "var(--surface-default)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  <span>{c.candidato.nomeCand}</span>
                  <span style={{ color: "var(--text-muted)" }}>{rotuloEstagio(c.estagio)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <Gaveta titulo="Nova candidatura" aberta={aberta} fechar={() => setAberta(false)}>
        <form onSubmit={candidatar} style={{ display: "grid", gap: 14 }}>
          <Campo rotulo="Nome do candidato">
            <Entrada required value={form.nomeCand} onChange={(e) => setForm({ ...form, nomeCand: e.target.value })} />
          </Campo>
          <Campo rotulo="E-mail">
            <Entrada required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Campo>
          <Campo rotulo="Canal de origem">
            <Selecao required value={form.codCanal} onChange={(e) => setForm({ ...form, codCanal: e.target.value })}>
              <option value="">— selecione —</option>
              {canais.map((c) => (
                <option key={c.codCanal} value={c.codCanal}>{c.nomeCanal}</option>
              ))}
            </Selecao>
          </Campo>

          {vaga.perguntas.length > 0 && (
            <div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Perguntas de triagem</span>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 8px" }}>
                Registre o que o candidato respondeu (via canal externo, e-mail, telefone...).
              </p>
              <div style={{ display: "grid", gap: 10 }}>
                {vaga.perguntas.map((p) => (
                  <Campo key={p.codVagPer} rotulo={p.pergunta}>
                    <Selecao
                      value={respostas[p.codVagPer] ?? ""}
                      onChange={(e) => setRespostas({ ...respostas, [p.codVagPer]: e.target.value })}
                    >
                      <option value="">— não respondido —</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </Selecao>
                  </Campo>
                ))}
              </div>
            </div>
          )}

          {vaga.requisitos.length > 0 && (
            <div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Autoavaliação por requisito</span>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 8px" }}>
                Nível 0 (não tem) a 4 (especialista) — alimenta o match determinístico (RN-REC-006).
              </p>
              <div style={{ display: "grid", gap: 10 }}>
                {vaga.requisitos.map((r) => {
                  const valor = autoavaliacao[r.codVagReq] ?? { nivel: "", tempoMeses: "", evidenciaTexto: "" };
                  const atualizar = (patch: Partial<typeof valor>) =>
                    setAutoavaliacao({ ...autoavaliacao, [r.codVagReq]: { ...valor, ...patch } });
                  return (
                    <div key={r.codVagReq} style={{ border: "1px solid var(--border-default)", borderRadius: 8, padding: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{r.descrReq}</div>
                      <div style={{ display: "grid", gridTemplateColumns: r.tempoEspMeses != null ? "1fr 1fr" : "1fr", gap: 8, marginBottom: 8 }}>
                        <Campo rotulo="Nível (0-4)">
                          <Entrada
                            type="number" min={0} max={4}
                            value={valor.nivel}
                            onChange={(e) => atualizar({ nivel: e.target.value })}
                          />
                        </Campo>
                        {r.tempoEspMeses != null && (
                          <Campo rotulo="Tempo de experiência (meses)">
                            <Entrada
                              type="number" min={0}
                              value={valor.tempoMeses}
                              onChange={(e) => atualizar({ tempoMeses: e.target.value })}
                            />
                          </Campo>
                        )}
                      </div>
                      <Campo rotulo="Evidência (o que ele disse/mostrou)">
                        <textarea
                          value={valor.evidenciaTexto}
                          onChange={(e) => atualizar({ evidenciaTexto: e.target.value })}
                          rows={2}
                          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-default)", font: "inherit", resize: "vertical" }}
                        />
                      </Campo>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Perfil cultural do candidato</span>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 8px" }}>
              Escala 1-5. Fica salvo no candidato — não precisa preencher de novo nas próximas candidaturas dele.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {DIMENSOES_CULTURA.map((d) => (
                <Campo key={d.chave} rotulo={d.rotulo}>
                  <Entrada
                    type="number" min={1} max={5}
                    value={perfilCultural[d.chave] ?? ""}
                    onChange={(e) => setPerfilCultural({ ...perfilCultural, [d.chave]: e.target.value })}
                  />
                </Campo>
              ))}
            </div>
          </div>

          <Erro mensagem={erro} />
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Registrando..." : "Registrar candidatura"}
          </BotaoPrimario>
        </form>
      </Gaveta>

      <Gaveta titulo="Perfil comportamental da vaga" aberta={perfilAberta} fechar={() => setPerfilAberta(false)}>
        <form onSubmit={salvarPerfilComportamental} style={{ display: "grid", gap: 14 }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            Faixa desejada (0-100) por fator. Marque só os fatores relevantes para esta vaga — os demais ficam de fora da aderência.
          </p>
          {FATORES_COMPORTAMENTAIS.map((f) => {
            const v = perfilForm[f.sigla] ?? { incluir: false, minimo: "", maximo: "", eliminatorio: false };
            const atualizar = (patch: Partial<typeof v>) => setPerfilForm({ ...perfilForm, [f.sigla]: { ...v, ...patch } });
            return (
              <div key={f.sigla} style={{ border: "1px solid var(--border-default)", borderRadius: 8, padding: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                  <input type="checkbox" checked={v.incluir} onChange={(e) => atualizar({ incluir: e.target.checked })} />
                  {f.rotulo}
                </label>
                {v.incluir && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                    <Campo rotulo="Mínimo">
                      <Entrada type="number" min={0} max={100} value={v.minimo} onChange={(e) => atualizar({ minimo: e.target.value })} />
                    </Campo>
                    <Campo rotulo="Máximo">
                      <Entrada type="number" min={0} max={100} value={v.maximo} onChange={(e) => atualizar({ maximo: e.target.value })} />
                    </Campo>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, gridColumn: "1 / -1" }}>
                      <input type="checkbox" checked={v.eliminatorio} onChange={(e) => atualizar({ eliminatorio: e.target.checked })} />
                      Fora da faixa elimina o candidato
                    </label>
                  </div>
                )}
              </div>
            );
          })}
          <BotaoPrimario type="submit" disabled={salvandoPerfil}>
            {salvandoPerfil ? "Salvando..." : "Salvar perfil comportamental"}
          </BotaoPrimario>
        </form>
      </Gaveta>

      <Gaveta
        titulo="Comparar candidatos — Avaliação comportamental"
        aberta={!!comparacao}
        fechar={() => setComparacao(null)}
        largura={comparacao ? 160 + comparacao.length * 150 : 640}
      >
        {comparacao && (() => {
          const linhas = comparacao.map((c) => ({
            nomeCand: c.nomeCand,
            resultado: c.dados.sessao?.resultado ?? null,
          }));
          const comAderencia = linhas.filter((l) => l.resultado?.aderencias[0]);
          const maiorAderencia =
            comAderencia.length > 0
              ? comAderencia.reduce((max, l) => (l.resultado!.aderencias[0].aderenciaGeral > max.resultado!.aderencias[0].aderenciaGeral ? l : max))
              : null;
          const comAtencao = linhas.filter((l) => l.resultado && l.resultado.indicadorConsistencia !== "ADEQUADA");

          const estiloCelula: React.CSSProperties = { padding: "8px 10px", fontSize: 12, borderBottom: "1px solid var(--border-default)" };
          const estiloCabecalho: React.CSSProperties = { ...estiloCelula, fontWeight: 600, textAlign: "left", verticalAlign: "bottom" };

          return (
            <div style={{ display: "grid", gap: 14 }}>
              {maiorAderencia && (
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Mais aderente à vaga: <strong style={{ color: "var(--text-body)" }}>{maiorAderencia.nomeCand}</strong>
                  {" "}({maiorAderencia.resultado!.aderencias[0].aderenciaGeral})
                </div>
              )}
              {comAtencao.length > 0 && (
                <div style={{ fontSize: 12, color: "var(--amber-700, #714E08)" }}>
                  ⚠ Consistência sinalizada: {comAtencao.map((l) => l.nomeCand).join(", ")}
                </div>
              )}

              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={estiloCabecalho}></th>
                      {linhas.map((l) => (
                        <th key={l.nomeCand} style={estiloCabecalho}>{l.nomeCand}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ ...estiloCelula, fontWeight: 600 }}>Aderência geral</td>
                      {linhas.map((l) => {
                        const valor = l.resultado?.aderencias[0]?.aderenciaGeral;
                        const ehMaior = valor != null && maiorAderencia && l.nomeCand === maiorAderencia.nomeCand;
                        return (
                          <td key={l.nomeCand} style={{ ...estiloCelula, fontWeight: ehMaior ? 700 : 400, color: ehMaior ? "var(--green-700, #1D533B)" : undefined }}>
                            {valor ?? "—"}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td style={{ ...estiloCelula, fontWeight: 600 }}>Consistência</td>
                      {linhas.map((l) => (
                        <td key={l.nomeCand} style={{ ...estiloCelula, color: l.resultado && l.resultado.indicadorConsistencia !== "ADEQUADA" ? "var(--amber-700, #714E08)" : undefined }}>
                          {l.resultado ? (ROTULO_CONSISTENCIA[l.resultado.indicadorConsistencia]?.split(" (")[0] ?? l.resultado.indicadorConsistencia) : "—"}
                        </td>
                      ))}
                    </tr>
                    {FATORES_COMPORTAMENTAIS.map((f) => {
                      const valores = linhas.map((l) => l.resultado?.fatores.find((x) => x.fator.sigla === f.sigla)?.percentualNormalizado ?? null);
                      const maiorValor = Math.max(...valores.filter((v): v is number => v != null));
                      return (
                        <tr key={f.sigla}>
                          <td style={{ ...estiloCelula, fontWeight: 600 }}>{f.rotulo}</td>
                          {linhas.map((l, i) => {
                            const rf = l.resultado?.fatores.find((x) => x.fator.sigla === f.sigla);
                            const ehMaior = valores[i] != null && valores[i] === maiorValor;
                            return (
                              <td key={l.nomeCand} style={{ ...estiloCelula, fontWeight: ehMaior ? 700 : 400, color: ehMaior ? "var(--green-700, #1D533B)" : undefined }}>
                                {rf ? `${rf.percentualNormalizado}% · ${ROTULO_FAIXA[rf.faixaInterpretativa] ?? rf.faixaInterpretativa}` : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </Gaveta>

      <CandidatoDrawer codCdt={drawerCodCdt} fechar={() => setDrawerCodCdt(null)} aoAtualizar={carregar} />
    </main>
  );
}
