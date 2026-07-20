"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";

interface Candidato {
  codCand: string;
  nomeCand: string;
  email: string;
  fone: string | null;
  cidade: string | null;
  dhInc: string;
  _count: { candidaturas: number };
}
interface Canal {
  codCanal: string;
  nomeCanal: string;
  tipoCanal: string;
  vlrCustoMes: string | null;
}

const celula: React.CSSProperties = { padding: "10px 14px" };

function Aba({ ativa, aoClicar, children }: { ativa: boolean; aoClicar: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={aoClicar}
      style={{
        padding: "10px 18px",
        border: "none",
        borderBottom: ativa ? "2px solid var(--action-primary, var(--brand-700))" : "2px solid transparent",
        background: "none",
        font: "inherit",
        fontWeight: ativa ? 600 : 400,
        color: ativa ? "var(--text-body)" : "var(--text-muted)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function PaginaCandidatos() {
  const [aba, setAba] = useState<"candidatos" | "canais">("candidatos");
  const [lista, setLista] = useState<Candidato[]>([]);
  const [canais, setCanais] = useState<Canal[]>([]);
  const [aberta, setAberta] = useState(false);
  const [abertaCanal, setAbertaCanal] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [deduplicado, setDeduplicado] = useState(false);
  const [form, setForm] = useState({ nomeCand: "", email: "", fone: "", cgc: "", cidade: "" });
  const [formCanal, setFormCanal] = useState({ nomeCanal: "", tipoCanal: "manual", vlrCustoMes: "" });

  const carregar = useCallback(async () => {
    const [r, c] = await Promise.all([api<Candidato[]>("/candidatos"), api<Canal[]>("/canais")]);
    if (r.status === 200 && r.json) setLista(r.json);
    if (c.status === 200 && c.json) setCanais(c.json);
  }, []);

  async function salvarCanal(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const r = await api("/canais", {
      metodo: "POST",
      corpo: {
        nomeCanal: formCanal.nomeCanal,
        tipoCanal: formCanal.tipoCanal,
        vlrCustoMes: formCanal.vlrCustoMes ? Number(formCanal.vlrCustoMes) : undefined,
      },
    });
    setSalvando(false);
    if (r.status !== 201) {
      setErro("Não foi possível criar o canal (nome já existe no grupo?).");
      return;
    }
    setAbertaCanal(false);
    setFormCanal({ nomeCanal: "", tipoCanal: "manual", vlrCustoMes: "" });
    await carregar();
  }

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setDeduplicado(false);
    setSalvando(true);
    const r = await api<{ codCand: string; deduplicado: boolean }>("/candidatos", {
      metodo: "POST",
      corpo: {
        nomeCand: form.nomeCand,
        email: form.email,
        fone: form.fone || undefined,
        cgc: form.cgc || undefined,
        cidade: form.cidade || undefined,
      },
    });
    setSalvando(false);
    if (r.status !== 201) {
      setErro(r.status === 403 ? "Sem permissão (recrutamento.candidatos.criar)." : "Não foi possível cadastrar.");
      return;
    }
    if (r.json?.deduplicado) {
      setDeduplicado(true);
      setTimeout(() => setDeduplicado(false), 4000);
    }
    setAberta(false);
    setForm({ nomeCand: "", email: "", fone: "", cgc: "", cidade: "" });
    await carregar();
  }

  return (
    <main style={{ padding: 32 }}>
      <header style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Recrutamento</h1>
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border-default)", marginTop: 16 }}>
          <Aba ativa={aba === "candidatos"} aoClicar={() => setAba("candidatos")}>
            Banco de talentos ({lista.length})
          </Aba>
          <Aba ativa={aba === "canais"} aoClicar={() => setAba("canais")}>
            Canais de captação ({canais.length})
          </Aba>
        </div>
      </header>

      {aba === "candidatos" && (
      <section style={{ marginTop: 20 }}>
      <header style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
          Único por e-mail/CPF no grupo, mesmo vindo de canais diferentes.
        </p>
        <BotaoPrimario onClick={() => setAberta(true)}>Cadastrar candidato</BotaoPrimario>
      </header>

      {deduplicado && (
        <div
          style={{
            marginBottom: 16,
            padding: "8px 14px",
            borderRadius: 8,
            background: "var(--amber-100, #F2E3C4)",
            color: "var(--amber-700, #714E08)",
            fontSize: 13,
          }}
        >
          Já existia um candidato com esse e-mail/CPF — os dados foram atualizados no mesmo registro (sem duplicar).
        </div>
      )}

      <div style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "var(--surface-page)", textAlign: "left" }}>
              <th style={{ ...celula, fontWeight: 600 }}>Nome</th>
              <th style={{ ...celula, fontWeight: 600 }}>E-mail</th>
              <th style={{ ...celula, fontWeight: 600 }}>Telefone</th>
              <th style={{ ...celula, fontWeight: 600 }}>Cidade</th>
              <th style={{ ...celula, fontWeight: 600 }}>Candidaturas</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.codCand} style={{ borderTop: "1px solid var(--border-default)" }}>
                <td style={celula}>{c.nomeCand}</td>
                <td style={{ ...celula, color: "var(--text-muted)" }}>{c.email}</td>
                <td style={{ ...celula, fontFamily: "var(--font-mono)" }}>{c.fone ?? "—"}</td>
                <td style={celula}>{c.cidade ?? "—"}</td>
                <td style={{ ...celula, fontFamily: "var(--font-mono)" }}>{c._count?.candidaturas ?? 0}</td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 24, color: "var(--text-muted)", textAlign: "center" }}>
                  Nenhum candidato ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </section>
      )}

      {aba === "canais" && (
      <section style={{ marginTop: 20 }}>
        <header style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
            De onde os candidatos chegam — vagas.com, Catho, indicação, importação...
          </p>
          <BotaoPrimario onClick={() => setAbertaCanal(true)}>Novo canal</BotaoPrimario>
        </header>
        <div style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--surface-page)", textAlign: "left" }}>
                <th style={{ ...celula, fontWeight: 600 }}>Nome</th>
                <th style={{ ...celula, fontWeight: 600 }}>Tipo</th>
                <th style={{ ...celula, fontWeight: 600 }}>Custo mensal</th>
              </tr>
            </thead>
            <tbody>
              {canais.map((c) => (
                <tr key={c.codCanal} style={{ borderTop: "1px solid var(--border-default)" }}>
                  <td style={celula}>{c.nomeCanal}</td>
                  <td style={{ ...celula, color: "var(--text-muted)" }}>{c.tipoCanal}</td>
                  <td style={{ ...celula, fontFamily: "var(--font-mono)" }}>
                    {c.vlrCustoMes ? `R$ ${Number(c.vlrCustoMes).toFixed(2)}` : "—"}
                  </td>
                </tr>
              ))}
              {canais.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 20, color: "var(--text-muted)", textAlign: "center" }}>
                    Nenhum canal ainda — crie ao menos um (ex.: &quot;Manual&quot;) para registrar candidaturas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      <Gaveta titulo="Cadastrar candidato" aberta={aberta} fechar={() => setAberta(false)}>
        <form onSubmit={salvar} style={{ display: "grid", gap: 14 }}>
          <Campo rotulo="Nome completo">
            <Entrada required value={form.nomeCand} onChange={(e) => setForm({ ...form, nomeCand: e.target.value })} />
          </Campo>
          <Campo rotulo="E-mail">
            <Entrada required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Campo>
          <Campo rotulo="Telefone (opcional)">
            <Entrada value={form.fone} onChange={(e) => setForm({ ...form, fone: e.target.value })} />
          </Campo>
          <Campo rotulo="CPF (opcional)">
            <Entrada value={form.cgc} onChange={(e) => setForm({ ...form, cgc: e.target.value })} />
          </Campo>
          <Campo rotulo="Cidade (opcional)">
            <Entrada value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          </Campo>
          <Erro mensagem={erro} />
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Cadastrar"}
          </BotaoPrimario>
        </form>
      </Gaveta>

      <Gaveta titulo="Novo canal de captação" aberta={abertaCanal} fechar={() => setAbertaCanal(false)}>
        <form onSubmit={salvarCanal} style={{ display: "grid", gap: 14 }}>
          <Campo rotulo="Nome do canal">
            <Entrada required value={formCanal.nomeCanal} onChange={(e) => setFormCanal({ ...formCanal, nomeCanal: e.target.value })} placeholder="Ex.: Catho, vagas.com, Indicação" />
          </Campo>
          <Campo rotulo="Tipo">
            <Selecao value={formCanal.tipoCanal} onChange={(e) => setFormCanal({ ...formCanal, tipoCanal: e.target.value })}>
              <option value="manual">Manual</option>
              <option value="importacao">Importação</option>
              <option value="conector">Conector</option>
            </Selecao>
          </Campo>
          <Campo rotulo="Custo mensal (R$, opcional)">
            <Entrada type="number" step="0.01" value={formCanal.vlrCustoMes} onChange={(e) => setFormCanal({ ...formCanal, vlrCustoMes: e.target.value })} />
          </Campo>
          <Erro mensagem={erro} />
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Criar canal"}
          </BotaoPrimario>
        </form>
      </Gaveta>
    </main>
  );
}
