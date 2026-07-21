"use client";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { api, fetchAutenticado } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";

interface Candidato {
  codCand: string;
  nomeCand: string;
  email: string;
  fone: string | null;
  cidade: string | null;
  dhInc: string;
  candidaturas: { codCdt: string; estagio: string; vaga: { codVag: string; titulo: string } }[];
}
interface Canal {
  codCanal: string;
  nomeCanal: string;
  tipoCanal: string;
  vlrCustoMes: string | null;
}

interface KpiCanal {
  codCanal: string;
  nomeCanal: string;
  tipoCanal: string;
  custoMes: number | null;
  candidaturas: number;
  triagem: number;
  entrevistas: number;
  propostas: number;
  contratacoes: number;
  taxaContratacao: number | null;
  qualidadeMedia: number | null;
  tempoMedioContratacaoDias: number | null;
  custoPorContratacao: number | null;
}

interface ItemLote {
  arquivo: string;
  status: "importado" | "reaproveitado" | "ignorado";
  motivo?: string;
  nomeCand?: string;
  email?: string;
}
interface ResultadoLote {
  total: number;
  importados: number;
  reaproveitados: number;
  ignorados: number;
  itens: ItemLote[];
}
interface VagaAberta {
  codVag: string;
  titulo: string;
  status: string;
}

const ROTULO_LOTE: Record<ItemLote["status"], { texto: string; cor: string }> = {
  importado: { texto: "Importado", cor: "var(--feedback-success, #15803d)" },
  reaproveitado: { texto: "Já existia", cor: "var(--text-muted)" },
  ignorado: { texto: "Não importado", cor: "var(--feedback-danger, #b91c1c)" },
};

const celula: React.CSSProperties = { padding: "10px 14px" };
const numerico: React.CSSProperties = { ...celula, textAlign: "right", fontVariantNumeric: "tabular-nums" };

const ROTULO_ESTAGIO: Record<string, string> = {
  applied: "Recebidas", screening: "Triagem", analysis: "Análise", shortlist: "Shortlist",
  interview: "Entrevista", offer: "Proposta", hired: "Contratado", knockout: "Eliminado (triagem)",
  not_selected: "Não selecionado", rejected: "Rejeitado", approved: "Aprovado", archived: "Arquivado",
};

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
  const [kpis, setKpis] = useState<KpiCanal[]>([]);
  const [janela, setJanela] = useState(90);
  const [abertaLote, setAbertaLote] = useState(false);
  const [vagasAbertas, setVagasAbertas] = useState<VagaAberta[]>([]);
  const [formLote, setFormLote] = useState({ codCanal: "", codVag: "" });
  const [arquivosLote, setArquivosLote] = useState<FileList | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultadoLote, setResultadoLote] = useState<ResultadoLote | null>(null);
  const [resetInput, setResetInput] = useState(0);
  const [aberta, setAberta] = useState(false);
  const [abertaCanal, setAbertaCanal] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [deduplicado, setDeduplicado] = useState(false);
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [form, setForm] = useState({ nomeCand: "", email: "", fone: "", cgc: "", cidade: "" });
  const [formCanal, setFormCanal] = useState({ nomeCanal: "", tipoCanal: "manual", vlrCustoMes: "" });

  const carregar = useCallback(async () => {
    const [r, c] = await Promise.all([api<Candidato[]>("/candidatos"), api<Canal[]>("/canais")]);
    if (r.status === 200 && r.json) setLista(r.json);
    if (c.status === 200 && c.json) setCanais(c.json);
  }, []);

  // Os KPIs recarregam sozinhos quando a janela muda; ficam fora do `carregar`
  // pra não refazer a lista de candidatos a cada troca de período.
  const carregarKpis = useCallback(async () => {
    const r = await api<KpiCanal[]>(`/canais/kpis?dias=${janela}`);
    if (r.status === 200 && r.json) setKpis(r.json);
  }, [janela]);

  useEffect(() => {
    if (aba === "canais") void carregarKpis();
  }, [aba, carregarKpis]);

  useEffect(() => {
    if (!abertaLote) return;
    void api<VagaAberta[]>("/vagas").then((r) => {
      if (r.status === 200 && r.json) setVagasAbertas(r.json.filter((v) => v.status === "ABERTA"));
    });
  }, [abertaLote]);

  /**
   * Envio multipart — `api()` serializa JSON, então aqui vai direto no
   * `fetchAutenticado` (que trata 401/renovação igual ao resto).
   */
  async function importarLote(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivosLote?.length) return;
    setErro(null);
    setResultadoLote(null);
    setImportando(true);

    const dados = new FormData();
    dados.set("codCanal", formLote.codCanal);
    if (formLote.codVag) dados.set("codVag", formLote.codVag);
    for (const arquivo of Array.from(arquivosLote)) dados.append("arquivos", arquivo);

    const res = await fetchAutenticado("/candidatos/importar-lote", { method: "POST", body: dados });
    setImportando(false);
    if (res.status !== 201) {
      setErro("Não foi possível importar o lote. Confira o canal e a vaga selecionados.");
      return;
    }
    setResultadoLote((await res.json()) as ResultadoLote);
    setArquivosLote(null);
    setResetInput((n) => n + 1);
    await carregar();
  }

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
    await Promise.all([carregar(), carregarKpis()]);
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

  const termoBusca = busca.trim().toLowerCase();
  const listaFiltrada = termoBusca
    ? lista.filter(
        (c) =>
          c.nomeCand.toLowerCase().includes(termoBusca) ||
          c.email.toLowerCase().includes(termoBusca) ||
          (c.cidade ?? "").toLowerCase().includes(termoBusca),
      )
    : lista;

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
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <BotaoPrimario
            onClick={() => { setResultadoLote(null); setAbertaLote(true); }}
            style={{ background: "transparent", color: "var(--text-body)", border: "1px solid var(--border-default)" }}
          >
            Importar currículos
          </BotaoPrimario>
          <BotaoPrimario onClick={() => setAberta(true)}>Cadastrar candidato</BotaoPrimario>
        </div>
      </header>

      <Entrada
        placeholder="Buscar por nome, e-mail ou cidade…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{ maxWidth: 320, marginBottom: 16 }}
      />

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
            {listaFiltrada.map((c) => (
              <Fragment key={c.codCand}>
                <tr
                  onClick={() => c.candidaturas.length > 0 && setExpandido(expandido === c.codCand ? null : c.codCand)}
                  style={{ borderTop: "1px solid var(--border-default)", cursor: c.candidaturas.length > 0 ? "pointer" : "default" }}
                >
                  <td style={celula}>{c.nomeCand}</td>
                  <td style={{ ...celula, color: "var(--text-muted)" }}>{c.email}</td>
                  <td style={{ ...celula, fontFamily: "var(--font-mono)" }}>{c.fone ?? "—"}</td>
                  <td style={celula}>{c.cidade ?? "—"}</td>
                  <td style={{ ...celula, fontFamily: "var(--font-mono)" }}>
                    {c.candidaturas.length}
                    {c.candidaturas.length > 0 && (expandido === c.codCand ? " ▲" : " ▼")}
                  </td>
                </tr>
                {expandido === c.codCand && c.candidaturas.length > 0 && (
                  <tr key={`${c.codCand}-exp`} style={{ background: "var(--surface-page)" }}>
                    <td colSpan={5} style={{ padding: "8px 14px 14px" }}>
                      <div style={{ display: "grid", gap: 6 }}>
                        {c.candidaturas.map((cdt) => (
                          <div key={cdt.codCdt} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                            <Link href={`/app/recrutamento/vagas/${cdt.vaga.codVag}`} style={{ color: "var(--text-link)" }}>
                              {cdt.vaga.titulo}
                            </Link>
                            <span style={{ color: "var(--text-muted)" }}>{ROTULO_ESTAGIO[cdt.estagio] ?? cdt.estagio}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {listaFiltrada.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 24, color: "var(--text-muted)", textAlign: "center" }}>
                  {lista.length === 0 ? "Nenhum candidato ainda." : "Nenhum candidato encontrado para essa busca."}
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
        <header style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0, maxWidth: 620 }}>
            De onde os candidatos chegam e o que cada canal entrega. O funil conta quem
            <strong style={{ fontWeight: 600 }}> chegou ao menos até</strong> cada etapa — quem foi
            entrevistado e recusado continua contando como entrevista.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
            <Selecao value={String(janela)} onChange={(e) => setJanela(Number(e.target.value))} aria-label="Período">
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="180">Últimos 6 meses</option>
              <option value="365">Últimos 12 meses</option>
            </Selecao>
            <BotaoPrimario onClick={() => setAbertaCanal(true)} style={{ whiteSpace: "nowrap" }}>Novo canal</BotaoPrimario>
          </div>
        </header>
        <div style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 1120 }}>
            <thead>
              <tr style={{ background: "var(--surface-page)", textAlign: "left" }}>
                <th style={{ ...celula, fontWeight: 600 }}>Canal</th>
                <th style={{ ...celula, fontWeight: 600, textAlign: "right" }}>Candidaturas</th>
                <th style={{ ...celula, fontWeight: 600, textAlign: "right" }}>Triagem</th>
                <th style={{ ...celula, fontWeight: 600, textAlign: "right" }}>Entrevistas</th>
                <th style={{ ...celula, fontWeight: 600, textAlign: "right" }}>Propostas</th>
                <th style={{ ...celula, fontWeight: 600, textAlign: "right" }}>Contratações</th>
                <th style={{ ...celula, fontWeight: 600, textAlign: "right" }} title="Contratações ÷ candidaturas do período">Conversão</th>
                <th style={{ ...celula, fontWeight: 600, textAlign: "right" }} title="Média do score de contratação (match determinístico) dos candidatos do canal">Qualidade</th>
                <th style={{ ...celula, fontWeight: 600, textAlign: "right" }} title="Dias entre a candidatura e a contratação">Tempo médio</th>
                <th style={{ ...celula, fontWeight: 600, textAlign: "right" }} title="Custo mensal rateado pelo período ÷ contratações">Custo/contratação</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k) => (
                <tr key={k.codCanal} style={{ borderTop: "1px solid var(--border-default)" }}>
                  <td style={celula}>
                    <div style={{ fontWeight: 500 }}>{k.nomeCanal}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {k.tipoCanal}
                      {k.custoMes != null && ` · R$ ${k.custoMes.toFixed(2)}/mês`}
                    </div>
                  </td>
                  <td style={numerico}>{k.candidaturas}</td>
                  <td style={numerico}>{k.triagem}</td>
                  <td style={numerico}>{k.entrevistas}</td>
                  <td style={numerico}>{k.propostas}</td>
                  <td style={{ ...numerico, fontWeight: 600 }}>{k.contratacoes}</td>
                  <td style={numerico}>{k.taxaContratacao == null ? "—" : `${k.taxaContratacao}%`}</td>
                  <td style={numerico}>{k.qualidadeMedia ?? "—"}</td>
                  <td style={numerico}>{k.tempoMedioContratacaoDias == null ? "—" : `${k.tempoMedioContratacaoDias} d`}</td>
                  <td style={numerico}>
                    {k.custoPorContratacao == null
                      ? <span title={k.custoMes == null ? "Canal sem custo informado" : "Nenhuma contratação no período"} style={{ color: "var(--text-muted)" }}>—</span>
                      : `R$ ${k.custoPorContratacao.toFixed(2)}`}
                  </td>
                </tr>
              ))}
              {kpis.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: 20, color: "var(--text-muted)", textAlign: "center" }}>
                    Nenhum canal ainda — crie ao menos um (ex.: &quot;Manual&quot;) para registrar candidaturas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      <Gaveta titulo="Importar currículos em lote" aberta={abertaLote} fechar={() => setAbertaLote(false)} largura={560}>
        <form onSubmit={importarLote} style={{ display: "grid", gap: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
            Até 20 arquivos por vez (PDF, DOCX ou TXT, 8MB cada). Nome, e-mail e telefone são lidos
            do próprio currículo. Currículo <strong style={{ fontWeight: 600 }}>sem e-mail</strong> não
            é importado — sem ele não dá para deduplicar nem falar com a pessoa; ele volta na lista
            para você cadastrar à mão.
          </p>
          <Campo rotulo="Canal de origem">
            <Selecao
              required
              value={formLote.codCanal}
              onChange={(e) => setFormLote({ ...formLote, codCanal: e.target.value })}
            >
              <option value="">Selecione…</option>
              {canais.map((c) => (
                <option key={c.codCanal} value={c.codCanal}>{c.nomeCanal}</option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Vaga (opcional — sem vaga, entram só no banco de talentos)">
            <Selecao value={formLote.codVag} onChange={(e) => setFormLote({ ...formLote, codVag: e.target.value })}>
              <option value="">Nenhuma</option>
              {vagasAbertas.map((v) => (
                <option key={v.codVag} value={v.codVag}>{v.titulo}</option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Arquivos">
            {/* `key` muda a cada importação concluída: sem isso o input nativo continua
                exibindo "3 arquivos" enquanto o estado já foi limpo. */}
            <input
              key={resetInput}
              type="file"
              multiple
              required
              accept=".pdf,.docx,.txt"
              onChange={(e) => setArquivosLote(e.target.files)}
              style={{ font: "inherit", fontSize: 14 }}
            />
          </Campo>
          <Erro mensagem={erro} />
          <BotaoPrimario type="submit" disabled={importando || !arquivosLote?.length}>
            {importando ? "Importando…" : `Importar ${arquivosLote?.length ?? 0} arquivo(s)`}
          </BotaoPrimario>
        </form>

        {resultadoLote && (
          <div style={{ marginTop: 22 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>
              {resultadoLote.importados} importado(s) · {resultadoLote.reaproveitados} já existia(m) ·{" "}
              {resultadoLote.ignorados} não importado(s)
            </h3>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-muted)" }}>
              Candidaturas importadas entram sem score — o match só existe depois que o candidato
              responde a autoavaliação da vaga.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
              {resultadoLote.itens.map((item) => (
                <li
                  key={item.arquivo}
                  style={{
                    border: "1px solid var(--border-default)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{item.arquivo}</span>
                    <span style={{ color: ROTULO_LOTE[item.status].cor, fontWeight: 600, flexShrink: 0 }}>
                      {ROTULO_LOTE[item.status].texto}
                    </span>
                  </div>
                  <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
                    {item.nomeCand ? `${item.nomeCand} · ${item.email}` : item.motivo}
                    {item.nomeCand && item.motivo ? ` · ${item.motivo}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Gaveta>

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
