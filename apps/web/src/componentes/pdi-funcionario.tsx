"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";

interface Acao {
  codAcao: string;
  descricao: string;
  tipo: string;
  competencia: string | null;
  prazo: string | null;
  status: string;
  progresso: number;
  dhConclusao: string | null;
}
interface PlanoDetalhe {
  codPdi: string;
  titulo: string;
  objetivo: string | null;
  status: string;
  progresso: number;
  responsavel: { nomeUsu: string } | null;
  acoes: Acao[];
}
interface PlanoResumo {
  codPdi: string;
  titulo: string;
  status: string;
  progresso: number;
  totalAcoes: number;
  acoesConcluidas: number;
}

const ROTULO_TIPO: Record<string, string> = {
  TREINAMENTO: "Treinamento",
  LEITURA: "Leitura",
  PROJETO: "Projeto",
  MENTORIA: "Mentoria",
  CERTIFICACAO: "Certificação",
  OUTRO: "Outro",
};
const ROTULO_STATUS_ACAO: Record<string, { texto: string; cor: string }> = {
  PENDENTE: { texto: "Pendente", cor: "var(--text-muted)" },
  EM_ANDAMENTO: { texto: "Em andamento", cor: "var(--amber-700, #714E08)" },
  CONCLUIDA: { texto: "Concluída", cor: "var(--feedback-success, #15803d)" },
  CANCELADA: { texto: "Cancelada", cor: "var(--text-muted)" },
};

function BarraProgresso({ valor }: { valor: number }) {
  return (
    <div style={{ height: 6, background: "var(--border-default)", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${valor}%`, background: "var(--brand-700)" }} />
    </div>
  );
}

/**
 * Desenvolvimento do funcionário — o PDI (RN-GP-020).
 *
 * O plano nasce na admissão, mas nada impede criar depois. O progresso é
 * derivado das ações no backend; a tela só mostra e deixa avançar cada uma.
 */
export function PdiFuncionario({ codFun }: { codFun: string }) {
  const [planos, setPlanos] = useState<PlanoResumo[] | null>(null);
  const [aberto, setAberto] = useState<PlanoDetalhe | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);
  const [acaoAberta, setAcaoAberta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [formPlano, setFormPlano] = useState({ titulo: "", objetivo: "" });
  const [formAcao, setFormAcao] = useState({ descricao: "", tipo: "TREINAMENTO", competencia: "", prazo: "" });

  const carregar = useCallback(async () => {
    const r = await api<PlanoResumo[]>(`/gestao-pessoas/pdi?codFun=${codFun}`);
    if (r.status === 200 && r.json) setPlanos(r.json);
  }, [codFun]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const abrirPlano = useCallback(async (codPdi: string) => {
    const r = await api<PlanoDetalhe>(`/gestao-pessoas/pdi/${codPdi}`);
    if (r.status === 200 && r.json) setAberto(r.json);
  }, []);

  async function criarPlano(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!formPlano.titulo.trim()) {
      setErro("Dê um título ao plano.");
      return;
    }
    const r = await api<{ codPdi: string }>("/gestao-pessoas/pdi", {
      metodo: "POST",
      corpo: { codFun, titulo: formPlano.titulo, objetivo: formPlano.objetivo || undefined },
    });
    if (r.status !== 201 || !r.json) {
      setErro("Não foi possível criar o plano.");
      return;
    }
    setNovoAberto(false);
    setFormPlano({ titulo: "", objetivo: "" });
    await carregar();
    await abrirPlano(r.json.codPdi);
  }

  async function adicionarAcao(e: React.FormEvent) {
    e.preventDefault();
    if (!aberto || !formAcao.descricao.trim()) return;
    const r = await api(`/gestao-pessoas/pdi/${aberto.codPdi}/acoes`, {
      metodo: "POST",
      corpo: {
        descricao: formAcao.descricao,
        tipo: formAcao.tipo,
        competencia: formAcao.competencia || undefined,
        prazo: formAcao.prazo || undefined,
      },
    });
    if (r.status !== 201) return;
    setAcaoAberta(false);
    setFormAcao({ descricao: "", tipo: "TREINAMENTO", competencia: "", prazo: "" });
    await abrirPlano(aberto.codPdi);
    await carregar();
  }

  async function mudarAcao(codAcao: string, corpo: Record<string, unknown>) {
    if (!aberto) return;
    await api(`/gestao-pessoas/pdi/acoes/${codAcao}`, { metodo: "PATCH", corpo });
    await abrirPlano(aberto.codPdi);
    await carregar();
  }

  // Detalhe de um plano
  if (aberto) {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <button
          onClick={() => setAberto(null)}
          style={{ background: "none", border: "none", padding: 0, color: "var(--text-link)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, justifySelf: "start" }}
        >
          ← Todos os planos
        </button>

        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>{aberto.titulo}</h3>
          {aberto.objetivo && <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 8px" }}>{aberto.objetivo}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--text-muted)" }}>
            <span style={{ fontWeight: 600, fontSize: 18, color: "var(--text-body)" }}>{aberto.progresso}%</span>
            <div style={{ flex: 1 }}><BarraProgresso valor={aberto.progresso} /></div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {aberto.acoes.map((a) => (
            <div key={a.codAcao} style={{ border: "1px solid var(--border-default)", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{a.descricao}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {ROTULO_TIPO[a.tipo] ?? a.tipo}
                    {a.competencia ? ` · ${a.competencia}` : ""}
                    {a.prazo ? ` · até ${new Date(a.prazo).toLocaleDateString("pt-BR")}` : ""}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: ROTULO_STATUS_ACAO[a.status]?.cor, flexShrink: 0 }}>
                  {ROTULO_STATUS_ACAO[a.status]?.texto ?? a.status}
                </span>
              </div>
              {a.status !== "CANCELADA" && (
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {a.status !== "CONCLUIDA" ? (
                    <>
                      <Selecao
                        value={String(a.progresso)}
                        onChange={(e) => mudarAcao(a.codAcao, { progresso: Number(e.target.value), status: Number(e.target.value) > 0 ? "EM_ANDAMENTO" : "PENDENTE" })}
                        style={{ fontSize: 12, padding: "4px 8px" }}
                      >
                        {[0, 25, 50, 75].map((n) => <option key={n} value={n}>{n}%</option>)}
                      </Selecao>
                      <button onClick={() => mudarAcao(a.codAcao, { status: "CONCLUIDA" })} style={botaoAcao}>Concluir</button>
                      <button onClick={() => mudarAcao(a.codAcao, { status: "CANCELADA" })} style={botaoAcao}>Cancelar</button>
                    </>
                  ) : (
                    <button onClick={() => mudarAcao(a.codAcao, { status: "EM_ANDAMENTO" })} style={botaoAcao}>Reabrir</button>
                  )}
                </div>
              )}
            </div>
          ))}
          {aberto.acoes.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhuma ação neste plano ainda.</p>
          )}
        </div>

        <BotaoPrimario onClick={() => setAcaoAberta(true)} style={{ justifySelf: "start" }}>Adicionar ação</BotaoPrimario>

        <Gaveta titulo="Nova ação de desenvolvimento" aberta={acaoAberta} fechar={() => setAcaoAberta(false)}>
          <form onSubmit={adicionarAcao} style={{ display: "grid", gap: 12 }}>
            <Campo rotulo="O que fazer">
              <Entrada value={formAcao.descricao} onChange={(e) => setFormAcao({ ...formAcao, descricao: e.target.value })} />
            </Campo>
            <Campo rotulo="Tipo">
              <Selecao value={formAcao.tipo} onChange={(e) => setFormAcao({ ...formAcao, tipo: e.target.value })}>
                {Object.entries(ROTULO_TIPO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </Selecao>
            </Campo>
            <Campo rotulo="Competência a desenvolver (opcional)">
              <Entrada value={formAcao.competencia} onChange={(e) => setFormAcao({ ...formAcao, competencia: e.target.value })} />
            </Campo>
            <Campo rotulo="Prazo (opcional)">
              <Entrada type="date" value={formAcao.prazo} onChange={(e) => setFormAcao({ ...formAcao, prazo: e.target.value })} />
            </Campo>
            <BotaoPrimario type="submit">Adicionar</BotaoPrimario>
          </form>
        </Gaveta>
      </div>
    );
  }

  // Lista de planos
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          Planos de desenvolvimento deste funcionário. O primeiro deveria nascer na entrada.
        </p>
        <BotaoPrimario onClick={() => setNovoAberto(true)} style={{ flexShrink: 0 }}>Novo plano</BotaoPrimario>
      </div>

      {planos === null ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>
      ) : planos.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Nenhum plano ainda. Crie o primeiro para começar o acompanhamento.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {planos.map((p) => (
            <button
              key={p.codPdi}
              onClick={() => abrirPlano(p.codPdi)}
              style={{ textAlign: "left", border: "1px solid var(--border-default)", borderRadius: 10, padding: 14, background: "var(--surface-default)", cursor: "pointer", fontFamily: "inherit" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{p.titulo}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.progresso}%</span>
              </div>
              <BarraProgresso valor={p.progresso} />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                {p.acoesConcluidas} de {p.totalAcoes} ação(ões) concluída(s)
              </div>
            </button>
          ))}
        </div>
      )}

      <Erro mensagem={erro} />
      <Gaveta titulo="Novo plano de desenvolvimento" aberta={novoAberto} fechar={() => setNovoAberto(false)}>
        <form onSubmit={criarPlano} style={{ display: "grid", gap: 12 }}>
          <Campo rotulo="Título">
            <Entrada placeholder="ex.: Integração e primeiros 90 dias" value={formPlano.titulo} onChange={(e) => setFormPlano({ ...formPlano, titulo: e.target.value })} />
          </Campo>
          <Campo rotulo="Objetivo (opcional)">
            <Entrada value={formPlano.objetivo} onChange={(e) => setFormPlano({ ...formPlano, objetivo: e.target.value })} />
          </Campo>
          <Erro mensagem={erro} />
          <BotaoPrimario type="submit">Criar plano</BotaoPrimario>
        </form>
      </Gaveta>
    </div>
  );
}

const botaoAcao: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid var(--border-default)",
  background: "var(--surface-default)",
  color: "var(--text-body)",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};
