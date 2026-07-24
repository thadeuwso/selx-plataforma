"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";

interface Cargo {
  codCar: string;
  nomeCar: string;
  cbo: string | null;
}
interface Departamento {
  codDep: string;
  descrDep: string;
  grau: number;
  codDepPai: string | null;
}

const celula: React.CSSProperties = { padding: "10px 14px" };
const caixa: React.CSSProperties = {
  background: "var(--surface-default)",
  border: "1px solid var(--border-default)",
  borderRadius: 10,
  overflow: "hidden",
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
        fontFamily: "inherit", fontSize: "inherit",
        fontWeight: ativa ? 600 : 400,
        color: ativa ? "var(--text-body)" : "var(--text-muted)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function PaginaOrganizacao() {
  const [aba, setAba] = useState<"departamentos" | "cargos">("departamentos");
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [gaveta, setGaveta] = useState<"cargo" | "departamento" | null>(null);
  const [editCargo, setEditCargo] = useState<Cargo | null>(null);
  const [editDep, setEditDep] = useState<Departamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [formCargo, setFormCargo] = useState({ nomeCar: "", cbo: "" });
  const [formDep, setFormDep] = useState({ descrDep: "", codDepPai: "" });

  function abrirCargo(c?: Cargo) {
    setEditCargo(c ?? null);
    setFormCargo({ nomeCar: c?.nomeCar ?? "", cbo: c?.cbo ?? "" });
    setErro(null);
    setGaveta("cargo");
  }
  function abrirDep(d?: Departamento) {
    setEditDep(d ?? null);
    setFormDep({ descrDep: d?.descrDep ?? "", codDepPai: d?.codDepPai ?? "" });
    setErro(null);
    setGaveta("departamento");
  }

  const carregar = useCallback(async () => {
    const [c, d] = await Promise.all([api<Cargo[]>("/cargos"), api<Departamento[]>("/departamentos")]);
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
    const r =
      gaveta === "cargo"
        ? editCargo
          ? await api(`/cargos/${editCargo.codCar}`, { metodo: "PATCH", corpo: { nomeCar: formCargo.nomeCar, cbo: formCargo.cbo || undefined } })
          : await api("/cargos", { metodo: "POST", corpo: { nomeCar: formCargo.nomeCar, cbo: formCargo.cbo || undefined } })
        : editDep
          ? await api(`/departamentos/${editDep.codDep}`, { metodo: "PATCH", corpo: { descrDep: formDep.descrDep, codDepPai: formDep.codDepPai || null } })
          : await api("/departamentos", { metodo: "POST", corpo: { descrDep: formDep.descrDep, codDepPai: formDep.codDepPai || undefined } });
    setSalvando(false);
    if (r.status !== 201 && r.status !== 200) {
      setErro(r.status === 403 ? "Sem permissão (core.funcionarios.editar)." : "Não foi possível salvar — nomes são únicos.");
      return;
    }
    setGaveta(null);
    setFormCargo({ nomeCar: "", cbo: "" });
    setFormDep({ descrDep: "", codDepPai: "" });
    await carregar();
  }

  return (
    <main style={{ padding: 32, display: "grid", gap: 20, alignContent: "start" }}>
      <header>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Organização</h1>
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border-default)", marginTop: 16 }}>
          <Aba ativa={aba === "departamentos"} aoClicar={() => setAba("departamentos")}>
            Departamentos ({departamentos.length})
          </Aba>
          <Aba ativa={aba === "cargos"} aoClicar={() => setAba("cargos")}>
            Cargos ({cargos.length})
          </Aba>
        </div>
      </header>

      {aba === "departamentos" && (
      <section>
        <header style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
            Estrutura hierárquica — espelho da TFPDEP do Sankhya.
          </p>
          <BotaoPrimario onClick={() => abrirDep()}>Novo departamento</BotaoPrimario>
        </header>
        <div style={caixa}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--surface-page)", textAlign: "left" }}>
                <th style={{ ...celula, fontWeight: 600 }}>Código</th>
                <th style={{ ...celula, fontWeight: 600 }}>Descrição</th>
                <th style={{ ...celula, fontWeight: 600 }}>Grau</th>
              </tr>
            </thead>
            <tbody>
              {departamentos.map((d) => (
                <tr key={d.codDep} onClick={() => abrirDep(d)} style={{ borderTop: "1px solid var(--border-default)", cursor: "pointer" }}>
                  <td style={{ ...celula, fontFamily: "var(--font-mono)" }}>{d.codDep}</td>
                  <td style={celula}>
                    <span style={{ paddingLeft: (d.grau - 1) * 18 }}>{d.grau > 1 ? "└ " : ""}{d.descrDep}</span>
                  </td>
                  <td style={{ ...celula, fontFamily: "var(--font-mono)" }}>{d.grau}</td>
                </tr>
              ))}
              {departamentos.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 20, color: "var(--text-muted)", textAlign: "center" }}>
                    Nenhum departamento ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {aba === "cargos" && (
      <section>
        <header style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
            Espelho da TFPCAR do Sankhya.
          </p>
          <BotaoPrimario onClick={() => abrirCargo()}>Novo cargo</BotaoPrimario>
        </header>
        <div style={caixa}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--surface-page)", textAlign: "left" }}>
                <th style={{ ...celula, fontWeight: 600 }}>Código</th>
                <th style={{ ...celula, fontWeight: 600 }}>Nome</th>
                <th style={{ ...celula, fontWeight: 600 }}>CBO</th>
              </tr>
            </thead>
            <tbody>
              {cargos.map((c) => (
                <tr key={c.codCar} onClick={() => abrirCargo(c)} style={{ borderTop: "1px solid var(--border-default)", cursor: "pointer" }}>
                  <td style={{ ...celula, fontFamily: "var(--font-mono)" }}>{c.codCar}</td>
                  <td style={celula}>{c.nomeCar}</td>
                  <td style={{ ...celula, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{c.cbo ?? "—"}</td>
                </tr>
              ))}
              {cargos.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 20, color: "var(--text-muted)", textAlign: "center" }}>
                    Nenhum cargo ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      <Gaveta titulo={editDep ? "Editar departamento" : "Novo departamento"} aberta={gaveta === "departamento"} fechar={() => setGaveta(null)}>
        <form onSubmit={salvar} style={{ display: "grid", gap: 14 }}>
          <Campo rotulo="Descrição">
            <Entrada required value={formDep.descrDep} onChange={(e) => setFormDep({ ...formDep, descrDep: e.target.value })} />
          </Campo>
          <Campo rotulo="Departamento pai (opcional)">
            <Selecao value={formDep.codDepPai} onChange={(e) => setFormDep({ ...formDep, codDepPai: e.target.value })}>
              <option value="">— raiz —</option>
              {departamentos.filter((d) => d.codDep !== editDep?.codDep).map((d) => (
                <option key={d.codDep} value={d.codDep}>
                  {d.descrDep}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Erro mensagem={erro} />
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : editDep ? "Salvar" : "Criar departamento"}
          </BotaoPrimario>
        </form>
      </Gaveta>

      <Gaveta titulo={editCargo ? "Editar cargo" : "Novo cargo"} aberta={gaveta === "cargo"} fechar={() => setGaveta(null)}>
        <form onSubmit={salvar} style={{ display: "grid", gap: 14 }}>
          <Campo rotulo="Nome do cargo">
            <Entrada required value={formCargo.nomeCar} onChange={(e) => setFormCargo({ ...formCargo, nomeCar: e.target.value })} />
          </Campo>
          <Campo rotulo="CBO (opcional)">
            <Entrada value={formCargo.cbo} onChange={(e) => setFormCargo({ ...formCargo, cbo: e.target.value })} />
          </Campo>
          <Erro mensagem={erro} />
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : editCargo ? "Salvar" : "Criar cargo"}
          </BotaoPrimario>
        </form>
      </Gaveta>
    </main>
  );
}
