"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Selecao } from "@/componentes/formulario";

interface Detalhe {
  codFun: string;
  numCad: string;
  nomeFun: string;
  email: string | null;
  cgc: string | null;
  dtNasc: string | null;
  dtAdm: string;
  codCar: string | null;
  codDep: string | null;
  tipoContrato: string;
  vlrSal: string | null;
  situacao: string;
  empresa: { codEmp: string; nomeFantasia: string } | null;
}
interface Opcao {
  cod: string;
  rotulo: string;
}

const SITUACOES = [
  { v: "ATIVO", r: "Ativo" },
  { v: "AFASTADO", r: "Afastado" },
  { v: "FERIAS", r: "Férias" },
  { v: "DESLIGADO", r: "Desligado" },
];
const dataInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");

/**
 * Dados cadastrais do funcionário — edição do que antes só se via. Mudança de
 * cargo, departamento, situação ou salário registra evento de vida no backend.
 */
export function DadosFuncionario({ codFun, aoSalvar }: { codFun: string; aoSalvar?: () => void }) {
  const [d, setD] = useState<Detalhe | null>(null);
  const [cargos, setCargos] = useState<Opcao[]>([]);
  const [deptos, setDeptos] = useState<Opcao[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setSalvo(false);
    void api<Detalhe>(`/funcionarios/${codFun}`).then((r) => r.status === 200 && r.json && setD(r.json));
    void api<{ codCar: string; nomeCar: string }[]>("/cargos").then((r) => r.json && setCargos(r.json.map((x) => ({ cod: String(x.codCar), rotulo: x.nomeCar }))));
    void api<{ codDep: string; descrDep: string }[]>("/departamentos").then((r) => r.json && setDeptos(r.json.map((x) => ({ cod: String(x.codDep), rotulo: x.descrDep }))));
  }, [codFun]);

  if (!d) return <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>;

  function set<K extends keyof Detalhe>(campo: K, valor: Detalhe[K]) {
    setD((atual) => (atual ? { ...atual, [campo]: valor } : atual));
    setSalvo(false);
  }

  async function salvar() {
    if (!d) return;
    setErro(null);
    if (!d.nomeFun.trim()) return setErro("Informe o nome.");
    setSalvando(true);
    const r = await api(`/funcionarios/${codFun}`, {
      metodo: "PATCH",
      corpo: {
        nomeFun: d.nomeFun,
        email: d.email || null,
        cgc: d.cgc || null,
        dtNasc: d.dtNasc || null,
        codCar: d.codCar || null,
        codDep: d.codDep || null,
        tipoContrato: d.tipoContrato,
        vlrSal: d.vlrSal ? Number(d.vlrSal) : null,
        situacao: d.situacao,
      },
    });
    setSalvando(false);
    if (r.status !== 200) return setErro("Não foi possível salvar.");
    setSalvo(true);
    aoSalvar?.();
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        {d.empresa?.nomeFantasia ?? "—"} · admitido em {new Date(d.dtAdm).toLocaleDateString("pt-BR")}
      </div>

      <Campo rotulo="Nome">
        <Entrada value={d.nomeFun} onChange={(e) => set("nomeFun", e.target.value)} />
      </Campo>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Campo rotulo="Cargo">
          <Selecao value={d.codCar ?? ""} onChange={(e) => set("codCar", e.target.value || null)}>
            <option value="">—</option>
            {cargos.map((o) => <option key={o.cod} value={o.cod}>{o.rotulo}</option>)}
          </Selecao>
        </Campo>
        <Campo rotulo="Departamento">
          <Selecao value={d.codDep ?? ""} onChange={(e) => set("codDep", e.target.value || null)}>
            <option value="">—</option>
            {deptos.map((o) => <option key={o.cod} value={o.cod}>{o.rotulo}</option>)}
          </Selecao>
        </Campo>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Campo rotulo="Situação">
          <Selecao value={d.situacao} onChange={(e) => set("situacao", e.target.value)}>
            {SITUACOES.map((s) => <option key={s.v} value={s.v}>{s.r}</option>)}
          </Selecao>
        </Campo>
        <Campo rotulo="Tipo de contrato">
          <Entrada value={d.tipoContrato} onChange={(e) => set("tipoContrato", e.target.value)} />
        </Campo>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Campo rotulo="Nascimento">
          <Entrada type="date" value={dataInput(d.dtNasc)} onChange={(e) => set("dtNasc", e.target.value || null)} />
        </Campo>
        <Campo rotulo="Salário (R$)">
          <Entrada type="number" step="0.01" value={d.vlrSal ?? ""} onChange={(e) => set("vlrSal", e.target.value || null)} />
        </Campo>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Campo rotulo="E-mail">
          <Entrada value={d.email ?? ""} onChange={(e) => set("email", e.target.value || null)} />
        </Campo>
        <Campo rotulo="CPF/CNPJ">
          <Entrada value={d.cgc ?? ""} onChange={(e) => set("cgc", e.target.value || null)} />
        </Campo>
      </div>

      <Erro mensagem={erro} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <BotaoPrimario onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar dados"}</BotaoPrimario>
        {salvo && <span style={{ fontSize: 12, color: "var(--feedback-success, #15803d)" }}>Salvo. Mudanças de cargo/departamento/situação entram no histórico.</span>}
      </div>
    </div>
  );
}
