"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Abas, BotaoPrimario, Campo, Entrada, Erro, Gaveta } from "@/componentes/formulario";

/**
 * Banco de perguntas comportamentais e montagem de questionário.
 *
 * O banco é global (metodologia própria, RN-GP-001) — aqui é leitura. O que o
 * recrutador controla é o MODELO: quais perguntas entram no questionário que
 * o candidato responde. Modelos são versionados e nunca editados no lugar,
 * porque resultados já calculados guardam a versão que responderam.
 */

interface Pergunta {
  codPer: string;
  texto: string;
  tipo: "DIRETA" | "REVERSA";
  categoria: string | null;
  peso: string;
}
interface FatorComPerguntas {
  codFat: string;
  sigla: string;
  nome: string;
  descricao: string | null;
  perguntas: Pergunta[];
}
interface Modelo {
  codMod: string;
  nome: string;
  versao: number;
  status: string;
  tempoEstimadoMin: number | null;
  tempoEstimadoMax: number | null;
  dhPublicacao: string | null;
  _count: { perguntas: number };
}

const celula: React.CSSProperties = { padding: "10px 14px" };

export default function PaginaBancoPerguntas() {
  const [aba, setAba] = useState("banco");
  const [fatores, setFatores] = useState<FatorComPerguntas[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [gaveta, setGaveta] = useState(false);
  const [nomeModelo, setNomeModelo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const [p, m] = await Promise.all([
      api<FatorComPerguntas[]>("/gestao-pessoas/perguntas"),
      api<Modelo[]>("/gestao-pessoas/modelos"),
    ]);
    if (p.status === 200 && p.json) setFatores(p.json);
    if (m.status === 200 && m.json) setModelos(m.json);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function alternar(codPer: string) {
    setSelecionadas((s) => {
      const nova = new Set(s);
      if (nova.has(codPer)) nova.delete(codPer);
      else nova.add(codPer);
      return nova;
    });
  }

  function alternarFator(f: FatorComPerguntas) {
    const todosMarcados = f.perguntas.every((p) => selecionadas.has(p.codPer));
    setSelecionadas((s) => {
      const nova = new Set(s);
      for (const p of f.perguntas) {
        if (todosMarcados) nova.delete(p.codPer);
        else nova.add(p.codPer);
      }
      return nova;
    });
  }

  // Um fator sem pergunta não pontua — o backend recusa, então avisamos antes.
  const fatoresSemCobertura = fatores
    .filter((f) => f.perguntas.length > 0 && !f.perguntas.some((p) => selecionadas.has(p.codPer)))
    .map((f) => f.sigla);
  const podeCriar = selecionadas.size >= 4 && fatoresSemCobertura.length === 0;

  async function criarModelo(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const r = await api("/gestao-pessoas/modelos", {
      metodo: "POST",
      corpo: { nome: nomeModelo, codPerguntas: Array.from(selecionadas) },
    });
    setSalvando(false);
    if (r.status !== 201) {
      setErro("Não foi possível criar o questionário.");
      return;
    }
    setGaveta(false);
    setNomeModelo("");
    setSelecionadas(new Set());
    setAba("modelos");
    await carregar();
  }

  const totalPerguntas = fatores.reduce((s, f) => s + f.perguntas.length, 0);

  return (
    <main style={{ padding: 32 }}>
      <header style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Banco de perguntas</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4, maxWidth: 700 }}>
          As {totalPerguntas} afirmações da metodologia própria (Direcionamento, Conexão, Sustentação e Precisão).
          O banco em si não é editável — o que você monta aqui é o <strong>questionário</strong>: quais dessas
          perguntas o candidato vai responder.
        </p>
        <div style={{ marginTop: 16 }}>
          <Abas
            ativa={aba}
            aoMudar={setAba}
            abas={[
              { id: "banco", rotulo: `Perguntas (${totalPerguntas})` },
              { id: "modelos", rotulo: `Questionários (${modelos.length})` },
            ]}
          />
        </div>
      </header>

      {aba === "banco" && (
        <section style={{ marginTop: 20 }}>
          <div
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
              marginBottom: 16, flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {selecionadas.size === 0
                ? "Marque as perguntas para montar um questionário novo."
                : `${selecionadas.size} pergunta(s) selecionada(s)`}
              {fatoresSemCobertura.length > 0 && selecionadas.size > 0 && (
                <span style={{ color: "var(--amber-700, #714E08)" }}>
                  {" "}· falta cobrir: {fatoresSemCobertura.join(", ")}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {selecionadas.size > 0 && (
                <button
                  onClick={() => setSelecionadas(new Set())}
                  style={{ border: "none", background: "none", color: "var(--text-link)", cursor: "pointer", font: "inherit", fontSize: 13 }}
                >
                  Limpar
                </button>
              )}
              <BotaoPrimario onClick={() => setGaveta(true)} disabled={!podeCriar}>
                Criar questionário
              </BotaoPrimario>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {fatores.map((f) => {
              const marcadas = f.perguntas.filter((p) => selecionadas.has(p.codPer)).length;
              return (
                <div key={f.codFat} style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
                  <div
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                      padding: "12px 14px", background: "var(--surface-page)", borderBottom: "1px solid var(--border-default)",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 14 }}>{f.nome}</strong>
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}> · {f.sigla} · {f.perguntas.length} perguntas</span>
                      {marcadas > 0 && (
                        <span style={{ color: "var(--green-700, #1D533B)", fontSize: 12, fontWeight: 600 }}> · {marcadas} escolhida(s)</span>
                      )}
                    </div>
                    <button
                      onClick={() => alternarFator(f)}
                      style={{ border: "none", background: "none", color: "var(--text-link)", cursor: "pointer", font: "inherit", fontSize: 13 }}
                    >
                      {f.perguntas.every((p) => selecionadas.has(p.codPer)) ? "Desmarcar todas" : "Marcar todas"}
                    </button>
                  </div>
                  <div>
                    {f.perguntas.map((p) => (
                      <label
                        key={p.codPer}
                        style={{
                          display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 14px",
                          borderTop: "1px solid var(--border-default)", fontSize: 13, cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selecionadas.has(p.codPer)}
                          onChange={() => alternar(p.codPer)}
                          style={{ marginTop: 3 }}
                        />
                        <span style={{ flex: 1 }}>
                          {p.texto}
                          <span style={{ color: "var(--text-muted)", fontSize: 11, display: "block", marginTop: 2 }}>
                            {p.tipo === "REVERSA" ? "Reversa (pontuação invertida)" : "Direta"}
                            {p.categoria && ` · ${p.categoria}`}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {aba === "modelos" && (
        <section style={{ marginTop: 20 }}>
          <div style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "var(--surface-page)", textAlign: "left" }}>
                  <th style={{ ...celula, fontWeight: 600 }}>Questionário</th>
                  <th style={{ ...celula, fontWeight: 600 }}>Versão</th>
                  <th style={{ ...celula, fontWeight: 600 }}>Perguntas</th>
                  <th style={{ ...celula, fontWeight: 600 }}>Duração estimada</th>
                  <th style={{ ...celula, fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {modelos.map((m, i) => {
                  const ehPadrao = m.status === "PUBLICADO" && !modelos.slice(0, i).some((o) => o.status === "PUBLICADO");
                  return (
                    <tr key={m.codMod} style={{ borderTop: "1px solid var(--border-default)" }}>
                      <td style={celula}>
                        {m.nome}
                        {ehPadrao && (
                          <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "var(--green-100, #D6E9DF)", color: "var(--green-700, #1D533B)" }}>
                            usado nos convites
                          </span>
                        )}
                      </td>
                      <td style={{ ...celula, fontFamily: "var(--font-mono)", fontSize: 12 }}>v{m.versao}</td>
                      <td style={{ ...celula, fontVariantNumeric: "tabular-nums" }}>{m._count.perguntas}</td>
                      <td style={{ ...celula, color: "var(--text-muted)" }}>
                        {m.tempoEstimadoMin != null ? `${m.tempoEstimadoMin}–${m.tempoEstimadoMax} min` : "—"}
                      </td>
                      <td style={celula}>{m.status}</td>
                    </tr>
                  );
                })}
                {modelos.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, color: "var(--text-muted)", textAlign: "center" }}>
                      Nenhum questionário ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12, maxWidth: 700 }}>
            Questionários não são editados depois de criados — cada novo vira uma versão nova, e o publicado mais
            recente passa a ser usado nos próximos convites. Resultados já calculados continuam ligados à versão que
            o candidato de fato respondeu.
          </p>
        </section>
      )}

      <Gaveta titulo="Criar questionário" aberta={gaveta} fechar={() => setGaveta(false)}>
        <form onSubmit={criarModelo} style={{ display: "grid", gap: 14 }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            {selecionadas.size} pergunta(s) selecionada(s). Ele vira o questionário padrão dos próximos convites.
          </p>
          <Campo rotulo="Nome do questionário">
            <Entrada
              required
              value={nomeModelo}
              onChange={(e) => setNomeModelo(e.target.value)}
              placeholder="Ex.: Avaliação Comportamental — Comercial"
            />
          </Campo>
          <Erro mensagem={erro} />
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Criando..." : "Criar e publicar"}
          </BotaoPrimario>
        </form>
      </Gaveta>
    </main>
  );
}
