"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";

interface Papel {
  codPap: string;
  nomePap: string;
}

interface Usuario {
  codUsu: string;
  nomeUsu: string;
  email: string;
  situacao: string;
  dhUltAcesso: string | null;
  papeis: { codEmp: string | null; papel: { nomePap: string } }[];
}

const celula: React.CSSProperties = { padding: "10px 14px" };

export default function PaginaUsuarios() {
  const [lista, setLista] = useState<Usuario[]>([]);
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [semPermissao, setSemPermissao] = useState(false);
  const [aberta, setAberta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nomeUsu: "", email: "", senha: "", codPap: "" });

  const carregar = useCallback(async () => {
    const r = await api<Usuario[]>("/usuarios");
    if (r.status === 403) setSemPermissao(true);
    else if (r.status === 200 && r.json) setLista(r.json);
    const p = await api<Papel[]>("/papeis");
    if (p.status === 200 && p.json) setPapeis(p.json);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const r = await api("/usuarios", {
      metodo: "POST",
      corpo: { nomeUsu: form.nomeUsu, email: form.email, senha: form.senha, papeis: [form.codPap] },
    });
    setSalvando(false);
    if (r.status !== 201) {
      setErro(r.status === 403 ? "Sem permissão para criar usuários." : "Não foi possível criar — confira e-mail (único) e senha (mínimo 8).");
      return;
    }
    setAberta(false);
    setForm({ nomeUsu: "", email: "", senha: "", codPap: "" });
    await carregar();
  }

  if (semPermissao)
    return (
      <main style={{ padding: 32, color: "var(--text-muted)" }}>
        Você não tem a permissão <code>core.usuarios.ler</code> — fale com o administrador do grupo.
      </main>
    );

  return (
    <main style={{ padding: 32 }}>
      <header style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Usuários e papéis</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            {lista.length} usuário(s) com acesso ao grupo.
          </p>
        </div>
        <BotaoPrimario onClick={() => setAberta(true)}>Novo usuário</BotaoPrimario>
      </header>

      <Gaveta titulo="Novo usuário" aberta={aberta} fechar={() => setAberta(false)}>
        <form onSubmit={salvar} style={{ display: "grid", gap: 14 }}>
          <Campo rotulo="Nome">
            <Entrada required value={form.nomeUsu} onChange={(e) => setForm({ ...form, nomeUsu: e.target.value })} />
          </Campo>
          <Campo rotulo="E-mail">
            <Entrada required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Campo>
          <Campo rotulo="Senha provisória (mínimo 8 caracteres)">
            <Entrada required type="password" minLength={8} value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
          </Campo>
          <Campo rotulo="Papel">
            <Selecao required value={form.codPap} onChange={(e) => setForm({ ...form, codPap: e.target.value })}>
              <option value="">— selecione —</option>
              {papeis.map((p) => (
                <option key={p.codPap} value={p.codPap}>
                  {p.nomePap}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Erro mensagem={erro} />
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Criando..." : "Criar usuário"}
          </BotaoPrimario>
        </form>
      </Gaveta>
      <div style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "var(--surface-page)", textAlign: "left" }}>
              <th style={{ ...celula, fontWeight: 600 }}>Nome</th>
              <th style={{ ...celula, fontWeight: 600 }}>E-mail</th>
              <th style={{ ...celula, fontWeight: 600 }}>Papéis</th>
              <th style={{ ...celula, fontWeight: 600 }}>Último acesso</th>
              <th style={{ ...celula, fontWeight: 600 }}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.codUsu} style={{ borderTop: "1px solid var(--border-default)" }}>
                <td style={celula}>{u.nomeUsu}</td>
                <td style={{ ...celula, color: "var(--text-muted)" }}>{u.email}</td>
                <td style={celula}>
                  {u.papeis.map((p, i) => (
                    <span
                      key={i}
                      style={{
                        padding: "2px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        marginRight: 6,
                        background: "var(--brand-100, #EFE5D4)",
                        color: "var(--brand-800, #48301F)",
                      }}
                    >
                      {p.papel.nomePap}
                      {p.codEmp ? " (escopo)" : ""}
                    </span>
                  ))}
                </td>
                <td style={{ ...celula, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  {u.dhUltAcesso ? new Date(u.dhUltAcesso).toLocaleString("pt-BR") : "nunca"}
                </td>
                <td style={celula}>{u.situacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
