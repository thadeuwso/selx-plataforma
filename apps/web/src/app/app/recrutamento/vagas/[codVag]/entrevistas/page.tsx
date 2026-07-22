"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";
import { useVagaContexto } from "@/componentes/recrutamento-compartilhado";

interface Horario {
  codHor: string;
  dhInicio: string;
  duracaoMin: number;
  tipo: string;
  local: string | null;
  linkReuniao: string | null;
}
interface Entrevista {
  codEntrev: string;
  dhInicio: string;
  duracaoMin: number;
  tipo: string;
  local: string | null;
  linkReuniao: string | null;
  status: string;
  candidatura: { codCdt: string; estagio: string; candidato: { nomeCand: string; email: string } };
  entrevistador: { codUsu: string; nomeUsu: string } | null;
}

const ROTULO_TIPO: Record<string, string> = { VIDEO: "Vídeo", PRESENCIAL: "Presencial", TELEFONE: "Telefone" };
const ROTULO_STATUS: Record<string, { texto: string; cor: string }> = {
  REALIZADA: { texto: "Realizada", cor: "var(--feedback-success, #15803d)" },
  CANCELADA: { texto: "Cancelada", cor: "var(--text-muted)" },
  NAO_COMPARECEU: { texto: "Não compareceu", cor: "var(--feedback-danger, #b91c1c)" },
};

const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

const cartao: React.CSSProperties = { border: "1px solid var(--border-default)", borderRadius: 10, padding: 14 };
const botaoAcao: React.CSSProperties = {
  padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border-default)",
  background: "var(--surface-default)", color: "var(--text-body)", fontSize: 12,
  cursor: "pointer", fontFamily: "inherit",
};

/**
 * Agenda de entrevistas da vaga (RN-REC-015).
 *
 * Esta aba era a lista de quem estava no estágio "interview" — nada além disso.
 * Agora mostra a agenda de verdade e a grade de horários que o candidato
 * escolhe pelo portal.
 */
export default function EntrevistasVaga() {
  const { codVag } = useParams<{ codVag: string }>();
  const { recarregarToken, pedirRecarga } = useVagaContexto();
  const [entrevistas, setEntrevistas] = useState<Entrevista[]>([]);
  const [livres, setLivres] = useState<Horario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ data: "", horarios: "", duracaoMin: "45", tipo: "VIDEO", local: "", linkReuniao: "" });

  const carregar = useCallback(async () => {
    const r = await api<{ entrevistas: Entrevista[]; horariosLivres: Horario[] }>(`/vagas/${codVag}/entrevistas`);
    if (r.status === 200 && r.json) {
      setEntrevistas(r.json.entrevistas);
      setLivres(r.json.horariosLivres);
    }
    setCarregando(false);
  }, [codVag]);

  useEffect(() => {
    void carregar();
  }, [carregar, recarregarToken]);

  /**
   * Abre vários horários de uma vez, a partir de uma data e de uma lista de
   * horas ("09:00, 10:00"). Um a um seria inviável para uma agenda real — o
   * 1.0 tinha uma grade justamente por isso.
   */
  async function abrirHorarios(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const horas = form.horarios.split(",").map((h) => h.trim()).filter(Boolean);
    if (!form.data || horas.length === 0) {
      setErro("Informe a data e ao menos um horário.");
      return;
    }
    setSalvando(true);
    const r = await api(`/vagas/${codVag}/entrevistas/horarios`, {
      metodo: "POST",
      corpo: {
        horarios: horas.map((h) => ({
          dhInicio: new Date(`${form.data}T${h}`).toISOString(),
          duracaoMin: Number(form.duracaoMin),
          tipo: form.tipo,
          local: form.local || undefined,
          linkReuniao: form.linkReuniao || undefined,
        })),
      },
    });
    setSalvando(false);
    if (r.status !== 201) {
      setErro("Não foi possível abrir os horários. Confira a data e as horas informadas.");
      return;
    }
    setAberta(false);
    setForm({ ...form, horarios: "" });
    await carregar();
  }

  async function cancelarHorario(codHor: string) {
    await api(`/entrevistas/horarios/${codHor}/cancelar`, { metodo: "PATCH" });
    await carregar();
  }

  async function mudarStatus(codEntrev: string, status: string) {
    await api(`/entrevistas/${codEntrev}`, { metodo: "PATCH", corpo: { status } });
    await carregar();
    pedirRecarga();
  }

  const marcadas = entrevistas.filter((e) => e.status === "AGENDADA");
  const encerradas = entrevistas.filter((e) => e.status !== "AGENDADA");

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16 }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, maxWidth: 640, lineHeight: 1.55 }}>
          Abra horários e o candidato escolhe o que couber na agenda dele, pelo portal — sem a troca
          de mensagens para acertar data. Para marcar um horário específico, use "Marcar entrevista" no painel do candidato.
        </p>
        <BotaoPrimario onClick={() => setAberta(true)} style={{ flexShrink: 0 }}>Abrir horários</BotaoPrimario>
      </header>

      {carregando ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando…</p>
      ) : (
        <>
          <section>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 8px" }}>Entrevistas marcadas ({marcadas.length})</h3>
            {marcadas.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhuma entrevista marcada nesta vaga.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {marcadas.map((e) => (
                  <div key={e.codEntrev} style={{ ...cartao, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{e.candidatura.candidato.nomeCand}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {quando(e.dhInicio)} · {e.duracaoMin} min · {ROTULO_TIPO[e.tipo] ?? e.tipo}
                        {e.local ? ` · ${e.local}` : ""}
                        {e.entrevistador ? ` · com ${e.entrevistador.nomeUsu}` : ""}
                      </div>
                      {e.linkReuniao && (
                        <a href={e.linkReuniao} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--text-link)" }}>
                          {e.linkReuniao}
                        </a>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => mudarStatus(e.codEntrev, "REALIZADA")} style={botaoAcao}>Realizada</button>
                      <button onClick={() => mudarStatus(e.codEntrev, "NAO_COMPARECEU")} style={botaoAcao}>Não veio</button>
                      <button onClick={() => mudarStatus(e.codEntrev, "CANCELADA")} style={botaoAcao}>Cancelar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>
              Horários abertos, ainda sem candidato ({livres.length})
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 8px" }}>
              Ficam visíveis para quem você convidar a escolher, no painel do candidato.
            </p>
            {livres.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhum horário aberto.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 8 }}>
                {livres.map((h) => (
                  <div key={h.codHor} style={{ ...cartao, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{quando(h.dhInicio)}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {h.duracaoMin} min · {ROTULO_TIPO[h.tipo] ?? h.tipo}
                      </div>
                    </div>
                    <button onClick={() => cancelarHorario(h.codHor)} style={{ ...botaoAcao, padding: "4px 8px" }}>
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {encerradas.length > 0 && (
            <section>
              <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 8px" }}>Encerradas ({encerradas.length})</h3>
              <div style={{ display: "grid", gap: 6 }}>
                {encerradas.map((e) => (
                  <div
                    key={e.codEntrev}
                    style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--border-default)" }}
                  >
                    <span>{e.candidatura.candidato.nomeCand} · {quando(e.dhInicio)}</span>
                    <span style={{ color: ROTULO_STATUS[e.status]?.cor, fontSize: 12 }}>
                      {ROTULO_STATUS[e.status]?.texto ?? e.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <Gaveta titulo="Abrir horários de entrevista" aberta={aberta} fechar={() => setAberta(false)}>
        <form onSubmit={abrirHorarios} style={{ display: "grid", gap: 14 }}>
          <Campo rotulo="Data">
            <Entrada type="date" required value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </Campo>
          <Campo rotulo="Horários (separados por vírgula)">
            <Entrada
              placeholder="09:00, 10:00, 14:30"
              required
              value={form.horarios}
              onChange={(e) => setForm({ ...form, horarios: e.target.value })}
            />
          </Campo>
          <Campo rotulo="Duração (minutos)">
            <Entrada type="number" min={5} max={480} value={form.duracaoMin} onChange={(e) => setForm({ ...form, duracaoMin: e.target.value })} />
          </Campo>
          <Campo rotulo="Formato">
            <Selecao value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="VIDEO">Vídeo</option>
              <option value="PRESENCIAL">Presencial</option>
              <option value="TELEFONE">Telefone</option>
            </Selecao>
          </Campo>
          {form.tipo === "PRESENCIAL" && (
            <Campo rotulo="Local">
              <Entrada value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} />
            </Campo>
          )}
          {form.tipo === "VIDEO" && (
            <Campo rotulo="Link da reunião">
              <Entrada placeholder="https://…" value={form.linkReuniao} onChange={(e) => setForm({ ...form, linkReuniao: e.target.value })} />
            </Campo>
          )}
          <Erro mensagem={erro} />
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Abrindo…" : "Abrir horários"}
          </BotaoPrimario>
        </form>
      </Gaveta>
    </div>
  );
}
