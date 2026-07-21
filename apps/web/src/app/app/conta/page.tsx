"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro } from "@/componentes/formulario";

interface Eu {
  nomeUsu: string;
  email: string;
  permissoes: string[];
}

export default function PaginaConta() {
  const [eu, setEu] = useState<Eu | null>(null);
  const [form, setForm] = useState({ senhaAtual: "", senhaNova: "", confirmacao: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    void api<Eu>("/auth/eu").then((r) => {
      if (r.status === 200 && r.json) setEu(r.json);
    });
  }, []);

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(false);

    if (form.senhaNova.length < 8) {
      setErro("A senha nova precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (form.senhaNova !== form.confirmacao) {
      setErro("A confirmação não confere com a senha nova.");
      return;
    }

    setSalvando(true);
    const r = await api("/auth/senha", {
      metodo: "PATCH",
      corpo: { senhaAtual: form.senhaAtual, senhaNova: form.senhaNova },
    });
    setSalvando(false);

    if (r.status !== 200) {
      setErro(r.status === 401 ? "Senha atual incorreta." : "Não foi possível trocar a senha.");
      return;
    }
    setForm({ senhaAtual: "", senhaNova: "", confirmacao: "" });
    setSucesso(true);
  }

  return (
    <main style={{ padding: 32, maxWidth: 480 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Minha conta</h1>
        {eu && (
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            {eu.nomeUsu} · {eu.email}
          </p>
        )}
      </header>

      {sucesso && (
        <div
          style={{
            marginBottom: 16, padding: "10px 14px", borderRadius: 8,
            background: "var(--green-100, #D6E9DF)", color: "var(--green-700, #1D533B)", fontSize: 13,
          }}
        >
          Senha alterada. Suas outras sessões continuam válidas até expirarem.
        </div>
      )}

      <form onSubmit={trocarSenha} style={{ display: "grid", gap: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Trocar senha</div>
        <Campo rotulo="Senha atual">
          <Entrada
            required
            type="password"
            autoComplete="current-password"
            value={form.senhaAtual}
            onChange={(e) => setForm({ ...form, senhaAtual: e.target.value })}
          />
        </Campo>
        <Campo rotulo="Senha nova (mínimo 8 caracteres)">
          <Entrada
            required
            type="password"
            autoComplete="new-password"
            value={form.senhaNova}
            onChange={(e) => setForm({ ...form, senhaNova: e.target.value })}
          />
        </Campo>
        <Campo rotulo="Confirme a senha nova">
          <Entrada
            required
            type="password"
            autoComplete="new-password"
            value={form.confirmacao}
            onChange={(e) => setForm({ ...form, confirmacao: e.target.value })}
          />
        </Campo>
        <Erro mensagem={erro} />
        <BotaoPrimario type="submit" disabled={salvando}>
          {salvando ? "Alterando..." : "Alterar senha"}
        </BotaoPrimario>
      </form>
    </main>
  );
}
