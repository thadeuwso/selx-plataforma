"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario, Campo, Entrada, Erro, Gaveta, Selecao } from "@/componentes/formulario";

interface Eu {
  nome: string;
  permissoes: string[];
}
interface Empresa {
  codEmp: string;
  nomeFantasia: string;
  razaoSocial: string;
  codEmpMatriz: string | null;
  situacao: string;
}

const celula: React.CSSProperties = { padding: "10px 14px" };

export default function PaginaEmpresas() {
  const rotear = useRouter();
  const [eu, setEu] = useState<Eu | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [aberta, setAberta] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nomeFantasia: "", razaoSocial: "", cgc: "", codEmpMatriz: "", situacao: "ATIVA" });

  function abrirNova() {
    setEditando(null);
    setForm({ nomeFantasia: "", razaoSocial: "", cgc: "", codEmpMatriz: "", situacao: "ATIVA" });
    setErro(null);
    setAberta(true);
  }
  function abrirEdicao(e: Empresa) {
    setEditando(e);
    setForm({ nomeFantasia: e.nomeFantasia, razaoSocial: e.razaoSocial, cgc: "", codEmpMatriz: e.codEmpMatriz ?? "", situacao: e.situacao });
    setErro(null);
    setAberta(true);
  }

  const carregar = useCallback(async () => {
    const r = await api<Empresa[]>("/empresas");
    if (r.status === 200 && r.json) setEmpresas(r.json);
  }, []);

  useEffect(() => {
    (async () => {
      const rEu = await api<Eu>("/auth/eu");
      if (rEu.status !== 200) {
        rotear.replace("/login");
        return;
      }
      setEu(rEu.json);
      await carregar();
    })();
  }, [rotear, carregar]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const r = editando
      ? await api(`/empresas/${editando.codEmp}`, {
          metodo: "PATCH",
          corpo: {
            nomeFantasia: form.nomeFantasia,
            razaoSocial: form.razaoSocial,
            cgc: form.cgc || undefined,
            situacao: form.situacao,
          },
        })
      : await api("/empresas", {
          metodo: "POST",
          corpo: {
            nomeFantasia: form.nomeFantasia,
            razaoSocial: form.razaoSocial,
            cgc: form.cgc || undefined,
            codEmpMatriz: form.codEmpMatriz || undefined,
          },
        });
    setSalvando(false);
    if (r.status !== 201 && r.status !== 200) {
      setErro(r.status === 403 ? "Sem permissão." : "Não foi possível salvar. Verifique os dados.");
      return;
    }
    setAberta(false);
    await carregar();
  }

  if (!eu) return null;
  const podeCriar = eu.permissoes.includes("core.empresas.criar");
  const podeEditar = eu.permissoes.includes("core.empresas.editar");

  return (
    <main style={{ padding: 32 }}>
      <header style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Empresas e filiais</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Olá, {eu.nome} — {empresas.length} empresa(s) no seu grupo.
          </p>
        </div>
        {podeCriar && <BotaoPrimario onClick={abrirNova}>Nova empresa/filial</BotaoPrimario>}
      </header>

      <div style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "var(--surface-page)", textAlign: "left" }}>
              <th style={{ ...celula, fontWeight: 600 }}>Código</th>
              <th style={{ ...celula, fontWeight: 600 }}>Nome fantasia</th>
              <th style={{ ...celula, fontWeight: 600 }}>Razão social</th>
              <th style={{ ...celula, fontWeight: 600 }}>Tipo</th>
              <th style={{ ...celula, fontWeight: 600 }}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr
                key={e.codEmp}
                onClick={() => podeEditar && abrirEdicao(e)}
                style={{ borderTop: "1px solid var(--border-default)", cursor: podeEditar ? "pointer" : "default" }}
              >
                <td style={{ ...celula, fontFamily: "var(--font-mono)" }}>{e.codEmp}</td>
                <td style={celula}>{e.nomeFantasia}</td>
                <td style={{ ...celula, color: "var(--text-muted)" }}>{e.razaoSocial}</td>
                <td style={celula}>{e.codEmpMatriz ? "Filial" : "Matriz"}</td>
                <td style={{ ...celula, color: "var(--text-muted)" }}>{e.situacao === "ATIVA" ? "Ativa" : "Inativa"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {podeEditar && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>Clique numa empresa para editar.</p>}

      <Gaveta titulo={editando ? "Editar empresa" : "Nova empresa ou filial"} aberta={aberta} fechar={() => setAberta(false)}>
        <form onSubmit={salvar} style={{ display: "grid", gap: 14 }}>
          <Campo rotulo="Nome fantasia">
            <Entrada required value={form.nomeFantasia} onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })} />
          </Campo>
          <Campo rotulo="Razão social">
            <Entrada required value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} />
          </Campo>
          <Campo rotulo="CNPJ (opcional)">
            <Entrada value={form.cgc} onChange={(e) => setForm({ ...form, cgc: e.target.value })} />
          </Campo>
          {editando ? (
            <Campo rotulo="Situação">
              <Selecao value={form.situacao} onChange={(e) => setForm({ ...form, situacao: e.target.value })}>
                <option value="ATIVA">Ativa</option>
                <option value="INATIVA">Inativa</option>
              </Selecao>
            </Campo>
          ) : (
            <Campo rotulo="Matriz (deixe vazio para criar uma matriz)">
              <Selecao value={form.codEmpMatriz} onChange={(e) => setForm({ ...form, codEmpMatriz: e.target.value })}>
                <option value="">— nenhuma (é matriz) —</option>
                {empresas.filter((e) => !e.codEmpMatriz).map((e) => (
                  <option key={e.codEmp} value={e.codEmp}>
                    {e.nomeFantasia}
                  </option>
                ))}
              </Selecao>
            </Campo>
          )}
          <Erro mensagem={erro} />
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : editando ? "Salvar" : "Criar empresa"}
          </BotaoPrimario>
        </form>
      </Gaveta>
    </main>
  );
}
