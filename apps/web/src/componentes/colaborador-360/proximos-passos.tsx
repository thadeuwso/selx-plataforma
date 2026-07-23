"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";

interface Acao {
  codProx: string;
  acao: string;
  prioridade: string;
  prazo: string | null;
  origem: string;
  justificativa: string | null;
  responsavel: { nomeUsu: string } | null;
}
interface Sugestao {
  acao: string;
  origem: string;
  prioridade: string;
  justificativa: string;
}

const PRIORIDADE: Record<string, { texto: string; cor: string }> = {
  ALTA: { texto: "Alta", cor: "var(--feedback-danger, #b91c1c)" },
  MEDIA: { texto: "Média", cor: "var(--amber-700, #714E08)" },
  BAIXA: { texto: "Baixa", cor: "var(--text-muted)" },
};
const ORIGEM: Record<string, string> = {
  MANUAL: "manual",
  ADERENCIA: "aderência",
  AVALIACAO: "avaliação",
  IA: "IA",
};

/**
 * Próximos passos do gestor (RN-GP-024). Ações abertas + sugestões que a
 * aderência levanta; uma recomendação **vira tarefa** com um clique. Nada é
 * decidido pelo sistema — cada ação se conclui ou se descarta.
 */
export function ProximosPassos({ codFun }: { codFun: string }) {
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState({ acao: "", prioridade: "MEDIA", prazo: "" });

  const carregar = useCallback(async () => {
    const r = await api<{ acoes: Acao[]; sugestoes: Sugestao[] }>(`/gestao-pessoas/colaboradores/${codFun}/proximos-passos`);
    if (r.status === 200 && r.json) {
      setAcoes(r.json.acoes);
      setSugestoes(r.json.sugestoes);
    }
    setCarregado(true);
  }, [codFun]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function adotar(s: Sugestao) {
    await api(`/gestao-pessoas/colaboradores/${codFun}/proximos-passos`, {
      metodo: "POST",
      corpo: { acao: s.acao, prioridade: s.prioridade, origem: s.origem, justificativa: s.justificativa },
    });
    await carregar();
  }

  async function mudar(codProx: string, status: string) {
    await api(`/gestao-pessoas/colaboradores/proximos-passos/${codProx}`, { metodo: "PATCH", corpo: { status } });
    await carregar();
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!form.acao.trim()) {
      setErro("Descreva a ação.");
      return;
    }
    const r = await api(`/gestao-pessoas/colaboradores/${codFun}/proximos-passos`, {
      metodo: "POST",
      corpo: { acao: form.acao, prioridade: form.prioridade, prazo: form.prazo || undefined },
    });
    if (r.status !== 201) {
      setErro("Não foi possível criar a ação.");
      return;
    }
    setAberto(false);
    setForm({ acao: "", prioridade: "MEDIA", prazo: "" });
    await carregar();
  }

  return (
    <div style={{ border: "1px solid var(--border-default)", borderRadius: 10, padding: 16, background: "var(--surface-default)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Próximos passos</h3>
        <button onClick={() => setAberto(true)} style={botaoSec}>Nova ação</button>
      </div>

      {!carregado ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Carregando…</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {acoes.map((a) => {
            const pr = PRIORIDADE[a.prioridade];
            return (
              <div key={a.codProx} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", border: "1px solid var(--border-default)", borderLeft: `3px solid ${pr?.cor}`, borderRadius: 8, padding: "10px 12px" }}>
                <div>
                  <div style={{ fontSize: 13 }}>{a.acao}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    <span style={{ color: pr?.cor, fontWeight: 600 }}>{pr?.texto}</span>
                    {` · ${ORIGEM[a.origem] ?? a.origem}`}
                    {a.prazo ? ` · até ${new Date(a.prazo).toLocaleDateString("pt-BR")}` : ""}
                    {a.responsavel ? ` · ${a.responsavel.nomeUsu}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => mudar(a.codProx, "CONCLUIDA")} style={botaoSec} title="Concluir">✓</button>
                  <button onClick={() => mudar(a.codProx, "DESCARTADA")} style={botaoSec} title="Descartar">✕</button>
                </div>
              </div>
            );
          })}

          {sugestoes.map((s, i) => (
            <div key={`s${i}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", border: "1px dashed var(--border-default)", borderRadius: 8, padding: "10px 12px" }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{s.acao}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>sugestão · {ORIGEM[s.origem] ?? s.origem}</div>
              </div>
              <button onClick={() => adotar(s)} style={botaoSec}>+ Adotar</button>
            </div>
          ))}

          {acoes.length === 0 && sugestoes.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nada pendente — tudo em dia.</p>
          )}
        </div>
      )}

      <Gaveta titulo="Nova ação" aberta={aberto} fechar={() => setAberto(false)}>
        <form onSubmit={criar} style={{ display: "grid", gap: 12 }}>
          <Campo rotulo="O que fazer">
            <Entrada value={form.acao} onChange={(e) => setForm({ ...form, acao: e.target.value })} placeholder="ex.: Agendar conversa de feedback" />
          </Campo>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Campo rotulo="Prioridade">
              <Selecao value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })}>
                {Object.entries(PRIORIDADE).map(([v, r]) => <option key={v} value={v}>{r.texto}</option>)}
              </Selecao>
            </Campo>
            <Campo rotulo="Prazo (opcional)">
              <Entrada type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
            </Campo>
          </div>
          <Erro mensagem={erro} />
          <BotaoPrimario type="submit">Criar ação</BotaoPrimario>
        </form>
      </Gaveta>
    </div>
  );
}

const botaoSec: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid var(--border-default)",
  background: "var(--surface-default)",
  color: "var(--text-body)",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};
