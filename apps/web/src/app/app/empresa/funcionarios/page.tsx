"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";
import { FuncionarioDrawer } from "@/componentes/funcionario-drawer";

interface Funcionario {
  codFun: string;
  numCad: string;
  nomeFun: string;
  situacao: string;
  dtAdm: string;
  empresa: { nomeFantasia: string };
  cargo: { nomeCar: string } | null;
  departamento: { descrDep: string } | null;
}
interface Opcao {
  codEmp?: string;
  nomeFantasia?: string;
  codCar?: string;
  nomeCar?: string;
  codDep?: string;
  descrDep?: string;
  codEmpMatriz?: string | null;
}

const celula: React.CSSProperties = { padding: "10px 14px" };

export default function PaginaFuncionarios() {
  const [lista, setLista] = useState<Funcionario[]>([]);
  const [empresas, setEmpresas] = useState<Opcao[]>([]);
  const [cargos, setCargos] = useState<Opcao[]>([]);
  const [departamentos, setDepartamentos] = useState<Opcao[]>([]);
  const [aberta, setAberta] = useState(false);
  const [detalhe, setDetalhe] = useState<{ codFun: string; nomeFun: string; numCad: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    codEmp: "",
    numCad: "",
    nomeFun: "",
    cgc: "",
    dtAdm: "",
    codCar: "",
    codDep: "",
    vlrSal: "",
  });

  const carregar = useCallback(async () => {
    const [f, e, c, d] = await Promise.all([
      api<Funcionario[]>("/funcionarios"),
      api<Opcao[]>("/empresas"),
      api<Opcao[]>("/cargos"),
      api<Opcao[]>("/departamentos"),
    ]);
    if (f.status === 200 && f.json) setLista(f.json);
    if (e.status === 200 && e.json) setEmpresas(e.json);
    if (c.status === 200 && c.json) setCargos(c.json);
    if (d.status === 200 && d.json) setDepartamentos(d.json);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const r = await api<{ codFun: string }>("/funcionarios", {
      metodo: "POST",
      corpo: {
        codEmp: form.codEmp,
        numCad: form.numCad,
        nomeFun: form.nomeFun,
        cgc: form.cgc || undefined,
        dtAdm: form.dtAdm,
        codCar: form.codCar || undefined,
        codDep: form.codDep || undefined,
        vlrSal: form.vlrSal ? Number(form.vlrSal) : undefined,
      },
    });
    setSalvando(false);
    if (r.status !== 201) {
      setErro(
        r.status === 403
          ? "Sem permissão para admitir funcionários."
          : "Não foi possível admitir — confira matrícula (única por empresa) e datas.",
      );
      return;
    }
    setAberta(false);
    setForm({ codEmp: "", numCad: "", nomeFun: "", cgc: "", dtAdm: "", codCar: "", codDep: "", vlrSal: "" });
    await carregar();
  }

  return (
    <main style={{ padding: 32 }}>
      <header style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Funcionários</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            {lista.length} funcionário(s) ativo(s) no grupo.
          </p>
        </div>
        <BotaoPrimario onClick={() => setAberta(true)}>Admitir funcionário</BotaoPrimario>
      </header>

      <div style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "var(--surface-page)", textAlign: "left" }}>
              <th style={{ ...celula, fontWeight: 600 }}>Matrícula</th>
              <th style={{ ...celula, fontWeight: 600 }}>Nome</th>
              <th style={{ ...celula, fontWeight: 600 }}>Empresa</th>
              <th style={{ ...celula, fontWeight: 600 }}>Cargo</th>
              <th style={{ ...celula, fontWeight: 600 }}>Departamento</th>
              <th style={{ ...celula, fontWeight: 600 }}>Admissão</th>
              <th style={{ ...celula, fontWeight: 600 }}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr
                key={f.codFun}
                onClick={() => setDetalhe({ codFun: f.codFun, nomeFun: f.nomeFun, numCad: f.numCad })}
                style={{ borderTop: "1px solid var(--border-default)", cursor: "pointer" }}
              >
                <td style={{ ...celula, fontFamily: "var(--font-mono)" }}>{f.numCad}</td>
                <td style={celula}>{f.nomeFun}</td>
                <td style={{ ...celula, color: "var(--text-muted)" }}>{f.empresa?.nomeFantasia}</td>
                <td style={celula}>{f.cargo?.nomeCar ?? "—"}</td>
                <td style={celula}>{f.departamento?.descrDep ?? "—"}</td>
                <td style={{ ...celula, fontFamily: "var(--font-mono)" }}>
                  {new Date(f.dtAdm).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                </td>
                <td style={celula}>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      background: f.situacao === "ATIVO" ? "var(--green-100, #D6E9DF)" : "var(--neutral-100)",
                      color: f.situacao === "ATIVO" ? "var(--green-700, #1D533B)" : "var(--text-muted)",
                    }}
                  >
                    {f.situacao}
                  </span>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 24, color: "var(--text-muted)", textAlign: "center" }}>
                  Nenhum funcionário ainda — clique em “Admitir funcionário” para começar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Gaveta titulo="Admitir funcionário" aberta={aberta} fechar={() => setAberta(false)}>
        <form onSubmit={salvar} style={{ display: "grid", gap: 14 }}>
          <Campo rotulo="Empresa/filial de lotação">
            <Selecao required value={form.codEmp} onChange={(e) => setForm({ ...form, codEmp: e.target.value })}>
              <option value="">— selecione —</option>
              {empresas.map((e) => (
                <option key={e.codEmp} value={e.codEmp}>
                  {e.nomeFantasia}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Matrícula (NUMCAD)">
            <Entrada required type="number" min={1} value={form.numCad} onChange={(e) => setForm({ ...form, numCad: e.target.value })} />
          </Campo>
          <Campo rotulo="Nome completo">
            <Entrada required value={form.nomeFun} onChange={(e) => setForm({ ...form, nomeFun: e.target.value })} />
          </Campo>
          <Campo rotulo="CPF (opcional)">
            <Entrada value={form.cgc} onChange={(e) => setForm({ ...form, cgc: e.target.value })} />
          </Campo>
          <Campo rotulo="Data de admissão">
            <Entrada required type="date" value={form.dtAdm} onChange={(e) => setForm({ ...form, dtAdm: e.target.value })} />
          </Campo>
          <Campo rotulo="Cargo (opcional)">
            <Selecao value={form.codCar} onChange={(e) => setForm({ ...form, codCar: e.target.value })}>
              <option value="">— sem cargo —</option>
              {cargos.map((c) => (
                <option key={c.codCar} value={c.codCar}>
                  {c.nomeCar}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Departamento (opcional)">
            <Selecao value={form.codDep} onChange={(e) => setForm({ ...form, codDep: e.target.value })}>
              <option value="">— sem departamento —</option>
              {departamentos.map((d) => (
                <option key={d.codDep} value={d.codDep}>
                  {d.descrDep}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Salário (opcional)">
            <Entrada type="number" step="0.01" min={0} value={form.vlrSal} onChange={(e) => setForm({ ...form, vlrSal: e.target.value })} />
          </Campo>
          <Erro mensagem={erro} />
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Admitindo..." : "Admitir"}
          </BotaoPrimario>
        </form>
      </Gaveta>

      <FuncionarioDrawer funcionario={detalhe} fechar={() => setDetalhe(null)} />
    </main>
  );
}
