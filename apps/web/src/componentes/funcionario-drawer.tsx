"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Abas, BotaoPrimario, Campo, Entrada, Gaveta, Selecao } from "./formulario";
import { PdiFuncionario } from "@/componentes/pdi-funcionario";

/**
 * Detalhe do funcionário — dá casa às três rotas que existiam no backend sem
 * nenhuma tela: dependentes, histórico de mudanças e assinaturas pendentes.
 */

interface Dependente {
  codDpd: string;
  nomeDpd: string;
  tipoDpd: string;
  dtNasc: string | null;
  cgc: string | null;
}
interface EventoHistorico {
  codFunHis: string;
  tipoMud: string;
  valorAnt: string | null;
  valorNovo: string | null;
  dtMud: string;
}
interface AssinaturaFun {
  codAssin: string;
  status: string;
  tokenPub: string;
  documento: { nomeDoc: string };
}
interface DocumentoModelo {
  codDoc: string;
  nomeDoc: string;
}

const TIPOS_DEPENDENTE = ["FILHO", "FILHA", "CONJUGE", "ENTEADO", "PAI", "MAE", "OUTRO"];

const ROTULO_TIPO_MUD: Record<string, string> = {
  ADMISSAO: "Admissão",
  SALARIO: "Alteração salarial",
  CARGO: "Mudança de cargo",
  DEPARTAMENTO: "Mudança de departamento",
  SITUACAO: "Mudança de situação",
  DESLIGAMENTO: "Desligamento",
};

export function FuncionarioDrawer({
  funcionario,
  fechar,
}: {
  funcionario: { codFun: string; nomeFun: string; numCad: string } | null;
  fechar: () => void;
}) {
  const [tab, setTab] = useState("dependentes");
  const [dependentes, setDependentes] = useState<Dependente[] | null>(null);
  const [historico, setHistorico] = useState<EventoHistorico[] | null>(null);
  const [assinaturas, setAssinaturas] = useState<AssinaturaFun[] | null>(null);
  const [modelos, setModelos] = useState<DocumentoModelo[]>([]);
  const [form, setForm] = useState({ nomeDpd: "", tipoDpd: "FILHO", dtNasc: "", cgc: "" });
  const [salvando, setSalvando] = useState(false);
  const [codDocEnvio, setCodDocEnvio] = useState("");
  const [enviandoDoc, setEnviandoDoc] = useState(false);

  const codFun = funcionario?.codFun;

  const carregarDependentes = useCallback(async () => {
    if (!codFun) return;
    const r = await api<Dependente[]>(`/funcionarios/${codFun}/dependentes`);
    if (r.status === 200 && r.json) setDependentes(r.json);
  }, [codFun]);

  const carregarAssinaturas = useCallback(async () => {
    if (!codFun) return;
    const r = await api<AssinaturaFun[]>(`/funcionarios/${codFun}/assinaturas`);
    if (r.status === 200 && r.json) setAssinaturas(r.json);
  }, [codFun]);

  useEffect(() => {
    setTab("dependentes");
    setDependentes(null);
    setHistorico(null);
    setAssinaturas(null);
    setForm({ nomeDpd: "", tipoDpd: "FILHO", dtNasc: "", cgc: "" });
  }, [codFun]);

  useEffect(() => {
    if (!codFun) return;
    if (tab === "dependentes" && dependentes === null) void carregarDependentes();
    if (tab === "historico" && historico === null) {
      void api<EventoHistorico[]>(`/funcionarios/${codFun}/historico`).then((r) => {
        if (r.status === 200 && r.json) setHistorico(r.json);
      });
    }
    if (tab === "documentos") {
      if (assinaturas === null) void carregarAssinaturas();
      if (modelos.length === 0) {
        void api<DocumentoModelo[]>("/documentos-modelo").then((r) => {
          if (r.status === 200 && r.json) setModelos(r.json);
        });
      }
    }
  }, [tab, codFun, dependentes, historico, assinaturas, modelos.length, carregarDependentes, carregarAssinaturas]);

  async function adicionarDependente(e: React.FormEvent) {
    e.preventDefault();
    if (!codFun) return;
    setSalvando(true);
    const r = await api(`/funcionarios/${codFun}/dependentes`, {
      metodo: "POST",
      corpo: {
        nomeDpd: form.nomeDpd,
        tipoDpd: form.tipoDpd,
        dtNasc: form.dtNasc || undefined,
        cgc: form.cgc || undefined,
      },
    });
    setSalvando(false);
    if (r.status !== 201) {
      alert("Não foi possível cadastrar o dependente.");
      return;
    }
    setForm({ nomeDpd: "", tipoDpd: "FILHO", dtNasc: "", cgc: "" });
    setDependentes(null);
    await carregarDependentes();
  }

  async function enviarDocumento() {
    if (!codFun || !codDocEnvio) return;
    setEnviandoDoc(true);
    const r = await api(`/funcionarios/${codFun}/assinaturas`, { metodo: "POST", corpo: { codDoc: codDocEnvio } });
    setEnviandoDoc(false);
    if (r.status !== 201) {
      alert("Não foi possível enviar o documento para assinatura.");
      return;
    }
    setCodDocEnvio("");
    setAssinaturas(null);
    await carregarAssinaturas();
  }

  return (
    <Gaveta
      titulo={funcionario ? funcionario.nomeFun : "Funcionário"}
      aberta={!!funcionario}
      fechar={fechar}
      largura={560}
    >
      {funcionario && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Matrícula {funcionario.numCad}</div>

          <Abas
            ativa={tab}
            aoMudar={setTab}
            abas={[
              { id: "dependentes", rotulo: "Dependentes" },
              { id: "historico", rotulo: "Histórico" },
              { id: "documentos", rotulo: "Documentos" },
              { id: "desenvolvimento", rotulo: "Desenvolvimento" },
            ]}
          />

          {tab === "dependentes" && (
            <div style={{ display: "grid", gap: 16 }}>
              {dependentes === null ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando...</p>
              ) : dependentes.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Nenhum dependente cadastrado.</p>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {dependentes.map((d) => (
                    <div
                      key={d.codDpd}
                      style={{
                        display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13,
                        padding: "8px 12px", background: "var(--surface-page)", borderRadius: 8,
                      }}
                    >
                      <span>
                        {d.nomeDpd} <span style={{ color: "var(--text-muted)" }}>· {d.tipoDpd}</span>
                      </span>
                      <span style={{ color: "var(--text-muted)" }}>
                        {d.dtNasc ? new Date(d.dtNasc).toLocaleDateString("pt-BR") : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={adicionarDependente} style={{ display: "grid", gap: 10, borderTop: "1px solid var(--border-default)", paddingTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Adicionar dependente</div>
                <Campo rotulo="Nome">
                  <Entrada required value={form.nomeDpd} onChange={(e) => setForm({ ...form, nomeDpd: e.target.value })} />
                </Campo>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Campo rotulo="Parentesco">
                    <Selecao value={form.tipoDpd} onChange={(e) => setForm({ ...form, tipoDpd: e.target.value })}>
                      {TIPOS_DEPENDENTE.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </Selecao>
                  </Campo>
                  <Campo rotulo="Nascimento">
                    <Entrada type="date" value={form.dtNasc} onChange={(e) => setForm({ ...form, dtNasc: e.target.value })} />
                  </Campo>
                </div>
                <Campo rotulo="CPF (opcional)">
                  <Entrada value={form.cgc} onChange={(e) => setForm({ ...form, cgc: e.target.value })} />
                </Campo>
                <BotaoPrimario type="submit" disabled={salvando}>
                  {salvando ? "Salvando..." : "Adicionar"}
                </BotaoPrimario>
              </form>
            </div>
          )}

          {tab === "historico" && (
            <div style={{ display: "grid", gap: 10 }}>
              {historico === null ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando...</p>
              ) : historico.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Sem mudanças registradas.</p>
              ) : (
                historico.map((ev) => (
                  <div key={ev.codFunHis} style={{ borderLeft: "2px solid var(--border-default)", paddingLeft: 10 }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {new Date(ev.dtMud).toLocaleDateString("pt-BR")}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{ROTULO_TIPO_MUD[ev.tipoMud] ?? ev.tipoMud}</div>
                    {(ev.valorAnt || ev.valorNovo) && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {ev.valorAnt ?? "—"} → {ev.valorNovo ?? "—"}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "documentos" && (
            <div style={{ display: "grid", gap: 16 }}>
              {assinaturas === null ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando...</p>
              ) : assinaturas.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Nenhum documento enviado para assinatura.</p>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {assinaturas.map((a) => (
                    <div
                      key={a.codAssin}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                        fontSize: 13, padding: "8px 12px", background: "var(--surface-page)", borderRadius: 8,
                      }}
                    >
                      <span>
                        {a.documento.nomeDoc}
                        <span style={{ color: a.status === "ASSINADO" ? "var(--green-700, #1D533B)" : "var(--amber-700, #714E08)" }}>
                          {" "}· {a.status === "ASSINADO" ? "assinado" : "pendente"}
                        </span>
                      </span>
                      {a.status !== "ASSINADO" && (
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/assinatura/${a.tokenPub}`;
                            navigator.clipboard.writeText(url).catch(() => {});
                            alert(`Link copiado:\n${url}`);
                          }}
                          style={{ border: "none", background: "none", color: "var(--text-link)", cursor: "pointer", fontFamily: "inherit", fontSize: 12, whiteSpace: "nowrap" }}
                        >
                          Copiar link
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "grid", gap: 10, borderTop: "1px solid var(--border-default)", paddingTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Enviar documento para assinatura</div>
                <Selecao value={codDocEnvio} onChange={(e) => setCodDocEnvio(e.target.value)}>
                  <option value="">— escolha um modelo —</option>
                  {modelos.map((m) => (
                    <option key={m.codDoc} value={m.codDoc}>{m.nomeDoc}</option>
                  ))}
                </Selecao>
                <BotaoPrimario onClick={enviarDocumento} disabled={!codDocEnvio || enviandoDoc}>
                  {enviandoDoc ? "Enviando..." : "Enviar para assinatura"}
                </BotaoPrimario>
              </div>
            </div>
          )}

          {tab === "desenvolvimento" && codFun && <PdiFuncionario codFun={codFun} />}
        </div>
      )}
    </Gaveta>
  );
}
