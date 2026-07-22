"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BASE } from "@/lib/api";
import { BotaoPrimario, Erro } from "@/componentes/formulario";

interface PropostaPublica {
  vlrSalario: string;
  dtInicio: string | null;
  tipoContrato: string | null;
  beneficios: string | null;
  observacoes: string | null;
  status: string;
  dhEnvio: string | null;
  candidatura: {
    candidato: { nomeCand: string };
    vaga: { titulo: string; local: string | null; empresa: { nomeFantasia: string } };
  };
}

const moeda = (v: string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
const dataLonga = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(iso));

/**
 * Proposta ao candidato — sem login, por token opaco (ADR-0004 §5).
 *
 * Recusar pede o motivo em texto livre, opcional: é o que diz ao recrutador se
 * a próxima proposta deve mudar de valor, de data ou de vaga. Obrigar a
 * justificar seria constranger quem já está dizendo não.
 */
export default function PaginaProposta() {
  const { token } = useParams<{ token: string }>();
  const [proposta, setProposta] = useState<PropostaPublica | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState("");

  const carregar = useCallback(async () => {
    const res = await fetch(`${BASE}/proposta/publico/${token}`);
    if (!res.ok) {
      setErro("Este link é inválido ou expirou. Fale com a empresa.");
      return;
    }
    setProposta(await res.json());
  }, [token]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function responder(resposta: "ACEITA" | "RECUSADA") {
    setErro(null);
    setEnviando(true);
    const res = await fetch(`${BASE}/proposta/publico/${token}/responder`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resposta, motivo: motivo.trim() || undefined }),
    });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setErro(d?.message ?? "Não foi possível registrar sua resposta.");
      await carregar();
      return;
    }
    await carregar();
  }

  if (erro && !proposta) {
    return (
      <main style={estiloPagina}>
        <div style={estiloCartao}>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{erro}</p>
        </div>
      </main>
    );
  }
  if (!proposta) return null;

  const respondida = proposta.status !== "ENVIADA";

  return (
    <main style={estiloPagina}>
      <div style={estiloCartao}>
        <img
          src="/marca/SelexOps_Kit_Identidade/svg/selexops-logo-horizontal-fundo-claro.svg"
          alt="SelexOps"
          style={{ height: 30, marginBottom: 20 }}
        />

        <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px" }}>
          Proposta para {proposta.candidatura.vaga.titulo}
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 22px" }}>
          {proposta.candidatura.vaga.empresa.nomeFantasia}
          {proposta.candidatura.vaga.local ? ` · ${proposta.candidatura.vaga.local}` : ""}
        </p>

        <p style={{ fontSize: 15, margin: "0 0 20px" }}>
          Olá, {proposta.candidatura.candidato.nomeCand}. Estes são os termos que oferecemos:
        </p>

        <dl style={{ display: "grid", gap: 12, margin: "0 0 24px" }}>
          <Linha rotulo="Salário" valor={moeda(proposta.vlrSalario)} destaque />
          {proposta.dtInicio && <Linha rotulo="Início previsto" valor={dataLonga(proposta.dtInicio)} />}
          {proposta.tipoContrato && <Linha rotulo="Tipo de contrato" valor={proposta.tipoContrato} />}
          {proposta.beneficios && <Linha rotulo="Benefícios" valor={proposta.beneficios} />}
          {proposta.observacoes && <Linha rotulo="Observações" valor={proposta.observacoes} />}
        </dl>

        {respondida ? (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: proposta.status === "ACEITA" ? "var(--green-100, #D6E9DF)" : "var(--surface-page)",
              color: proposta.status === "ACEITA" ? "var(--green-700, #1D533B)" : "var(--text-muted)",
              fontSize: 14,
            }}
          >
            {proposta.status === "ACEITA"
              ? "Você aceitou esta proposta. A empresa entrará em contato com os próximos passos."
              : proposta.status === "RECUSADA"
                ? "Você recusou esta proposta. Obrigado por responder."
                : "Esta proposta não está mais válida."}
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 14px", lineHeight: 1.55 }}>
              Se quiser conversar antes de decidir, responda o e-mail que você recebeu — dá tempo.
            </p>
            {recusando && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
                  Quer contar o motivo? (opcional)
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  placeholder="ex.: recebi outra oferta, o valor não atende, a data não encaixa…"
                  style={{
                    width: "100%", padding: 10, borderRadius: 8, fontFamily: "inherit", fontSize: 13,
                    border: "1px solid var(--border-default)", background: "var(--surface-default)",
                    color: "var(--text-body)", resize: "vertical",
                  }}
                />
              </div>
            )}
            <Erro mensagem={erro} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {!recusando ? (
                <>
                  <BotaoPrimario onClick={() => responder("ACEITA")} disabled={enviando}>
                    {enviando ? "Registrando…" : "Aceitar proposta"}
                  </BotaoPrimario>
                  <button onClick={() => setRecusando(true)} style={botaoSecundario}>
                    Recusar
                  </button>
                </>
              ) : (
                <>
                  <BotaoPrimario onClick={() => responder("RECUSADA")} disabled={enviando}>
                    {enviando ? "Registrando…" : "Confirmar recusa"}
                  </BotaoPrimario>
                  <button onClick={() => setRecusando(false)} style={botaoSecundario}>
                    Voltar
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Linha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
      <dt style={{ fontSize: 13, color: "var(--text-muted)" }}>{rotulo}</dt>
      <dd style={{ margin: 0, fontSize: destaque ? 20 : 14, fontWeight: destaque ? 700 : 400, textAlign: "right" }}>
        {valor}
      </dd>
    </div>
  );
}

const estiloPagina: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--surface-page)",
  color: "var(--text-body)",
  fontFamily: "var(--font-sans)",
  padding: "40px 20px",
  display: "flex",
  justifyContent: "center",
};
const estiloCartao: React.CSSProperties = {
  background: "var(--surface-default)",
  border: "1px solid var(--border-default)",
  borderRadius: 14,
  padding: 32,
  width: "100%",
  maxWidth: 560,
  height: "fit-content",
};
const botaoSecundario: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 8,
  border: "1px solid var(--border-default)",
  background: "var(--surface-default)",
  color: "var(--text-body)",
  fontFamily: "inherit",
  fontSize: 14,
  cursor: "pointer",
};
