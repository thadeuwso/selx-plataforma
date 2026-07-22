"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Pergunta {
  codPer: string;
  texto: string;
  respondida: number | null;
}
interface Consulta {
  status: string;
  tempoEstimadoMin: number | null;
  tempoEstimadoMax: number | null;
  consentimentoAceito: boolean;
  concluido: boolean;
  totalPerguntas: number;
  totalRespondidas: number;
  perguntas: Pergunta[];
}

const OPCOES = [
  { valor: 1, rotulo: "Discordo totalmente" },
  { valor: 2, rotulo: "Discordo parcialmente" },
  { valor: 3, rotulo: "Nem concordo nem discordo" },
  { valor: 4, rotulo: "Concordo parcialmente" },
  { valor: 5, rotulo: "Concordo totalmente" },
];

const estiloCartao: React.CSSProperties = {
  width: 480,
  maxWidth: "92vw",
  background: "var(--surface-default)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-lg, 10px)",
  padding: 32,
  display: "grid",
  gap: 16,
};

const estiloPagina: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "var(--surface-page)",
  fontFamily: "var(--font-sans)",
  padding: 16,
};

export default function AvaliacaoComportamentalPublica() {
  const { token } = useParams<{ token: string }>();
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [indice, setIndice] = useState(0);
  const [aceitando, setAceitando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [finalizado, setFinalizado] = useState<{ indicadorConsistencia: string } | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<Consulta>(`/avaliacao-comportamental/publico/${token}`, { token: null });
    if (r.status !== 200 || !r.json) {
      setErro("Este link é inválido ou expirou. Peça um novo link à empresa.");
      return;
    }
    setConsulta(r.json);
    const primeiraNaoRespondida = r.json.perguntas.findIndex((p) => p.respondida == null);
    setIndice(primeiraNaoRespondida === -1 ? 0 : primeiraNaoRespondida);
  }, [token]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function aceitarConsentimento() {
    setAceitando(true);
    await api(`/avaliacao-comportamental/publico/${token}/consentimento`, { metodo: "POST", token: null });
    setAceitando(false);
    await carregar();
  }

  async function responder(valor: number) {
    if (!consulta) return;
    const pergunta = consulta.perguntas[indice];
    setEnviando(true);
    await api(`/avaliacao-comportamental/publico/${token}/responder`, {
      metodo: "POST",
      corpo: { codPer: pergunta.codPer, valor },
      token: null,
    });
    setEnviando(false);
    const proximas = consulta.perguntas.map((p, i) => (i === indice ? { ...p, respondida: valor } : p));
    const atualizada = { ...consulta, perguntas: proximas, totalRespondidas: proximas.filter((p) => p.respondida != null).length };
    setConsulta(atualizada);
    if (indice + 1 < proximas.length) {
      setIndice(indice + 1);
    }
  }

  async function finalizar() {
    setEnviando(true);
    const r = await api<{ indicadorConsistencia: string }>(`/avaliacao-comportamental/publico/${token}/finalizar`, {
      metodo: "POST",
      token: null,
    });
    setEnviando(false);
    if (r.status !== 201 || !r.json) {
      alert("Não foi possível finalizar. Verifique se todas as perguntas foram respondidas.");
      return;
    }
    setFinalizado(r.json);
  }

  if (erro) {
    return (
      <main style={estiloPagina}>
        <div style={estiloCartao}>
          <p style={{ margin: 0, color: "var(--text-body)" }}>{erro}</p>
        </div>
      </main>
    );
  }

  if (!consulta) return null;

  if (finalizado || consulta.concluido) {
    return (
      <main style={estiloPagina}>
        <div style={estiloCartao}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Avaliação concluída</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
            Obrigado por responder. O resultado já foi enviado para a empresa — você pode fechar esta página.
          </p>
        </div>
      </main>
    );
  }

  if (!consulta.consentimentoAceito) {
    return (
      <main style={estiloPagina}>
        <div style={estiloCartao}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Avaliação comportamental</h1>
          <p style={{ color: "var(--text-body)", fontSize: 14, margin: 0 }}>
            Você vai responder a {consulta.totalPerguntas} afirmações curtas sobre como costuma agir no trabalho.
            {consulta.tempoEstimadoMin != null && ` Leva de ${consulta.tempoEstimadoMin} a ${consulta.tempoEstimadoMax} minutos.`}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
            Não existem respostas certas ou erradas. Responda com o que mais se aproxima do seu comportamento real,
            não do que você acha que seria "ideal". Suas respostas serão usadas apenas para avaliar aderência a esta vaga.
          </p>
          <button
            onClick={aceitarConsentimento}
            disabled={aceitando}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              background: "var(--action-primary, var(--brand-700))",
              color: "#fff",
              fontWeight: 600,
              fontFamily: "inherit", fontSize: "inherit",
              cursor: "pointer",
              opacity: aceitando ? 0.7 : 1,
            }}
          >
            {aceitando ? "Um momento..." : "Concordo e quero começar"}
          </button>
        </div>
      </main>
    );
  }

  const pergunta = consulta.perguntas[indice];
  const todasRespondidas = consulta.perguntas.every((p) => p.respondida != null);

  return (
    <main style={estiloPagina}>
      <div style={estiloCartao}>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {indice + 1} de {consulta.perguntas.length}
        </div>
        <div style={{ height: 4, background: "var(--border-default)", borderRadius: 999, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${((indice + 1) / consulta.perguntas.length) * 100}%`,
              background: "var(--brand-700)",
            }}
          />
        </div>
        <p style={{ fontSize: 16, fontWeight: 500, color: "var(--text-body)", minHeight: 48 }}>{pergunta.texto}</p>
        <div style={{ display: "grid", gap: 8 }}>
          {OPCOES.map((o) => (
            <button
              key={o.valor}
              onClick={() => responder(o.valor)}
              disabled={enviando}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: pergunta.respondida === o.valor ? "2px solid var(--brand-700)" : "1px solid var(--border-default)",
                background: pergunta.respondida === o.valor ? "var(--brand-50, #F2E9E2)" : "var(--surface-default)",
                textAlign: "left",
                fontSize: 14,
                fontFamily: "inherit",
                cursor: "pointer",
                opacity: enviando ? 0.7 : 1,
              }}
            >
              {o.rotulo}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <button
            onClick={() => setIndice(Math.max(0, indice - 1))}
            disabled={indice === 0}
            style={{ background: "none", border: "none", color: "var(--text-link)", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", opacity: indice === 0 ? 0.4 : 1 }}
          >
            ← Voltar
          </button>
          {indice + 1 < consulta.perguntas.length ? (
            <button
              onClick={() => setIndice(indice + 1)}
              disabled={pergunta.respondida == null}
              style={{ background: "none", border: "none", color: "var(--text-link)", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", opacity: pergunta.respondida == null ? 0.4 : 1 }}
            >
              Próxima →
            </button>
          ) : (
            <button
              onClick={finalizar}
              disabled={!todasRespondidas || enviando}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: "var(--action-primary, var(--brand-700))",
                color: "#fff",
                fontWeight: 600,
                fontFamily: "inherit", fontSize: "inherit",
                cursor: "pointer",
                opacity: !todasRespondidas || enviando ? 0.6 : 1,
              }}
            >
              {enviando ? "Enviando..." : "Finalizar avaliação"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
