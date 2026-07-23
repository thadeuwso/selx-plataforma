"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Erro, Gaveta } from "@/componentes/formulario";

interface Cargo {
  codCar: string;
  nomeCar: string;
}
interface CompEsperada {
  nome: string;
  nivelEsperado: number;
  criticidade: string;
}

export default function PaginaCompetenciasCargo() {
  const [cargos, setCargos] = useState<Cargo[] | null>(null);
  const [edit, setEdit] = useState<Cargo | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<Cargo[]>("/cargos");
    if (r.status === 200 && r.json) setCargos(r.json);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <main style={{ padding: 32, maxWidth: 820 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>Competências do cargo</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 20px", lineHeight: 1.6, maxWidth: 640 }}>
        O nível esperado de cada competência, por cargo. A aderência ao cargo compara com a nota atual do
        colaborador (pelo nome da competência).
      </p>

      {cargos === null ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>
      ) : cargos.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Nenhum cargo cadastrado ainda.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {cargos.map((c) => (
            <button
              key={c.codCar}
              onClick={() => setEdit(c)}
              style={{ textAlign: "left", border: "1px solid var(--border-default)", borderRadius: 10, padding: "14px 16px", background: "var(--surface-default)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600 }}
            >
              {c.nomeCar}
            </button>
          ))}
        </div>
      )}

      {edit && <EditorCompetencias cargo={edit} fechar={() => setEdit(null)} />}
    </main>
  );
}

function EditorCompetencias({ cargo, fechar }: { cargo: Cargo; fechar: () => void }) {
  const [comps, setComps] = useState<CompEsperada[]>([]);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    void api<{ competencias: CompEsperada[] }>(`/gestao-pessoas/cargos/${cargo.codCar}/competencias-esperadas`).then((r) => {
      if (r.status === 200 && r.json) setComps(r.json.competencias);
      setPronto(true);
    });
  }, [cargo.codCar]);

  async function salvar() {
    setErro(null);
    setSalvo(false);
    const validas = comps.filter((c) => c.nome.trim());
    const r = await api(`/gestao-pessoas/cargos/${cargo.codCar}/competencias-esperadas`, {
      metodo: "PUT",
      corpo: { competencias: validas.map((c) => ({ nome: c.nome, nivelEsperado: c.nivelEsperado, criticidade: c.criticidade })) },
    });
    if (r.status !== 200) return setErro("Não foi possível salvar.");
    setSalvo(true);
  }

  return (
    <Gaveta titulo={`Competências — ${cargo.nomeCar}`} aberta fechar={fechar} largura={460}>
      {!pronto ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Nome, nível esperado (1–5) e criticidade.</p>
          {comps.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                value={c.nome}
                onChange={(e) => setComps(comps.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
                placeholder="Competência"
                style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--surface-default)", color: "var(--text-body)", fontFamily: "inherit", fontSize: 13 }}
              />
              <select value={c.nivelEsperado} onChange={(e) => setComps(comps.map((x, j) => (j === i ? { ...x, nivelEsperado: Number(e.target.value) } : x)))} title="Nível esperado" style={selectMini}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={c.criticidade} onChange={(e) => setComps(comps.map((x, j) => (j === i ? { ...x, criticidade: e.target.value } : x)))} title="Criticidade" style={selectMini}>
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
              </select>
              <button onClick={() => setComps(comps.filter((_, j) => j !== i))} title="Remover" style={{ ...selectMini, cursor: "pointer" }}>✕</button>
            </div>
          ))}
          <button onClick={() => setComps([...comps, { nome: "", nivelEsperado: 4, criticidade: "MEDIA" }])} style={{ background: "none", border: "none", color: "var(--text-link)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, padding: 0, justifySelf: "start" }}>
            + Adicionar competência
          </button>
          <Erro mensagem={erro} />
          <div>
            <BotaoPrimario onClick={salvar}>Salvar</BotaoPrimario>
            {salvo && <span style={{ fontSize: 12, color: "var(--feedback-success, #15803d)", marginLeft: 10 }}>Salvo.</span>}
          </div>
        </div>
      )}
    </Gaveta>
  );
}

const selectMini: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid var(--border-default)",
  background: "var(--surface-default)",
  color: "var(--text-body)",
  fontFamily: "inherit",
  fontSize: 13,
};
