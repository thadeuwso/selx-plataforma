"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";

interface Anexo {
  codAdmAnexo: string;
  categoria: string;
  nomeOriginal: string;
  dhInc: string;
}
interface Processo {
  codAdmProc: string;
  status: string;
  tokenPub: string;
  obsAjuste: string | null;
  dadosComplementaresJson: Record<string, unknown> | null;
  dhInicio: string;
  anexos: Anexo[];
  candidatura: { candidato: { nomeCand: string; email: string }; vaga: { titulo: string } };
}
interface DocumentoModelo {
  codDoc: string;
  nomeDoc: string;
}
interface Kit {
  codKit: string;
  nomeKit: string;
}

const ROTULO_STATUS: Record<string, string> = {
  AGUARDANDO_CANDIDATO: "Aguardando candidato",
  AGUARDANDO_APROVACAO_DP: "Aguardando aprovação do DP",
  AJUSTES_SOLICITADOS: "Ajustes solicitados",
  APROVADO: "Aprovado",
};

export default function PaginaAdmissaoDetalhe() {
  const { codCdt } = useParams<{ codCdt: string }>();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [modelos, setModelos] = useState<DocumentoModelo[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);

  const [gavetaAjustes, setGavetaAjustes] = useState(false);
  const [obsAjuste, setObsAjuste] = useState("");
  const [erroAjustes, setErroAjustes] = useState<string | null>(null);
  const [salvandoAjustes, setSalvandoAjustes] = useState(false);

  const [gavetaAprovar, setGavetaAprovar] = useState(false);
  const [erroAprovar, setErroAprovar] = useState<string | null>(null);
  const [salvandoAprovar, setSalvandoAprovar] = useState(false);
  const [formAprovar, setFormAprovar] = useState({
    numCad: "",
    dtAdm: "",
    vlrSal: "",
    codDocContrato: "",
    codKit: "",
  });

  const carregar = useCallback(async () => {
    const [p, m, k] = await Promise.all([
      api<Processo>(`/candidaturas/${codCdt}/admissao`),
      api<DocumentoModelo[]>("/documentos-modelo"),
      api<{ codKit: string; nomeKit: string }[]>("/kits-admissionais"),
    ]);
    if (p.status === 200 && p.json) setProcesso(p.json);
    if (m.status === 200 && m.json) setModelos(m.json);
    if (k.status === 200 && k.json) setKits(k.json);
  }, [codCdt]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function solicitarAjustes(e: React.FormEvent) {
    e.preventDefault();
    setErroAjustes(null);
    setSalvandoAjustes(true);
    const r = await api(`/candidaturas/${codCdt}/admissao/solicitar-ajustes`, {
      metodo: "POST",
      corpo: { obsAjuste },
    });
    setSalvandoAjustes(false);
    if (r.status !== 201) {
      setErroAjustes("Não foi possível solicitar ajustes.");
      return;
    }
    setGavetaAjustes(false);
    setObsAjuste("");
    await carregar();
  }

  async function aprovar(e: React.FormEvent) {
    e.preventDefault();
    setErroAprovar(null);
    setSalvandoAprovar(true);
    const r = await api(`/candidaturas/${codCdt}/admissao/aprovar`, {
      metodo: "POST",
      corpo: {
        numCad: formAprovar.numCad,
        dtAdm: formAprovar.dtAdm,
        vlrSal: formAprovar.vlrSal ? Number(formAprovar.vlrSal) : undefined,
        codDocContrato: formAprovar.codDocContrato,
        codKit: formAprovar.codKit || undefined,
      },
    });
    setSalvandoAprovar(false);
    if (r.status !== 201) {
      setErroAprovar("Não foi possível aprovar — confira matrícula, data e o documento de contrato.");
      return;
    }
    setGavetaAprovar(false);
    await carregar();
  }

  if (!processo) return null;

  const podeAgir = processo.status === "AGUARDANDO_APROVACAO_DP";

  return (
    <main style={{ padding: 32 }}>
      <header style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{processo.candidatura.candidato.nomeCand}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            {processo.candidatura.vaga.titulo} — {ROTULO_STATUS[processo.status] ?? processo.status}
          </p>
        </div>
        {podeAgir && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setGavetaAjustes(true)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid var(--border-default)",
                background: "var(--surface-default)",
                cursor: "pointer",
                fontFamily: "inherit", fontSize: "inherit",
              }}
            >
              Solicitar ajustes
            </button>
            <BotaoPrimario onClick={() => setGavetaAprovar(true)}>Aprovar</BotaoPrimario>
          </div>
        )}
      </header>

      <div
        style={{
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          padding: "10px 14px", marginBottom: 20, borderRadius: 8,
          background: "var(--surface-page)", border: "1px solid var(--border-default)", fontSize: 13,
        }}
      >
        <span style={{ color: "var(--text-muted)" }}>Link do candidato:</span>
        <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
          /admissao/{processo.tokenPub.slice(0, 10)}…
        </code>
        <button
          onClick={() => {
            const url = `${window.location.origin}/admissao/${processo.tokenPub}`;
            navigator.clipboard.writeText(url).catch(() => {});
            alert(`Link copiado:\n${url}`);
          }}
          style={{ border: "none", background: "none", color: "var(--text-link)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}
        >
          Copiar
        </button>
        <a
          href={`/admissao/${processo.tokenPub}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--text-link)", fontSize: 13 }}
        >
          Abrir como o candidato vê
        </a>
      </div>

      {processo.obsAjuste && (
        <div
          style={{
            background: "var(--amber-50, #FAF3E6)",
            border: "1px solid var(--amber-100, #F2E3C4)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 14,
            marginBottom: 20,
          }}
        >
          Ajuste solicitado: {processo.obsAjuste}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <section style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>Dados complementares</h2>
          {!processo.dadosComplementaresJson || Object.keys(processo.dadosComplementaresJson).length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>O candidato ainda não preencheu dados.</p>
          ) : (
            <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
              {Object.entries(processo.dadosComplementaresJson).map(([chave, valor]) => (
                <div key={chave} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ color: "var(--text-muted)" }}>{chave}</span>
                  <span>{String(valor)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>Documentos anexados</h2>
          {processo.anexos.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>Nenhum documento anexado ainda.</p>
          ) : (
            <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
              {processo.anexos.map((a) => (
                <div key={a.codAdmAnexo} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>
                    <strong>{a.categoria}</strong> — {a.nomeOriginal}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>{new Date(a.dhInc).toLocaleDateString("pt-BR")}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Gaveta titulo="Solicitar ajustes ao candidato" aberta={gavetaAjustes} fechar={() => setGavetaAjustes(false)}>
        <form onSubmit={solicitarAjustes} style={{ display: "grid", gap: 14 }}>
          <Campo rotulo="O que precisa ser corrigido ou reenviado?">
            <textarea
              required
              value={obsAjuste}
              onChange={(e) => setObsAjuste(e.target.value)}
              rows={4}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border-default)",
                fontFamily: "inherit", fontSize: "inherit",
                resize: "vertical",
              }}
            />
          </Campo>
          <Erro mensagem={erroAjustes} />
          <BotaoPrimario type="submit" disabled={salvandoAjustes}>
            {salvandoAjustes ? "Enviando..." : "Devolver para o candidato"}
          </BotaoPrimario>
        </form>
      </Gaveta>

      <Gaveta titulo="Aprovar admissão" aberta={gavetaAprovar} fechar={() => setGavetaAprovar(false)}>
        <form onSubmit={aprovar} style={{ display: "grid", gap: 14 }}>
          <Campo rotulo="Matrícula (NUMCAD)">
            <Entrada
              required
              type="number"
              min={1}
              value={formAprovar.numCad}
              onChange={(e) => setFormAprovar({ ...formAprovar, numCad: e.target.value })}
            />
          </Campo>
          <Campo rotulo="Data de admissão">
            <Entrada
              required
              type="date"
              value={formAprovar.dtAdm}
              onChange={(e) => setFormAprovar({ ...formAprovar, dtAdm: e.target.value })}
            />
          </Campo>
          <Campo rotulo="Salário (opcional)">
            <Entrada
              type="number"
              step="0.01"
              min={0}
              value={formAprovar.vlrSal}
              onChange={(e) => setFormAprovar({ ...formAprovar, vlrSal: e.target.value })}
            />
          </Campo>
          <Campo rotulo="Contrato (modelo de documento)">
            <Selecao
              required
              value={formAprovar.codDocContrato}
              onChange={(e) => setFormAprovar({ ...formAprovar, codDocContrato: e.target.value })}
            >
              <option value="">— selecione —</option>
              {modelos.map((m) => (
                <option key={m.codDoc} value={m.codDoc}>
                  {m.nomeDoc}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Kit admissional (opcional)">
            <Selecao value={formAprovar.codKit} onChange={(e) => setFormAprovar({ ...formAprovar, codKit: e.target.value })}>
              <option value="">— sem kit —</option>
              {kits.map((k) => (
                <option key={k.codKit} value={k.codKit}>
                  {k.nomeKit}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Erro mensagem={erroAprovar} />
          <BotaoPrimario type="submit" disabled={salvandoAprovar}>
            {salvandoAprovar ? "Aprovando..." : "Aprovar e disparar assinatura"}
          </BotaoPrimario>
        </form>
      </Gaveta>
    </main>
  );
}
