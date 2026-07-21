"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Selecao, Abas } from "@/componentes/formulario";
import { PerfilComportamentalForm, estadoInicialFatores, type PerfilFormState } from "@/componentes/perfil-comportamental-form";

const DIMENSOES_CULTURA = [
  { chave: "autonomy", rotulo: "Autonomia" },
  { chave: "pace", rotulo: "Ritmo" },
  { chave: "collaboration", rotulo: "Colaboração" },
  { chave: "structure", rotulo: "Estrutura" },
  { chave: "dataDriven", rotulo: "Orientação a dados" },
  { chave: "directCommunication", rotulo: "Comunicação direta" },
] as const;

interface Requisito {
  codVagReq?: string;
  descrReq: string;
  tipoReq: "OBRIGATORIO" | "DESEJAVEL";
  knockout: boolean;
  peso: string;
  nivelEsperado: string;
  tempoEspMeses: string;
  evidenciaExigida: boolean;
}
interface Pergunta {
  codVagPer?: string;
  pergunta: string;
  respElimina: "" | "Sim" | "Não";
}
interface Vaga {
  codVag: string;
  titulo: string;
  perfilCulturalIdealJson: Record<string, number> | null;
  requisitos: { codVagReq: string; descrReq: string; tipoReq: string; knockout: string; peso: number; nivelEsperado: number | null; tempoEspMeses: number | null; evidenciaExigida: string }[];
  perguntas: { codVagPer: string; pergunta: string; respElimina: string | null }[];
  _count: { candidaturas: number };
}
interface PerfilComportamentalVaga {
  fatores: { fator: { sigla: string }; minimo: number; maximo: number; eliminatorio: string }[];
  herdadoDoPadrao: boolean;
}

export default function ConfiguracoesVaga() {
  const { codVag } = useParams<{ codVag: string }>();
  const [tab, setTab] = useState("requisitos");
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [requisitos, setRequisitos] = useState<Requisito[]>([]);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [perfilCultural, setPerfilCultural] = useState<Record<string, string>>({});
  const [perfilComportamental, setPerfilComportamental] = useState<PerfilComportamentalVaga | null>(null);
  const [salvandoRequisitos, setSalvandoRequisitos] = useState(false);
  const [salvandoPerguntas, setSalvandoPerguntas] = useState(false);
  const [salvandoCultural, setSalvandoCultural] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const [v, p] = await Promise.all([
      api<Vaga>(`/vagas/${codVag}`),
      api<PerfilComportamentalVaga | null>(`/vagas/${codVag}/perfil-comportamental`),
    ]);
    if (v.status === 200 && v.json) {
      setVaga(v.json);
      setRequisitos(
        v.json.requisitos.map((r) => ({
          codVagReq: r.codVagReq,
          descrReq: r.descrReq,
          tipoReq: r.tipoReq as "OBRIGATORIO" | "DESEJAVEL",
          knockout: r.knockout === "S",
          peso: String(r.peso),
          nivelEsperado: r.nivelEsperado != null ? String(r.nivelEsperado) : "",
          tempoEspMeses: r.tempoEspMeses != null ? String(r.tempoEspMeses) : "",
          evidenciaExigida: r.evidenciaExigida === "S",
        })),
      );
      setPerguntas(
        v.json.perguntas.map((p) => ({
          codVagPer: p.codVagPer,
          pergunta: p.pergunta,
          respElimina: (p.respElimina as "" | "Sim" | "Não") ?? "",
        })),
      );
      setPerfilCultural(
        Object.fromEntries(Object.entries(v.json.perfilCulturalIdealJson ?? {}).map(([k, val]) => [k, String(val)])),
      );
    }
    if (p.status === 200) setPerfilComportamental(p.json);
  }, [codVag]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const temCandidatura = (vaga?._count.candidaturas ?? 0) > 0;

  function adicionarRequisito() {
    setRequisitos((r) => [
      ...r,
      { descrReq: "", tipoReq: "OBRIGATORIO", knockout: false, peso: "5", nivelEsperado: "", tempoEspMeses: "", evidenciaExigida: false },
    ]);
  }
  function removerRequisito(i: number) {
    setRequisitos((r) => r.filter((_, idx) => idx !== i));
  }
  function atualizarRequisito(i: number, patch: Partial<Requisito>) {
    setRequisitos((r) => r.map((req, idx) => (idx === i ? { ...req, ...patch } : req)));
  }

  function adicionarPergunta() {
    setPerguntas((p) => [...p, { pergunta: "", respElimina: "" }]);
  }
  function removerPergunta(i: number) {
    setPerguntas((p) => p.filter((_, idx) => idx !== i));
  }
  function atualizarPergunta(i: number, patch: Partial<Pergunta>) {
    setPerguntas((p) => p.map((per, idx) => (idx === i ? { ...per, ...patch } : per)));
  }

  async function salvarRequisitos(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoRequisitos(true);
    const r = await api<{ avisos: string[] }>(`/vagas/${codVag}/configuracoes`, {
      metodo: "PATCH",
      corpo: {
        requisitos: requisitos.filter((r) => r.descrReq.trim()).map((r) => ({
          codVagReq: r.codVagReq,
          descrReq: r.descrReq,
          tipoReq: r.tipoReq,
          knockout: r.knockout ? "S" : "N",
          peso: r.peso ? Number(r.peso) : undefined,
          nivelEsperado: r.nivelEsperado ? Number(r.nivelEsperado) : undefined,
          tempoEspMeses: r.tempoEspMeses ? Number(r.tempoEspMeses) : undefined,
          evidenciaExigida: r.evidenciaExigida ? "S" : "N",
        })),
      },
    });
    setSalvandoRequisitos(false);
    if (r.status !== 200) {
      alert("Não foi possível salvar os requisitos.");
      return;
    }
    setAviso(r.json?.avisos?.[0] ?? null);
    if (r.json?.avisos?.[0]) setTimeout(() => setAviso(null), 6000);
    await carregar();
  }

  async function salvarPerguntas(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoPerguntas(true);
    const r = await api<{ avisos: string[] }>(`/vagas/${codVag}/configuracoes`, {
      metodo: "PATCH",
      corpo: {
        perguntas: perguntas.filter((p) => p.pergunta.trim()).map((p) => ({
          codVagPer: p.codVagPer,
          pergunta: p.pergunta,
          respElimina: p.respElimina || undefined,
        })),
      },
    });
    setSalvandoPerguntas(false);
    if (r.status !== 200) {
      alert("Não foi possível salvar as perguntas.");
      return;
    }
    setAviso(r.json?.avisos?.[0] ?? null);
    if (r.json?.avisos?.[0]) setTimeout(() => setAviso(null), 6000);
    await carregar();
  }

  async function salvarPerfilCultural(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoCultural(true);
    const r = await api(`/vagas/${codVag}/configuracoes`, {
      metodo: "PATCH",
      corpo: {
        perfilCulturalIdeal: Object.fromEntries(
          Object.entries(perfilCultural).filter(([, v]) => v.trim()).map(([k, v]) => [k, Number(v)]),
        ),
      },
    });
    setSalvandoCultural(false);
    if (r.status !== 200) {
      alert("Não foi possível salvar o perfil cultural.");
      return;
    }
    await carregar();
  }

  async function salvarPerfilComportamental(fatores: { sigla: string; minimo: number; maximo: number; eliminatorio: "S" | "N" }[]) {
    const r = await api(`/vagas/${codVag}/perfil-comportamental`, { metodo: "POST", corpo: { fatores } });
    if (r.status !== 201) {
      alert("Não foi possível salvar o perfil comportamental.");
      return;
    }
    await carregar();
  }

  if (!vaga) return null;

  return (
    <main style={{ padding: 32, maxWidth: 640 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Configurações — {vaga.titulo}</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          {temCandidatura
            ? "Esta vaga já tem candidatura(s) — requisitos e perguntas existentes só podem ser editados, nunca removidos."
            : "Ainda sem candidaturas — edição livre."}
        </p>
      </header>

      {aviso && (
        <div style={{ marginBottom: 16, padding: "8px 14px", borderRadius: 8, background: "var(--amber-100, #F2E3C4)", color: "var(--amber-700, #714E08)", fontSize: 13 }}>
          {aviso}
        </div>
      )}

      <Abas
        ativa={tab}
        aoMudar={setTab}
        abas={[
          { id: "requisitos", rotulo: "Requisitos" },
          { id: "perguntas", rotulo: "Perguntas de triagem" },
          { id: "cultural", rotulo: "Perfil Cultural" },
          { id: "comportamental", rotulo: "Comportamental" },
        ]}
      />

      <div style={{ marginTop: 20 }}>
        {tab === "requisitos" && (
          <form onSubmit={salvarRequisitos} style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Requisitos</span>
              <button
                type="button"
                onClick={adicionarRequisito}
                style={{ border: "none", background: "none", color: "var(--action-primary, var(--brand-700))", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                + adicionar
              </button>
            </div>
            {requisitos.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Nenhum requisito ainda.</p>}
            <div style={{ display: "grid", gap: 8 }}>
              {requisitos.map((r, i) => {
                const travado = !!r.codVagReq && temCandidatura;
                return (
                  <div key={i} style={{ display: "grid", gap: 6, padding: 8, border: "1px solid var(--border-default)", borderRadius: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 8, alignItems: "center" }}>
                      <Entrada value={r.descrReq} placeholder="Descrição do requisito" onChange={(e) => atualizarRequisito(i, { descrReq: e.target.value })} style={{ fontSize: 13 }} />
                      <Selecao value={r.tipoReq} onChange={(e) => atualizarRequisito(i, { tipoReq: e.target.value as Requisito["tipoReq"] })} style={{ fontSize: 12, padding: "6px 8px" }}>
                        <option value="OBRIGATORIO">Obrigatório</option>
                        <option value="DESEJAVEL">Desejável</option>
                      </Selecao>
                      <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                        <input type="checkbox" checked={r.knockout} onChange={(e) => atualizarRequisito(i, { knockout: e.target.checked })} />
                        Eliminatório
                      </label>
                      <button
                        type="button"
                        onClick={() => removerRequisito(i)}
                        disabled={travado}
                        title={travado ? "Vaga já tem candidatura — não é possível remover" : "Remover"}
                        aria-label="Remover requisito"
                        style={{ border: "none", background: "none", color: travado ? "var(--text-muted)" : "var(--red-600, #9A3833)", cursor: travado ? "not-allowed" : "pointer", fontSize: 16 }}
                      >
                        ×
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "center" }}>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", display: "grid", gap: 2 }}>
                        Peso (0-10)
                        <Entrada type="number" min={0} max={10} value={r.peso} onChange={(e) => atualizarRequisito(i, { peso: e.target.value })} style={{ fontSize: 12, padding: "4px 6px" }} />
                      </label>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", display: "grid", gap: 2 }}>
                        Nível esperado (0-4)
                        <Entrada type="number" min={0} max={4} value={r.nivelEsperado} onChange={(e) => atualizarRequisito(i, { nivelEsperado: e.target.value })} style={{ fontSize: 12, padding: "4px 6px" }} />
                      </label>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", display: "grid", gap: 2 }}>
                        Tempo esperado (meses)
                        <Entrada type="number" min={0} value={r.tempoEspMeses} onChange={(e) => atualizarRequisito(i, { tempoEspMeses: e.target.value })} style={{ fontSize: 12, padding: "4px 6px" }} />
                      </label>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                        <input type="checkbox" checked={r.evidenciaExigida} onChange={(e) => atualizarRequisito(i, { evidenciaExigida: e.target.checked })} />
                        Pedir evidência
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
            <BotaoPrimario type="submit" disabled={salvandoRequisitos}>
              {salvandoRequisitos ? "Salvando..." : "Salvar requisitos"}
            </BotaoPrimario>
          </form>
        )}

        {tab === "perguntas" && (
          <form onSubmit={salvarPerguntas} style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Perguntas de triagem</span>
              <button
                type="button"
                onClick={adicionarPergunta}
                style={{ border: "none", background: "none", color: "var(--action-primary, var(--brand-700))", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                + adicionar
              </button>
            </div>
            {perguntas.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Nenhuma pergunta ainda.</p>}
            <div style={{ display: "grid", gap: 8 }}>
              {perguntas.map((p, i) => {
                const travado = !!p.codVagPer && temCandidatura;
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center", padding: 8, border: "1px solid var(--border-default)", borderRadius: 8 }}>
                    <Entrada value={p.pergunta} placeholder="Pergunta (resposta sim/não)" onChange={(e) => atualizarPergunta(i, { pergunta: e.target.value })} style={{ fontSize: 13 }} />
                    <Selecao value={p.respElimina} onChange={(e) => atualizarPergunta(i, { respElimina: e.target.value as Pergunta["respElimina"] })} style={{ fontSize: 12, padding: "6px 8px" }}>
                      <option value="">Não elimina</option>
                      <option value="Sim">Elimina se &quot;Sim&quot;</option>
                      <option value="Não">Elimina se &quot;Não&quot;</option>
                    </Selecao>
                    <button
                      type="button"
                      onClick={() => removerPergunta(i)}
                      disabled={travado}
                      title={travado ? "Vaga já tem candidatura — não é possível remover" : "Remover"}
                      aria-label="Remover pergunta"
                      style={{ border: "none", background: "none", color: travado ? "var(--text-muted)" : "var(--red-600, #9A3833)", cursor: travado ? "not-allowed" : "pointer", fontSize: 16 }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
            <BotaoPrimario type="submit" disabled={salvandoPerguntas}>
              {salvandoPerguntas ? "Salvando..." : "Salvar perguntas"}
            </BotaoPrimario>
          </form>
        )}

        {tab === "cultural" && (
          <form onSubmit={salvarPerfilCultural} style={{ display: "grid", gap: 14 }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Escala 1-5 por dimensão. Opcional — alimenta o fit cultural do match determinístico (RN-REC-006).
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
            <BotaoPrimario type="submit" disabled={salvandoCultural}>
              {salvandoCultural ? "Salvando..." : "Salvar perfil cultural"}
            </BotaoPrimario>
          </form>
        )}

        {tab === "comportamental" && (
          <div style={{ display: "grid", gap: 14 }}>
            {perfilComportamental?.herdadoDoPadrao && (
              <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--brand-100)", color: "var(--brand-800)", fontSize: 12 }}>
                Esta vaga ainda não tem perfil próprio — está usando o{" "}
                <a href="/app/recrutamento/comportamental-padrao" style={{ color: "inherit", fontWeight: 600 }}>
                  padrão da empresa
                </a>
                . Salvar aqui cria uma configuração específica só para esta vaga.
              </div>
            )}
            <PerfilComportamentalForm
              valorInicial={perfilComportamental ? estadoInicialFatores(perfilComportamental.fatores) : {}}
              aoSalvar={salvarPerfilComportamental}
            />
          </div>
        )}
      </div>
    </main>
  );
}
