"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";

const TIPOS_360: { tipo: string; rotulo: string }[] = [
  { tipo: "AUTO", rotulo: "Autoavaliação" },
  { tipo: "GESTOR", rotulo: "Gestor" },
  { tipo: "PAR", rotulo: "Pares" },
  { tipo: "LIDERADO", rotulo: "Liderados" },
  { tipo: "COMITE", rotulo: "Comitê" },
  { tipo: "CLIENTE_INTERNO", rotulo: "Cliente interno" },
];
const ROTULO = Object.fromEntries(TIPOS_360.map((t) => [t.tipo, t.rotulo]));

interface ModeloResumo {
  codMod: string;
  nome: string;
  empresa: string | null;
  departamento: string | null;
  qtdColaboradores: number;
  tipos: string[];
  grau: string;
}

function escopoTexto(m: ModeloResumo): string {
  const partes: string[] = [];
  if (m.empresa) partes.push(m.empresa);
  if (m.departamento) partes.push(m.departamento);
  if (m.qtdColaboradores > 0) partes.push(`${m.qtdColaboradores} colaborador(es)`);
  return partes.length ? partes.join(" · ") : "Todo o grupo (padrão)";
}

export default function PaginaModelos360() {
  const [modelos, setModelos] = useState<ModeloResumo[] | null>(null);
  const [edit, setEdit] = useState<string | "novo" | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<ModeloResumo[]>("/gestao-pessoas/modelos-360");
    if (r.status === 200 && r.json) setModelos(r.json);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <main style={{ padding: 32, maxWidth: 860 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>Modelos de avaliação 360</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0, lineHeight: 1.6, maxWidth: 620 }}>
            Crie modelos customizáveis com escopo por empresa, departamento e colaboradores. Vale sempre o mais
            específico (colaborador › departamento › empresa › padrão). Ex.: o gestor de um time recebe um 270°
            por nome, os subordinados um 180° por departamento.
          </p>
        </div>
        <BotaoPrimario onClick={() => setEdit("novo")} style={{ flexShrink: 0 }}>Novo modelo</BotaoPrimario>
      </div>

      {modelos === null ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>
      ) : modelos.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 20 }}>
          Nenhum modelo ainda. Crie o primeiro — quem não for coberto usa avaliação de avaliador único.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          {modelos.map((m) => (
            <button
              key={m.codMod}
              onClick={() => setEdit(m.codMod)}
              style={{ textAlign: "left", border: "1px solid var(--border-default)", borderRadius: 10, padding: "14px 16px", background: "var(--surface-default)", cursor: "pointer", fontFamily: "inherit" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{m.nome}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-700)" }}>{m.grau}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {escopoTexto(m)} · {m.tipos.map((t) => ROTULO[t] ?? t).join(", ")}
              </div>
            </button>
          ))}
        </div>
      )}

      {edit && <EditorModelo360 codMod={edit === "novo" ? null : edit} fechar={() => setEdit(null)} aoSalvar={carregar} />}
    </main>
  );
}

interface Avaliador {
  tipo: string;
  peso: number;
  obrigatorio: boolean;
}
interface Opcao {
  cod: string;
  rotulo: string;
}
interface FuncOpcao {
  codFun: string;
  nomeFun: string;
  numCad: string;
}

function EditorModelo360({ codMod, fechar, aoSalvar }: { codMod: string | null; fechar: () => void; aoSalvar: () => void }) {
  const [nome, setNome] = useState("");
  const [codEmp, setCodEmp] = useState("");
  const [codDep, setCodDep] = useState("");
  const [sel, setSel] = useState<Record<string, Avaliador>>({});
  const [colabs, setColabs] = useState<string[]>([]);
  const [empresas, setEmpresas] = useState<Opcao[]>([]);
  const [deptos, setDeptos] = useState<Opcao[]>([]);
  const [funcs, setFuncs] = useState<FuncOpcao[]>([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    void Promise.all([
      api<{ codEmp: string; nomeFantasia: string }[]>("/empresas"),
      api<{ codDep: string; descrDep: string }[]>("/departamentos"),
      api<{ codFun: string; nomeFun: string; numCad: string }[]>("/funcionarios"),
    ]).then(([e, d, f]) => {
      if (e.json) setEmpresas(e.json.map((x) => ({ cod: String(x.codEmp), rotulo: x.nomeFantasia })));
      if (d.json) setDeptos(d.json.map((x) => ({ cod: String(x.codDep), rotulo: x.descrDep })));
      if (f.json) setFuncs(f.json.map((x) => ({ codFun: String(x.codFun), nomeFun: x.nomeFun, numCad: String(x.numCad) })));
    });
    if (codMod) {
      void api<{ nome: string; codEmp: string | null; codDep: string | null; avaliadores: Avaliador[]; colaboradores: { codFun: string }[] }>(
        `/gestao-pessoas/modelos-360/${codMod}`,
      ).then((r) => {
        if (r.status === 200 && r.json) {
          setNome(r.json.nome);
          setCodEmp(r.json.codEmp ? String(r.json.codEmp) : "");
          setCodDep(r.json.codDep ? String(r.json.codDep) : "");
          const m: Record<string, Avaliador> = {};
          for (const a of r.json.avaliadores) m[a.tipo] = a;
          setSel(m);
          setColabs(r.json.colaboradores.map((c) => String(c.codFun)));
        }
        setPronto(true);
      });
    } else {
      setPronto(true);
    }
  }, [codMod]);

  function alternar(tipo: string) {
    setSel((s) => {
      const n = { ...s };
      if (n[tipo]) delete n[tipo];
      else n[tipo] = { tipo, peso: 1, obrigatorio: true };
      return n;
    });
  }
  function alternarColab(codFun: string) {
    setColabs((c) => (c.includes(codFun) ? c.filter((x) => x !== codFun) : [...c, codFun]));
  }

  async function salvar() {
    setErro(null);
    if (!nome.trim()) return setErro("Dê um nome ao modelo.");
    const avaliadores = Object.values(sel);
    if (avaliadores.length === 0) return setErro("Escolha ao menos um tipo de avaliador.");
    const corpo = {
      nome,
      codEmp: codEmp || null,
      codDep: codDep || null,
      colaboradores: colabs,
      avaliadores: avaliadores.map((a) => ({ tipo: a.tipo, peso: a.peso, obrigatorio: a.obrigatorio })),
    };
    const r = codMod
      ? await api(`/gestao-pessoas/modelos-360/${codMod}`, { metodo: "PUT", corpo })
      : await api("/gestao-pessoas/modelos-360", { metodo: "POST", corpo });
    if (r.status !== 200 && r.status !== 201) return setErro("Não foi possível salvar.");
    fechar();
    aoSalvar();
  }

  async function remover() {
    if (!codMod) return;
    await api(`/gestao-pessoas/modelos-360/${codMod}/remover`, { metodo: "PATCH" });
    fechar();
    aoSalvar();
  }

  const funcsFiltrados = funcs.filter((f) => !busca || f.nomeFun.toLowerCase().includes(busca.toLowerCase()) || f.numCad.includes(busca));

  return (
    <Gaveta titulo={codMod ? "Editar modelo 360" : "Novo modelo 360"} aberta fechar={fechar} largura={520}>
      {!pronto ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <Campo rotulo="Nome do modelo">
            <Entrada value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Gestores — 270°" />
          </Campo>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Escopo</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Campo rotulo="Empresa">
                <Selecao value={codEmp} onChange={(e) => setCodEmp(e.target.value)}>
                  <option value="">Todas</option>
                  {empresas.map((o) => <option key={o.cod} value={o.cod}>{o.rotulo}</option>)}
                </Selecao>
              </Campo>
              <Campo rotulo="Departamento">
                <Selecao value={codDep} onChange={(e) => setCodDep(e.target.value)}>
                  <option value="">Todos</option>
                  {deptos.map((o) => <option key={o.cod} value={o.cod}>{o.rotulo}</option>)}
                </Selecao>
              </Campo>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0 0" }}>
              Deixe em branco para o escopo mais amplo. Colaboradores específicos abaixo têm a maior precedência.
            </p>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Colaboradores específicos (opcional)</div>
            <Entrada value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou matrícula" />
            <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--border-default)", borderRadius: 8, marginTop: 6 }}>
              {funcsFiltrados.slice(0, 50).map((f) => (
                <label key={f.codFun} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid var(--border-default)" }}>
                  <input type="checkbox" checked={colabs.includes(f.codFun)} onChange={() => alternarColab(f.codFun)} />
                  {f.nomeFun} <span style={{ color: "var(--text-muted)", fontSize: 11 }}>({f.numCad})</span>
                </label>
              ))}
              {funcsFiltrados.length === 0 && <div style={{ padding: 10, fontSize: 12, color: "var(--text-muted)" }}>Nenhum funcionário.</div>}
            </div>
            {colabs.length > 0 && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{colabs.length} selecionado(s)</div>}
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Avaliadores e pesos</div>
            <div style={{ display: "grid", gap: 8 }}>
              {TIPOS_360.map((t) => {
                const ativo = !!sel[t.tipo];
                return (
                  <div key={t.tipo} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--border-default)", borderRadius: 8, padding: "8px 12px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, cursor: "pointer", fontSize: 14 }}>
                      <input type="checkbox" checked={ativo} onChange={() => alternar(t.tipo)} />
                      {t.rotulo}
                    </label>
                    {ativo && (
                      <label style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                        peso
                        <select value={sel[t.tipo].peso} onChange={(e) => setSel({ ...sel, [t.tipo]: { ...sel[t.tipo], peso: Number(e.target.value) } })} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--surface-default)", color: "var(--text-body)", fontFamily: "inherit" }}>
                          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Erro mensagem={erro} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <BotaoPrimario onClick={salvar}>Salvar modelo</BotaoPrimario>
            {codMod && <button onClick={remover} style={{ background: "none", border: "none", color: "var(--feedback-danger, #b91c1c)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Remover modelo</button>}
          </div>
        </div>
      )}
    </Gaveta>
  );
}
