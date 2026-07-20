"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";

interface Vaga {
  codVag: string;
  titulo: string;
  status: string;
  urgente: string;
  local: string | null;
  senioridade: string | null;
  modeloTrab: string | null;
  empresa: { nomeFantasia: string };
  departamento: { descrDep: string } | null;
  cargo: { nomeCar: string } | null;
  _count: { candidaturas: number };
}
interface Opcao {
  codEmp?: string;
  nomeFantasia?: string;
  codCar?: string;
  nomeCar?: string;
  codDep?: string;
  descrDep?: string;
}
interface Requisito {
  descrReq: string;
  tipoReq: "OBRIGATORIO" | "DESEJAVEL";
  knockout: boolean;
  origemIa: boolean;
}
interface RespostaEstruturarIa {
  titulo: string;
  senioridade: string | null;
  modeloTrab: string | null;
  local: string | null;
  vlrSalMin: number | null;
  vlrSalMax: number | null;
  requisitos: { descrReq: string; tipoReq: "OBRIGATORIO" | "DESEJAVEL"; knockout: boolean }[];
  perguntas: { pergunta: string }[];
}

const celula: React.CSSProperties = { padding: "10px 14px" };

const CORES_STATUS: Record<string, { fundo: string; texto: string; rotulo: string }> = {
  RASCUNHO: { fundo: "var(--neutral-100)", texto: "var(--text-muted)", rotulo: "Rascunho" },
  EM_APROVACAO: { fundo: "var(--amber-100, #F2E3C4)", texto: "var(--amber-700, #714E08)", rotulo: "Em aprovação" },
  AJUSTES: { fundo: "var(--amber-100, #F2E3C4)", texto: "var(--amber-700, #714E08)", rotulo: "Ajustes pedidos" },
  REJEITADA: { fundo: "var(--red-100, #F3DAD8)", texto: "var(--red-700, #7E2E2A)", rotulo: "Rejeitada" },
  ABERTA: { fundo: "var(--green-100, #D6E9DF)", texto: "var(--green-700, #1D533B)", rotulo: "Aberta" },
  FECHADA: { fundo: "var(--brand-100)", texto: "var(--brand-800)", rotulo: "Fechada" },
  CANCELADA: { fundo: "var(--neutral-100)", texto: "var(--text-muted)", rotulo: "Cancelada" },
};

const ACOES_POR_STATUS: Record<string, { acao: string; rotulo: string }[]> = {
  RASCUNHO: [{ acao: "enviar_aprovacao", rotulo: "Enviar p/ aprovação" }],
  AJUSTES: [{ acao: "enviar_aprovacao", rotulo: "Reenviar" }],
  EM_APROVACAO: [
    { acao: "aprovar", rotulo: "Aprovar" },
    { acao: "pedir_ajustes", rotulo: "Pedir ajustes" },
  ],
  ABERTA: [{ acao: "fechar", rotulo: "Fechar" }],
};

export default function PaginaVagas() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [empresas, setEmpresas] = useState<Opcao[]>([]);
  const [cargos, setCargos] = useState<Opcao[]>([]);
  const [departamentos, setDepartamentos] = useState<Opcao[]>([]);
  const [aberta, setAberta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    codEmp: "",
    titulo: "",
    senioridade: "",
    modeloTrab: "",
    local: "",
    vlrSalMin: "",
    vlrSalMax: "",
    codCar: "",
    codDep: "",
  });
  const [requisitos, setRequisitos] = useState<Requisito[]>([]);
  const [textoIa, setTextoIa] = useState("");
  const [estruturando, setEstruturando] = useState(false);
  const [erroIa, setErroIa] = useState<string | null>(null);
  const [iaAplicada, setIaAplicada] = useState(false);

  const carregar = useCallback(async () => {
    const [v, e, c, d] = await Promise.all([
      api<Vaga[]>("/vagas"),
      api<Opcao[]>("/empresas"),
      api<Opcao[]>("/cargos"),
      api<Opcao[]>("/departamentos"),
    ]);
    if (v.status === 200 && v.json) setVagas(v.json);
    if (e.status === 200 && e.json) setEmpresas(e.json);
    if (c.status === 200 && c.json) setCargos(c.json);
    if (d.status === 200 && d.json) setDepartamentos(d.json);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function transicionar(codVag: string, acao: string) {
    const r = await api(`/vagas/${codVag}/status`, { metodo: "PATCH", corpo: { acao } });
    if (r.status !== 200) alert("Não foi possível executar a ação (verifique sua permissão).");
    await carregar();
  }

  function fecharGaveta() {
    setAberta(false);
    setTextoIa("");
    setErroIa(null);
    setIaAplicada(false);
    setRequisitos([]);
  }

  /** Cola a descrição bruta e estrutura com IA (AI Gateway) — nada é publicado sozinho, o RH revisa aqui. */
  async function estruturarComIa() {
    if (textoIa.trim().length < 40) {
      setErroIa("Cole uma descrição com pelo menos 40 caracteres.");
      return;
    }
    setErroIa(null);
    setEstruturando(true);
    const r = await api<RespostaEstruturarIa>("/vagas/estruturar-ia", {
      metodo: "POST",
      corpo: { rawText: textoIa },
    });
    setEstruturando(false);
    if (r.status !== 201 || !r.json) {
      setErroIa("A IA não conseguiu estruturar agora — preencha manualmente abaixo.");
      return;
    }
    const d = r.json;
    setForm((f) => ({
      ...f,
      titulo: d.titulo ?? f.titulo,
      senioridade: d.senioridade ?? f.senioridade,
      modeloTrab: d.modeloTrab ?? f.modeloTrab,
      local: d.local ?? f.local,
      vlrSalMin: d.vlrSalMin != null ? String(d.vlrSalMin) : f.vlrSalMin,
      vlrSalMax: d.vlrSalMax != null ? String(d.vlrSalMax) : f.vlrSalMax,
    }));
    setRequisitos(
      (d.requisitos ?? []).map((r) => ({ descrReq: r.descrReq, tipoReq: r.tipoReq, knockout: r.knockout, origemIa: true })),
    );
    setIaAplicada(true);
  }

  function adicionarRequisito() {
    setRequisitos((r) => [...r, { descrReq: "", tipoReq: "OBRIGATORIO", knockout: false, origemIa: false }]);
  }
  function removerRequisito(i: number) {
    setRequisitos((r) => r.filter((_, idx) => idx !== i));
  }
  function atualizarRequisito(i: number, patch: Partial<Requisito>) {
    setRequisitos((r) => r.map((req, idx) => (idx === i ? { ...req, ...patch, origemIa: false } : req)));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const r = await api("/vagas", {
      metodo: "POST",
      corpo: {
        codEmp: form.codEmp,
        titulo: form.titulo,
        senioridade: form.senioridade || undefined,
        modeloTrab: form.modeloTrab || undefined,
        local: form.local || undefined,
        vlrSalMin: form.vlrSalMin ? Number(form.vlrSalMin) : undefined,
        vlrSalMax: form.vlrSalMax ? Number(form.vlrSalMax) : undefined,
        codCar: form.codCar || undefined,
        codDep: form.codDep || undefined,
        requisitos: requisitos
          .filter((r) => r.descrReq.trim())
          .map((r) => ({ descrReq: r.descrReq, tipoReq: r.tipoReq, knockout: r.knockout ? "S" : "N" })),
      },
    });
    setSalvando(false);
    if (r.status !== 201) {
      setErro(r.status === 403 ? "Sem permissão (recrutamento.vagas.criar)." : "Não foi possível criar a vaga.");
      return;
    }
    setForm({ codEmp: "", titulo: "", senioridade: "", modeloTrab: "", local: "", vlrSalMin: "", vlrSalMax: "", codCar: "", codDep: "" });
    fecharGaveta();
    await carregar();
  }

  return (
    <main style={{ padding: 32 }}>
      <header style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Vagas</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            {vagas.length} vaga(s) — ciclo: rascunho → aprovação → aberta → fechada.
          </p>
        </div>
        <BotaoPrimario onClick={() => setAberta(true)}>Nova vaga</BotaoPrimario>
      </header>

      <div style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "var(--surface-page)", textAlign: "left" }}>
              <th style={{ ...celula, fontWeight: 600 }}>Título</th>
              <th style={{ ...celula, fontWeight: 600 }}>Empresa</th>
              <th style={{ ...celula, fontWeight: 600 }}>Cargo / Depto</th>
              <th style={{ ...celula, fontWeight: 600 }}>Candidaturas</th>
              <th style={{ ...celula, fontWeight: 600 }}>Status</th>
              <th style={{ ...celula, fontWeight: 600 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {vagas.map((v) => {
              const cor = CORES_STATUS[v.status] ?? CORES_STATUS.RASCUNHO;
              return (
                <tr key={v.codVag} style={{ borderTop: "1px solid var(--border-default)" }}>
                  <td style={celula}>
                    {v.urgente === "S" && <span title="Urgente" style={{ color: "var(--red-600)", marginRight: 6 }}>●</span>}
                    {v.titulo}
                    <span style={{ color: "var(--text-muted)", fontSize: 12, display: "block" }}>
                      {[v.senioridade, v.modeloTrab, v.local].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td style={{ ...celula, color: "var(--text-muted)" }}>{v.empresa?.nomeFantasia}</td>
                  <td style={{ ...celula, color: "var(--text-muted)" }}>
                    {[v.cargo?.nomeCar, v.departamento?.descrDep].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td style={{ ...celula, fontFamily: "var(--font-mono)" }}>{v._count?.candidaturas ?? 0}</td>
                  <td style={celula}>
                    <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 12, background: cor.fundo, color: cor.texto }}>
                      {cor.rotulo}
                    </span>
                  </td>
                  <td style={{ ...celula, display: "flex", gap: 6, alignItems: "center" }}>
                    <Link
                      href={`/app/recrutamento/vagas/${v.codVag}`}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--border-default)",
                        background: "var(--surface-page)",
                        color: "var(--text-body)",
                        fontSize: 12,
                        textDecoration: "none",
                      }}
                    >
                      Pipeline
                    </Link>
                    {(ACOES_POR_STATUS[v.status] ?? []).map((a) => (
                      <button
                        key={a.acao}
                        onClick={() => transicionar(v.codVag, a.acao)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid var(--border-default)",
                          background: "var(--surface-default)",
                          color: "var(--text-body)",
                          font: "inherit",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        {a.rotulo}
                      </button>
                    ))}
                  </td>
                </tr>
              );
            })}
            {vagas.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, color: "var(--text-muted)", textAlign: "center" }}>
                  Nenhuma vaga ainda — crie a primeira.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Gaveta titulo="Nova vaga" aberta={aberta} fechar={fecharGaveta}>
        <div
          style={{
            background: "var(--surface-page)",
            border: "1px solid var(--border-default)",
            borderRadius: 10,
            padding: 14,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            ✨ Estruturar com IA
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            Cole a descrição da vaga (de um e-mail, doc ou anúncio anterior). A IA sugere título, requisitos e
            perguntas — nada é publicado automaticamente, você revisa e edita antes de criar.
          </p>
          <textarea
            value={textoIa}
            onChange={(e) => setTextoIa(e.target.value)}
            rows={4}
            placeholder="Cole aqui a descrição bruta da vaga..."
            style={{
              padding: "10px 12px",
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              background: "var(--surface-default)",
              color: "var(--text-body)",
              font: "inherit",
              fontSize: 13,
              resize: "vertical",
            }}
          />
          <Erro mensagem={erroIa} />
          <button
            type="button"
            onClick={estruturarComIa}
            disabled={estruturando}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--border-default)",
              background: "var(--surface-default)",
              color: "var(--text-body)",
              font: "inherit",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              opacity: estruturando ? 0.6 : 1,
              justifySelf: "start",
            }}
          >
            {estruturando ? "Analisando com IA…" : iaAplicada ? "Analisar novamente" : "Analisar e estruturar vaga"}
          </button>
        </div>

        <form onSubmit={salvar} style={{ display: "grid", gap: 14, marginTop: 18 }}>
          <Campo rotulo="Título">
            <Entrada required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </Campo>
          <Campo rotulo="Empresa/filial">
            <Selecao required value={form.codEmp} onChange={(e) => setForm({ ...form, codEmp: e.target.value })}>
              <option value="">— selecione —</option>
              {empresas.map((e) => (
                <option key={e.codEmp} value={e.codEmp}>{e.nomeFantasia}</option>
              ))}
            </Selecao>
          </Campo>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Campo rotulo="Senioridade">
              <Selecao value={form.senioridade} onChange={(e) => setForm({ ...form, senioridade: e.target.value })}>
                <option value="">—</option>
                {["ESTAGIO", "JUNIOR", "PLENO", "SENIOR", "ESPECIALISTA", "GESTAO"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Modelo">
              <Selecao value={form.modeloTrab} onChange={(e) => setForm({ ...form, modeloTrab: e.target.value })}>
                <option value="">—</option>
                <option value="PRESENCIAL">Presencial</option>
                <option value="HIBRIDO">Híbrido</option>
                <option value="REMOTO">Remoto</option>
              </Selecao>
            </Campo>
          </div>
          <Campo rotulo="Local">
            <Entrada value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} />
          </Campo>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Campo rotulo="Salário mín. (R$)">
              <Entrada type="number" step="0.01" value={form.vlrSalMin} onChange={(e) => setForm({ ...form, vlrSalMin: e.target.value })} />
            </Campo>
            <Campo rotulo="Salário máx. (R$)">
              <Entrada type="number" step="0.01" value={form.vlrSalMax} onChange={(e) => setForm({ ...form, vlrSalMax: e.target.value })} />
            </Campo>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Campo rotulo="Cargo">
              <Selecao value={form.codCar} onChange={(e) => setForm({ ...form, codCar: e.target.value })}>
                <option value="">—</option>
                {cargos.map((c) => (
                  <option key={c.codCar} value={c.codCar}>{c.nomeCar}</option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Departamento">
              <Selecao value={form.codDep} onChange={(e) => setForm({ ...form, codDep: e.target.value })}>
                <option value="">—</option>
                {departamentos.map((d) => (
                  <option key={d.codDep} value={d.codDep}>{d.descrDep}</option>
                ))}
              </Selecao>
            </Campo>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Requisitos</span>
              <button
                type="button"
                onClick={adicionarRequisito}
                style={{ border: "none", background: "none", color: "var(--action-primary, var(--brand-700))", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                + adicionar
              </button>
            </div>
            {requisitos.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                Nenhum requisito ainda — use a IA acima ou adicione manualmente.
              </p>
            )}
            <div style={{ display: "grid", gap: 8 }}>
              {requisitos.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto auto",
                    gap: 8,
                    alignItems: "center",
                    padding: 8,
                    border: "1px solid var(--border-default)",
                    borderRadius: 8,
                  }}
                >
                  <Entrada
                    value={r.descrReq}
                    placeholder="Descrição do requisito"
                    onChange={(e) => atualizarRequisito(i, { descrReq: e.target.value })}
                    style={{ fontSize: 13 }}
                  />
                  <Selecao
                    value={r.tipoReq}
                    onChange={(e) => atualizarRequisito(i, { tipoReq: e.target.value as Requisito["tipoReq"] })}
                    style={{ fontSize: 12, padding: "6px 8px" }}
                  >
                    <option value="OBRIGATORIO">Obrigatório</option>
                    <option value="DESEJAVEL">Desejável</option>
                  </Selecao>
                  <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                    <input type="checkbox" checked={r.knockout} onChange={(e) => atualizarRequisito(i, { knockout: e.target.checked })} />
                    Eliminatório
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {r.origemIa && (
                      <span
                        title="Gerado pela IA"
                        style={{ fontSize: 11, padding: "2px 6px", borderRadius: 999, background: "var(--brand-100)", color: "var(--brand-800)" }}
                      >
                        ✨ IA
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removerRequisito(i)}
                      aria-label="Remover requisito"
                      style={{ border: "none", background: "none", color: "var(--red-600, #9A3833)", cursor: "pointer", fontSize: 16 }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Erro mensagem={erro} />
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Criando..." : "Criar vaga (rascunho)"}
          </BotaoPrimario>
        </form>
      </Gaveta>
    </main>
  );
}
