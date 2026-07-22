"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, BASE } from "@/lib/api";

/**
 * Admissão Digital — área do candidato, sem login (token opaco, ADR-0004 §5).
 * Os dados complementares são um mapa livre (`dadosComplementaresJson`); os
 * campos abaixo são a forma que o DP espera ver — ver "04 - Processo de
 * Admissão (fluxo real vlow)" no vault.
 */

interface Anexo {
  codAdmAnexo: string;
  categoria: string;
  nomeOriginal: string;
  dhInc: string;
}
interface Processo {
  status: string;
  obsAjuste: string | null;
  dadosComplementaresJson: Record<string, string> | null;
  dhEnvioCandidato: string | null;
  candidatura: { candidato: { nomeCand: string; email: string } };
  anexos: Anexo[];
}

const GRUPOS_CAMPOS = [
  {
    titulo: "Dados pessoais",
    campos: [
      { chave: "rg", rotulo: "RG" },
      { chave: "orgaoEmissor", rotulo: "Órgão emissor" },
      { chave: "cpf", rotulo: "CPF" },
      { chave: "dataNascimento", rotulo: "Data de nascimento", tipo: "date" },
      { chave: "nomeMae", rotulo: "Nome da mãe" },
      { chave: "estadoCivil", rotulo: "Estado civil" },
    ],
  },
  {
    titulo: "Endereço",
    campos: [
      { chave: "cep", rotulo: "CEP" },
      { chave: "endereco", rotulo: "Logradouro e número" },
      { chave: "complemento", rotulo: "Complemento" },
      { chave: "bairro", rotulo: "Bairro" },
      { chave: "cidade", rotulo: "Cidade" },
      { chave: "uf", rotulo: "UF" },
    ],
  },
  {
    titulo: "Dados bancários",
    campos: [
      { chave: "banco", rotulo: "Banco" },
      { chave: "agencia", rotulo: "Agência" },
      { chave: "conta", rotulo: "Conta (com dígito)" },
      { chave: "tipoConta", rotulo: "Tipo de conta" },
      { chave: "pix", rotulo: "Chave PIX (opcional)" },
    ],
  },
  {
    titulo: "Documentos de trabalho",
    campos: [
      { chave: "ctps", rotulo: "CTPS (número/série)" },
      { chave: "pis", rotulo: "PIS/PASEP" },
      { chave: "tituloEleitor", rotulo: "Título de eleitor" },
    ],
  },
] as const;

const CATEGORIAS_ANEXO = ["RG", "CPF", "COMPROVANTE_RESIDENCIA", "CTPS", "FOTO", "OUTRO"];

const ROTULO_CATEGORIA: Record<string, string> = {
  RG: "RG",
  CPF: "CPF",
  COMPROVANTE_RESIDENCIA: "Comprovante de residência",
  CTPS: "Carteira de trabalho",
  FOTO: "Foto",
  OUTRO: "Outro documento",
};

const estiloPagina: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--surface-page)",
  fontFamily: "var(--font-sans)",
  padding: "32px 16px",
};
const estiloCartao: React.CSSProperties = {
  width: 720,
  maxWidth: "100%",
  margin: "0 auto",
  background: "var(--surface-default)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-lg, 10px)",
  padding: 32,
};
const estiloEntrada: React.CSSProperties = {
  padding: "9px 12px",
  border: "1px solid var(--border-default)",
  borderRadius: 8,
  background: "var(--surface-default)",
  color: "var(--text-body)",
  fontFamily: "inherit",
  fontSize: 14,
  width: "100%",
};

export default function AdmissaoPublica() {
  const { token } = useParams<{ token: string }>();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [anexando, setAnexando] = useState(false);
  const [categoria, setCategoria] = useState(CATEGORIAS_ANEXO[0]);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<Processo>(`/admissao/publico/${token}`, { token: null });
    if (r.status !== 200 || !r.json) {
      setErro("Este link é inválido ou expirou. Peça um novo link à empresa.");
      return;
    }
    setProcesso(r.json);
    setValores((atual) => ({ ...(r.json!.dadosComplementaresJson ?? {}), ...atual }));
  }, [token]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const editavel = processo ? ["AGUARDANDO_CANDIDATO", "AJUSTES_SOLICITADOS"].includes(processo.status) : false;

  async function salvarDados() {
    setSalvando(true);
    const r = await api(`/admissao/publico/${token}/dados`, { metodo: "POST", corpo: valores, token: null });
    setSalvando(false);
    if (r.status !== 201) {
      setAviso("Não foi possível salvar agora. Tente novamente.");
      return;
    }
    setAviso("Dados salvos.");
    setTimeout(() => setAviso(null), 3000);
  }

  async function anexar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setAnexando(true);
    const form = new FormData();
    form.set("categoria", categoria);
    form.set("arquivo", arquivo);
    const res = await fetch(`${BASE}/admissao/publico/${token}/anexos`, { method: "POST", body: form });
    setAnexando(false);
    e.target.value = "";
    if (!res.ok) {
      setAviso("Não foi possível anexar (aceitamos PDF, JPG ou PNG, até 8MB).");
      return;
    }
    await carregar();
  }

  async function enviar() {
    if (!confirm("Depois de enviar, os dados ficam bloqueados até o RH revisar. Deseja enviar?")) return;
    setEnviando(true);
    // Garante que o que está na tela foi persistido antes de travar a edição.
    await api(`/admissao/publico/${token}/dados`, { metodo: "POST", corpo: valores, token: null });
    const r = await api(`/admissao/publico/${token}/enviar`, { metodo: "POST", token: null });
    setEnviando(false);
    if (r.status !== 201) {
      setAviso("Não foi possível enviar. Tente novamente.");
      return;
    }
    await carregar();
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
  if (!processo) return null;

  return (
    <main style={estiloPagina}>
      <div style={estiloCartao}>
        <header style={{ marginBottom: 24 }}>
          <img
            src="/marca/SelexOps_Kit_Identidade/svg/selexops-logo-horizontal-fundo-claro.svg"
            alt="SelexOps"
            style={{ height: 34, marginBottom: 16 }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "var(--text-strong)" }}>
            Admissão — {processo.candidatura.candidato.nomeCand}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Preencha seus dados e anexe os documentos. Você pode salvar e voltar depois — só envie quando estiver tudo certo.
          </p>
        </header>

        {processo.status === "AGUARDANDO_APROVACAO_DP" && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--green-100, #D6E9DF)", color: "var(--green-700, #1D533B)", fontSize: 13, marginBottom: 20 }}>
            Enviado. Seus dados estão em análise pelo RH — não é preciso fazer mais nada por enquanto.
          </div>
        )}
        {processo.status === "APROVADO" && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--green-100, #D6E9DF)", color: "var(--green-700, #1D533B)", fontSize: 13, marginBottom: 20 }}>
            Admissão aprovada. Bem-vindo(a)!
          </div>
        )}
        {processo.status === "AJUSTES_SOLICITADOS" && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--amber-100, #F2E3C4)", color: "var(--amber-700, #714E08)", fontSize: 13, marginBottom: 20 }}>
            <strong>O RH pediu um ajuste:</strong> {processo.obsAjuste || "verifique os dados e reenvie."}
          </div>
        )}
        {aviso && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--surface-page)", border: "1px solid var(--border-default)", fontSize: 13, marginBottom: 20 }}>
            {aviso}
          </div>
        )}

        {GRUPOS_CAMPOS.map((grupo) => (
          <section key={grupo.titulo} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px", color: "var(--text-strong)" }}>{grupo.titulo}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              {grupo.campos.map((c) => (
                <label key={c.chave} style={{ display: "grid", gap: 5, fontSize: 13, color: "var(--text-body)" }}>
                  {c.rotulo}
                  <input
                    type={"tipo" in c ? (c.tipo as string) : "text"}
                    value={valores[c.chave] ?? ""}
                    disabled={!editavel}
                    onChange={(e) => setValores({ ...valores, [c.chave]: e.target.value })}
                    style={{ ...estiloEntrada, opacity: editavel ? 1 : 0.6 }}
                  />
                </label>
              ))}
            </div>
          </section>
        ))}

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px", color: "var(--text-strong)" }}>Documentos</h2>
          {editavel && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                style={{ ...estiloEntrada, width: "auto", minWidth: 210 }}
              >
                {CATEGORIAS_ANEXO.map((c) => (
                  <option key={c} value={c}>{ROTULO_CATEGORIA[c] ?? c}</option>
                ))}
              </select>
              <label
                style={{
                  padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border-default)",
                  background: "var(--surface-default)", fontSize: 13, cursor: "pointer",
                }}
              >
                {anexando ? "Enviando..." : "Escolher arquivo (PDF, JPG ou PNG)"}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={anexar} disabled={anexando} style={{ display: "none" }} />
              </label>
            </div>
          )}
          {processo.anexos.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhum documento anexado ainda.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
              {processo.anexos.map((a) => (
                <li
                  key={a.codAdmAnexo}
                  style={{
                    display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13,
                    padding: "8px 12px", background: "var(--surface-page)", borderRadius: 8,
                  }}
                >
                  <span><strong>{ROTULO_CATEGORIA[a.categoria] ?? a.categoria}</strong> — {a.nomeOriginal}</span>
                  <span style={{ color: "var(--text-muted)" }}>{new Date(a.dhInc).toLocaleDateString("pt-BR")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {editavel && (
          <div style={{ display: "flex", gap: 10, borderTop: "1px solid var(--border-default)", paddingTop: 20 }}>
            <button
              onClick={salvarDados}
              disabled={salvando}
              style={{
                padding: "10px 16px", borderRadius: 8, border: "1px solid var(--border-default)",
                background: "var(--surface-default)", color: "var(--text-body)", fontFamily: "inherit",
                fontSize: 14, cursor: "pointer",
              }}
            >
              {salvando ? "Salvando..." : "Salvar e continuar depois"}
            </button>
            <button
              onClick={enviar}
              disabled={enviando}
              style={{
                padding: "10px 16px", borderRadius: 8, border: "none",
                background: "var(--action-primary, var(--brand-700))", color: "#fff",
                fontWeight: 600, fontFamily: "inherit", fontSize: 14, cursor: "pointer",
                opacity: enviando ? 0.7 : 1,
              }}
            >
              {enviando ? "Enviando..." : "Enviar para o RH"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
