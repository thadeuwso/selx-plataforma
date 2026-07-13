"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";

interface Candidatura {
  codCdt: string;
  estagio: string;
  dhInc: string;
  candidato: { codCand: string; nomeCand: string; email: string; cidade: string | null };
  canal: { nomeCanal: string };
  match: { scoreGeral: number } | null;
}
interface Vaga {
  codVag: string;
  titulo: string;
  status: string;
}
interface Canal {
  codCanal: string;
  nomeCanal: string;
}

const ESTAGIOS: { chave: string; rotulo: string }[] = [
  { chave: "applied", rotulo: "Recebidas" },
  { chave: "screening", rotulo: "Triagem" },
  { chave: "analysis", rotulo: "Análise" },
  { chave: "shortlist", rotulo: "Shortlist" },
  { chave: "interview", rotulo: "Entrevista" },
  { chave: "offer", rotulo: "Proposta" },
  { chave: "hired", rotulo: "Contratado" },
];
const ESTAGIOS_TERMINAIS = [
  { chave: "knockout", rotulo: "Eliminado (triagem)" },
  { chave: "not_selected", rotulo: "Não selecionado" },
  { chave: "rejected", rotulo: "Rejeitado" },
  { chave: "approved", rotulo: "Aprovado" },
  { chave: "archived", rotulo: "Arquivado" },
];
const TODOS_ESTAGIOS = [...ESTAGIOS, ...ESTAGIOS_TERMINAIS];
const rotuloEstagio = (chave: string) => TODOS_ESTAGIOS.find((e) => e.chave === chave)?.rotulo ?? chave;

export default function PipelineVaga() {
  const { codVag } = useParams<{ codVag: string }>();
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [canais, setCanais] = useState<Canal[]>([]);
  const [aberta, setAberta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nomeCand: "", email: "", codCanal: "" });

  const carregar = useCallback(async () => {
    const [v, c, ca] = await Promise.all([
      api<Vaga>(`/vagas/${codVag}`),
      api<Candidatura[]>(`/vagas/${codVag}/candidaturas`),
      api<Canal[]>("/canais"),
    ]);
    if (v.status === 200 && v.json) setVaga(v.json);
    if (c.status === 200 && c.json) setCandidaturas(c.json);
    if (ca.status === 200 && ca.json) setCanais(ca.json);
  }, [codVag]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function moverEstagio(codCdt: string, estagio: string) {
    await api(`/candidaturas/${codCdt}/estagio`, { metodo: "PATCH", corpo: { estagio } });
    await carregar();
  }

  async function candidatar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const r = await api(`/vagas/${codVag}/candidaturas`, {
      metodo: "POST",
      corpo: { candidato: { nomeCand: form.nomeCand, email: form.email }, codCanal: form.codCanal },
    });
    setSalvando(false);
    if (r.status !== 201) {
      setErro(r.status === 400 ? "Vaga precisa estar ABERTA para receber candidaturas." : "Não foi possível registrar a candidatura.");
      return;
    }
    setAberta(false);
    setForm({ nomeCand: "", email: "", codCanal: "" });
    await carregar();
  }

  if (!vaga) return null;

  return (
    <main style={{ padding: 32 }}>
      <header style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{vaga.titulo}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Pipeline · {candidaturas.length} candidatura(s)
          </p>
        </div>
        <BotaoPrimario onClick={() => setAberta(true)} disabled={vaga.status !== "ABERTA"}>
          Nova candidatura
        </BotaoPrimario>
      </header>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {ESTAGIOS.map((col) => {
          const itens = candidaturas.filter((c) => c.estagio === col.chave);
          return (
            <div
              key={col.chave}
              style={{
                minWidth: 240,
                background: "var(--surface-page)",
                border: "1px solid var(--border-default)",
                borderRadius: 10,
                padding: 10,
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                {col.rotulo}
                <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{itens.length}</span>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {itens.map((c) => (
                  <div
                    key={c.codCdt}
                    style={{
                      background: "var(--surface-default)",
                      border: "1px solid var(--border-default)",
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{c.candidato.nomeCand}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{c.candidato.email}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
                      via {c.canal.nomeCanal}
                      {c.match && ` · score ${c.match.scoreGeral}`}
                    </div>
                    <Selecao
                      value={c.estagio}
                      onChange={(e) => moverEstagio(c.codCdt, e.target.value)}
                      style={{ marginTop: 8, fontSize: 12, padding: "4px 6px" }}
                    >
                      {TODOS_ESTAGIOS.map((e) => (
                        <option key={e.chave} value={e.chave}>{e.rotulo}</option>
                      ))}
                    </Selecao>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {candidaturas.some((c) => ESTAGIOS_TERMINAIS.some((e) => e.chave === c.estagio)) && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-muted)" }}>Encerradas</div>
          <div style={{ display: "grid", gap: 6 }}>
            {candidaturas
              .filter((c) => ESTAGIOS_TERMINAIS.some((e) => e.chave === c.estagio))
              .map((c) => (
                <div
                  key={c.codCdt}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "var(--surface-default)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  <span>{c.candidato.nomeCand}</span>
                  <span style={{ color: "var(--text-muted)" }}>{rotuloEstagio(c.estagio)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <Gaveta titulo="Nova candidatura" aberta={aberta} fechar={() => setAberta(false)}>
        <form onSubmit={candidatar} style={{ display: "grid", gap: 14 }}>
          <Campo rotulo="Nome do candidato">
            <Entrada required value={form.nomeCand} onChange={(e) => setForm({ ...form, nomeCand: e.target.value })} />
          </Campo>
          <Campo rotulo="E-mail">
            <Entrada required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Campo>
          <Campo rotulo="Canal de origem">
            <Selecao required value={form.codCanal} onChange={(e) => setForm({ ...form, codCanal: e.target.value })}>
              <option value="">— selecione —</option>
              {canais.map((c) => (
                <option key={c.codCanal} value={c.codCanal}>{c.nomeCanal}</option>
              ))}
            </Selecao>
          </Campo>
          <Erro mensagem={erro} />
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Registrando..." : "Registrar candidatura"}
          </BotaoPrimario>
        </form>
      </Gaveta>
    </main>
  );
}
