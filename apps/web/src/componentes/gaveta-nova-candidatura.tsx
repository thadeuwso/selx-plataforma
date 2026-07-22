"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "./formulario";

const DIMENSOES_CULTURA = [
  { chave: "autonomy", rotulo: "Autonomia" },
  { chave: "pace", rotulo: "Ritmo" },
  { chave: "collaboration", rotulo: "Colaboração" },
  { chave: "structure", rotulo: "Estrutura" },
  { chave: "dataDriven", rotulo: "Orientação a dados" },
  { chave: "directCommunication", rotulo: "Comunicação direta" },
] as const;

interface Canal {
  codCanal: string;
  nomeCanal: string;
}

export function GavetaNovaCandidatura({
  codVag,
  aberta,
  fechar,
  vagaAberta,
  perguntas,
  requisitos,
  aoRegistrar,
}: {
  codVag: string;
  aberta: boolean;
  fechar: () => void;
  vagaAberta: boolean;
  perguntas: { codVagPer: string; pergunta: string }[];
  requisitos: { codVagReq: string; descrReq: string; nivelEsperado: number | null; tempoEspMeses: number | null }[];
  aoRegistrar: () => void;
}) {
  const [canais, setCanais] = useState<Canal[]>([]);
  const [form, setForm] = useState({ nomeCand: "", email: "", cargoAtual: "", codCanal: "" });
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [autoavaliacao, setAutoavaliacao] = useState<Record<string, { nivel: string; tempoMeses: string; evidenciaTexto: string }>>({});
  const [perfilCultural, setPerfilCultural] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberta) void api<Canal[]>("/canais").then((r) => { if (r.status === 200 && r.json) setCanais(r.json); });
  }, [aberta]);

  async function candidatar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const autoavaliacaoCorpo = Object.fromEntries(
      Object.entries(autoavaliacao)
        .filter(([, v]) => v.nivel || v.tempoMeses || v.evidenciaTexto)
        .map(([codVagReq, v]) => [codVagReq, {
          nivel: v.nivel ? Number(v.nivel) : undefined,
          tempoMeses: v.tempoMeses ? Number(v.tempoMeses) : undefined,
          evidenciaTexto: v.evidenciaTexto || undefined,
        }]),
    );
    const perfilCulturalCorpo = Object.fromEntries(
      Object.entries(perfilCultural).filter(([, v]) => v.trim()).map(([k, v]) => [k, Number(v)]),
    );
    const r = await api<{ sinalizadoKnockout?: boolean }>(`/vagas/${codVag}/candidaturas`, {
      metodo: "POST",
      corpo: {
        candidato: { nomeCand: form.nomeCand, email: form.email, cargoAtual: form.cargoAtual || undefined, perfilCultural: perfilCulturalCorpo },
        codCanal: form.codCanal,
        respostas,
        autoavaliacao: autoavaliacaoCorpo,
      },
    });
    setSalvando(false);
    if (r.status !== 201) {
      setErro(r.status === 400 ? "Vaga precisa estar ABERTA para receber candidaturas." : "Não foi possível registrar a candidatura.");
      return;
    }
    setForm({ nomeCand: "", email: "", cargoAtual: "", codCanal: "" });
    setRespostas({});
    setAutoavaliacao({});
    setPerfilCultural({});
    if (r.json?.sinalizadoKnockout) alert("Candidatura registrada — atenção: uma resposta eliminatória foi sinalizada na triagem.");
    fechar();
    aoRegistrar();
  }

  return (
    <Gaveta titulo="Nova candidatura" aberta={aberta} fechar={fechar}>
      {!vagaAberta && (
        <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--amber-100, #F2E3C4)", color: "var(--amber-700, #714E08)", fontSize: 12, marginBottom: 8 }}>
          A vaga precisa estar ABERTA para receber candidaturas.
        </div>
      )}
      <form onSubmit={candidatar} style={{ display: "grid", gap: 14 }}>
        <Campo rotulo="Nome do candidato">
          <Entrada required value={form.nomeCand} onChange={(e) => setForm({ ...form, nomeCand: e.target.value })} />
        </Campo>
        <Campo rotulo="E-mail">
          <Entrada required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Campo>
        <Campo rotulo="Cargo atual (opcional)">
          <Entrada value={form.cargoAtual} onChange={(e) => setForm({ ...form, cargoAtual: e.target.value })} />
        </Campo>
        <Campo rotulo="Canal de origem">
          <Selecao required value={form.codCanal} onChange={(e) => setForm({ ...form, codCanal: e.target.value })}>
            <option value="">— selecione —</option>
            {canais.map((c) => <option key={c.codCanal} value={c.codCanal}>{c.nomeCanal}</option>)}
          </Selecao>
        </Campo>

        {perguntas.length > 0 && (
          <div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Perguntas de triagem</span>
            <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
              {perguntas.map((p) => (
                <Campo key={p.codVagPer} rotulo={p.pergunta}>
                  <Selecao value={respostas[p.codVagPer] ?? ""} onChange={(e) => setRespostas({ ...respostas, [p.codVagPer]: e.target.value })}>
                    <option value="">— não respondido —</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </Selecao>
                </Campo>
              ))}
            </div>
          </div>
        )}

        {requisitos.length > 0 && (
          <div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Autoavaliação por requisito</span>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 8px" }}>Nível 0 (não tem) a 4 (especialista) — alimenta o match (RN-REC-006).</p>
            <div style={{ display: "grid", gap: 10 }}>
              {requisitos.map((r) => {
                const valor = autoavaliacao[r.codVagReq] ?? { nivel: "", tempoMeses: "", evidenciaTexto: "" };
                const atualizar = (patch: Partial<typeof valor>) => setAutoavaliacao({ ...autoavaliacao, [r.codVagReq]: { ...valor, ...patch } });
                return (
                  <div key={r.codVagReq} style={{ border: "1px solid var(--border-default)", borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{r.descrReq}</div>
                    <div style={{ display: "grid", gridTemplateColumns: r.tempoEspMeses != null ? "1fr 1fr" : "1fr", gap: 8, marginBottom: 8 }}>
                      <Campo rotulo="Nível (0-4)">
                        <Entrada type="number" min={0} max={4} value={valor.nivel} onChange={(e) => atualizar({ nivel: e.target.value })} />
                      </Campo>
                      {r.tempoEspMeses != null && (
                        <Campo rotulo="Tempo (meses)">
                          <Entrada type="number" min={0} value={valor.tempoMeses} onChange={(e) => atualizar({ tempoMeses: e.target.value })} />
                        </Campo>
                      )}
                    </div>
                    <Campo rotulo="Evidência">
                      <textarea value={valor.evidenciaTexto} onChange={(e) => atualizar({ evidenciaTexto: e.target.value })} rows={2}
                        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-default)", fontFamily: "inherit", fontSize: "inherit", resize: "vertical" }} />
                    </Campo>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Perfil cultural do candidato</span>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 8px" }}>Escala 1-5. Fica salvo no candidato.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {DIMENSOES_CULTURA.map((d) => (
              <Campo key={d.chave} rotulo={d.rotulo}>
                <Entrada type="number" min={1} max={5} value={perfilCultural[d.chave] ?? ""} onChange={(e) => setPerfilCultural({ ...perfilCultural, [d.chave]: e.target.value })} />
              </Campo>
            ))}
          </div>
        </div>

        <Erro mensagem={erro} />
        <BotaoPrimario type="submit" disabled={salvando}>{salvando ? "Registrando..." : "Registrar candidatura"}</BotaoPrimario>
      </form>
    </Gaveta>
  );
}
