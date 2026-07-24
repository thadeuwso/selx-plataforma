"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Abas, BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";

/**
 * Projetos e Contratos de serviço — espelhos do Sankhya (TCSPRJ/TCSCON,
 * migrations 0004/0005). O backend existia desde então sem nenhuma tela;
 * são o vínculo de alocação do funcionário (TFPFUN.CODPROJ/CODCONTRATO).
 */

interface Projeto {
  codProj: string;
  identificacao: string;
  abreviatura: string;
  codProjPai: string | null;
  codEmp: string | null;
  grau: number;
  dtInicio: string | null;
  dtTermino: string | null;
  vlrOrcado: string | null;
  concluido: string;
}
interface Contrato {
  codContrato: string;
  descrContrato: string;
  numContrato: string | null;
  codProj: string | null;
  codEmp: string | null;
  tipo: string | null;
  vlrHora: string | null;
  parcelaQtd: number | null;
  dtTermino: string | null;
}
interface Empresa {
  codEmp: string;
  nomeFantasia: string;
}

const celula: React.CSSProperties = { padding: "10px 14px" };

const moeda = (v: string | null) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const data = (v: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—");

export default function PaginaProjetos() {
  const [aba, setAba] = useState("projetos");
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [gavetaProj, setGavetaProj] = useState(false);
  const [gavetaContr, setGavetaContr] = useState(false);
  const [editProj, setEditProj] = useState<Projeto | null>(null);
  const [editContr, setEditContr] = useState<Contrato | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [formProj, setFormProj] = useState({
    identificacao: "", abreviatura: "", codProjPai: "", codEmp: "", dtInicio: "", dtTermino: "", vlrOrcado: "",
  });
  const [formContr, setFormContr] = useState({
    descrContrato: "", numContrato: "", codProj: "", codEmp: "", tipo: "M", vlrHora: "", parcelaQtd: "", dtTermino: "",
  });

  const dInput = (v: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : "");

  function abrirProj(p?: Projeto) {
    setEditProj(p ?? null);
    setErro(null);
    setFormProj({
      identificacao: p?.identificacao ?? "", abreviatura: p?.abreviatura ?? "", codProjPai: p?.codProjPai ?? "",
      codEmp: p?.codEmp ?? "", dtInicio: dInput(p?.dtInicio ?? null), dtTermino: dInput(p?.dtTermino ?? null), vlrOrcado: p?.vlrOrcado ?? "",
    });
    setGavetaProj(true);
  }
  function abrirContr(c?: Contrato) {
    setEditContr(c ?? null);
    setErro(null);
    setFormContr({
      descrContrato: c?.descrContrato ?? "", numContrato: c?.numContrato ?? "", codProj: c?.codProj ?? "", codEmp: c?.codEmp ?? "",
      tipo: c?.tipo ?? "M", vlrHora: c?.vlrHora ?? "", parcelaQtd: c?.parcelaQtd != null ? String(c.parcelaQtd) : "", dtTermino: dInput(c?.dtTermino ?? null),
    });
    setGavetaContr(true);
  }

  const carregar = useCallback(async () => {
    const [p, c, e] = await Promise.all([
      api<Projeto[]>("/projetos"),
      api<Contrato[]>("/contratos-servico"),
      api<Empresa[]>("/empresas"),
    ]);
    if (p.status === 200 && p.json) setProjetos(p.json);
    if (c.status === 200 && c.json) setContratos(c.json);
    if (e.status === 200 && e.json) setEmpresas(e.json);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvarProjeto(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const corpo = {
      identificacao: formProj.identificacao,
      abreviatura: formProj.abreviatura,
      codProjPai: formProj.codProjPai || (editProj ? null : undefined),
      codEmp: formProj.codEmp || (editProj ? null : undefined),
      dtInicio: formProj.dtInicio || (editProj ? null : undefined),
      dtTermino: formProj.dtTermino || (editProj ? null : undefined),
      vlrOrcado: formProj.vlrOrcado ? Number(formProj.vlrOrcado) : (editProj ? null : undefined),
    };
    const r = editProj
      ? await api(`/projetos/${editProj.codProj}`, { metodo: "PATCH", corpo })
      : await api("/projetos", { metodo: "POST", corpo });
    setSalvando(false);
    if (r.status !== 201 && r.status !== 200) {
      setErro(r.status === 403 ? "Sem permissão (core.funcionarios.editar)." : "Não foi possível salvar o projeto.");
      return;
    }
    setGavetaProj(false);
    setFormProj({ identificacao: "", abreviatura: "", codProjPai: "", codEmp: "", dtInicio: "", dtTermino: "", vlrOrcado: "" });
    await carregar();
  }

  async function salvarContrato(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const nada = editContr ? null : undefined;
    const corpo = {
      descrContrato: formContr.descrContrato,
      numContrato: formContr.numContrato || nada,
      codProj: formContr.codProj || nada,
      codEmp: formContr.codEmp || nada,
      tipo: formContr.tipo || undefined,
      vlrHora: formContr.vlrHora ? Number(formContr.vlrHora) : nada,
      parcelaQtd: formContr.parcelaQtd ? Number(formContr.parcelaQtd) : nada,
      dtTermino: formContr.dtTermino || nada,
    };
    const r = editContr
      ? await api(`/contratos-servico/${editContr.codContrato}`, { metodo: "PATCH", corpo })
      : await api("/contratos-servico", { metodo: "POST", corpo });
    setSalvando(false);
    if (r.status !== 201 && r.status !== 200) {
      setErro(r.status === 403 ? "Sem permissão (core.funcionarios.editar)." : "Não foi possível salvar o contrato.");
      return;
    }
    setGavetaContr(false);
    setFormContr({ descrContrato: "", numContrato: "", codProj: "", codEmp: "", tipo: "M", vlrHora: "", parcelaQtd: "", dtTermino: "" });
    await carregar();
  }

  const nomeProjeto = (cod: string | null) =>
    cod ? projetos.find((p) => p.codProj === cod)?.identificacao ?? "—" : "—";

  return (
    <main style={{ padding: 32 }}>
      <header style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Projetos e contratos</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Estrutura de alocação usada no vínculo do funcionário — espelho do Sankhya.
        </p>
        <div style={{ marginTop: 16 }}>
          <Abas
            ativa={aba}
            aoMudar={setAba}
            abas={[
              { id: "projetos", rotulo: `Projetos (${projetos.length})` },
              { id: "contratos", rotulo: `Contratos de serviço (${contratos.length})` },
            ]}
          />
        </div>
      </header>

      {aba === "projetos" && (
        <section style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <BotaoPrimario onClick={() => abrirProj()}>Novo projeto</BotaoPrimario>
          </div>
          <div style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "var(--surface-page)", textAlign: "left" }}>
                  <th style={{ ...celula, fontWeight: 600 }}>Identificação</th>
                  <th style={{ ...celula, fontWeight: 600 }}>Abreviatura</th>
                  <th style={{ ...celula, fontWeight: 600 }}>Início</th>
                  <th style={{ ...celula, fontWeight: 600 }}>Término</th>
                  <th style={{ ...celula, fontWeight: 600 }}>Orçado</th>
                  <th style={{ ...celula, fontWeight: 600 }}>Situação</th>
                </tr>
              </thead>
              <tbody>
                {projetos.map((p) => (
                  <tr key={p.codProj} onClick={() => abrirProj(p)} style={{ borderTop: "1px solid var(--border-default)", cursor: "pointer" }}>
                    <td style={celula}>
                      {/* Hierarquia: recua pelo grau, como no espelho do Sankhya */}
                      <span style={{ paddingLeft: (p.grau - 1) * 16 }}>
                        {p.grau > 1 && <span style={{ color: "var(--text-muted)" }}>└ </span>}
                        {p.identificacao}
                      </span>
                    </td>
                    <td style={{ ...celula, fontFamily: "var(--font-mono)", fontSize: 12 }}>{p.abreviatura}</td>
                    <td style={celula}>{data(p.dtInicio)}</td>
                    <td style={celula}>{data(p.dtTermino)}</td>
                    <td style={{ ...celula, fontVariantNumeric: "tabular-nums" }}>{moeda(p.vlrOrcado)}</td>
                    <td style={celula}>
                      <span
                        style={{
                          padding: "2px 10px", borderRadius: 999, fontSize: 12,
                          background: p.concluido === "S" ? "var(--neutral-100)" : "var(--green-100, #D6E9DF)",
                          color: p.concluido === "S" ? "var(--text-muted)" : "var(--green-700, #1D533B)",
                        }}
                      >
                        {p.concluido === "S" ? "Concluído" : "Em andamento"}
                      </span>
                    </td>
                  </tr>
                ))}
                {projetos.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, color: "var(--text-muted)", textAlign: "center" }}>
                      Nenhum projeto ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {aba === "contratos" && (
        <section style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <BotaoPrimario onClick={() => abrirContr()}>Novo contrato</BotaoPrimario>
          </div>
          <div style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "var(--surface-page)", textAlign: "left" }}>
                  <th style={{ ...celula, fontWeight: 600 }}>Descrição</th>
                  <th style={{ ...celula, fontWeight: 600 }}>Número</th>
                  <th style={{ ...celula, fontWeight: 600 }}>Projeto</th>
                  <th style={{ ...celula, fontWeight: 600 }}>Valor/hora</th>
                  <th style={{ ...celula, fontWeight: 600 }}>Parcelas</th>
                  <th style={{ ...celula, fontWeight: 600 }}>Término</th>
                </tr>
              </thead>
              <tbody>
                {contratos.map((c) => (
                  <tr key={c.codContrato} onClick={() => abrirContr(c)} style={{ borderTop: "1px solid var(--border-default)", cursor: "pointer" }}>
                    <td style={celula}>{c.descrContrato}</td>
                    <td style={{ ...celula, fontFamily: "var(--font-mono)", fontSize: 12 }}>{c.numContrato ?? "—"}</td>
                    <td style={{ ...celula, color: "var(--text-muted)" }}>{nomeProjeto(c.codProj)}</td>
                    <td style={{ ...celula, fontVariantNumeric: "tabular-nums" }}>{moeda(c.vlrHora)}</td>
                    <td style={{ ...celula, fontVariantNumeric: "tabular-nums" }}>{c.parcelaQtd ?? "—"}</td>
                    <td style={celula}>{data(c.dtTermino)}</td>
                  </tr>
                ))}
                {contratos.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, color: "var(--text-muted)", textAlign: "center" }}>
                      Nenhum contrato ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Gaveta titulo={editProj ? "Editar projeto" : "Novo projeto"} aberta={gavetaProj} fechar={() => setGavetaProj(false)}>
        <form onSubmit={salvarProjeto} style={{ display: "grid", gap: 14 }}>
          <Campo rotulo="Identificação">
            <Entrada required value={formProj.identificacao} onChange={(e) => setFormProj({ ...formProj, identificacao: e.target.value })} />
          </Campo>
          <Campo rotulo="Abreviatura (até 20 caracteres)">
            <Entrada required maxLength={20} value={formProj.abreviatura} onChange={(e) => setFormProj({ ...formProj, abreviatura: e.target.value })} />
          </Campo>
          <Campo rotulo="Projeto pai (opcional)">
            <Selecao value={formProj.codProjPai} onChange={(e) => setFormProj({ ...formProj, codProjPai: e.target.value })}>
              <option value="">— nenhum (projeto raiz) —</option>
              {projetos.filter((p) => p.codProj !== editProj?.codProj).map((p) => (
                <option key={p.codProj} value={p.codProj}>{p.identificacao}</option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Empresa (opcional)">
            <Selecao value={formProj.codEmp} onChange={(e) => setFormProj({ ...formProj, codEmp: e.target.value })}>
              <option value="">—</option>
              {empresas.map((e) => (
                <option key={e.codEmp} value={e.codEmp}>{e.nomeFantasia}</option>
              ))}
            </Selecao>
          </Campo>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Campo rotulo="Início">
              <Entrada type="date" value={formProj.dtInicio} onChange={(e) => setFormProj({ ...formProj, dtInicio: e.target.value })} />
            </Campo>
            <Campo rotulo="Término">
              <Entrada type="date" value={formProj.dtTermino} onChange={(e) => setFormProj({ ...formProj, dtTermino: e.target.value })} />
            </Campo>
          </div>
          <Campo rotulo="Valor orçado (R$)">
            <Entrada type="number" step="0.01" value={formProj.vlrOrcado} onChange={(e) => setFormProj({ ...formProj, vlrOrcado: e.target.value })} />
          </Campo>
          <Erro mensagem={erro} />
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : editProj ? "Salvar" : "Criar projeto"}
          </BotaoPrimario>
        </form>
      </Gaveta>

      <Gaveta titulo={editContr ? "Editar contrato de serviço" : "Novo contrato de serviço"} aberta={gavetaContr} fechar={() => setGavetaContr(false)}>
        <form onSubmit={salvarContrato} style={{ display: "grid", gap: 14 }}>
          <Campo rotulo="Descrição">
            <Entrada required value={formContr.descrContrato} onChange={(e) => setFormContr({ ...formContr, descrContrato: e.target.value })} />
          </Campo>
          <Campo rotulo="Número do contrato (opcional)">
            <Entrada value={formContr.numContrato} onChange={(e) => setFormContr({ ...formContr, numContrato: e.target.value })} />
          </Campo>
          <Campo rotulo="Projeto (opcional)">
            <Selecao value={formContr.codProj} onChange={(e) => setFormContr({ ...formContr, codProj: e.target.value })}>
              <option value="">—</option>
              {projetos.map((p) => (
                <option key={p.codProj} value={p.codProj}>{p.identificacao}</option>
              ))}
            </Selecao>
          </Campo>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Campo rotulo="Tipo">
              <Selecao value={formContr.tipo} onChange={(e) => setFormContr({ ...formContr, tipo: e.target.value })}>
                <option value="M">M — Mensal</option>
                <option value="H">H — Por hora</option>
                <option value="F">F — Fechado</option>
              </Selecao>
            </Campo>
            <Campo rotulo="Valor/hora (R$)">
              <Entrada type="number" step="0.01" value={formContr.vlrHora} onChange={(e) => setFormContr({ ...formContr, vlrHora: e.target.value })} />
            </Campo>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Campo rotulo="Qtd. de parcelas">
              <Entrada type="number" min={1} value={formContr.parcelaQtd} onChange={(e) => setFormContr({ ...formContr, parcelaQtd: e.target.value })} />
            </Campo>
            <Campo rotulo="Término">
              <Entrada type="date" value={formContr.dtTermino} onChange={(e) => setFormContr({ ...formContr, dtTermino: e.target.value })} />
            </Campo>
          </div>
          <Erro mensagem={erro} />
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : editContr ? "Salvar" : "Criar contrato"}
          </BotaoPrimario>
        </form>
      </Gaveta>
    </main>
  );
}
