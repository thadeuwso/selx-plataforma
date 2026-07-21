"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

/**
 * Cadastro de um novo grupo (tenant) + primeiro usuário administrador.
 * O backend cria tenant, empresa matriz, papel Administrador com o catálogo
 * de permissões e já devolve o par de tokens — então entramos direto.
 */
export default function PaginaCadastro() {
  const rotear = useRouter();
  const [form, setForm] = useState({
    nomeGrupo: "",
    nomeFantasia: "",
    razaoSocial: "",
    cgc: "",
    nomeUsu: "",
    email: "",
    senha: "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (form.senha.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setCarregando(true);
    const r = await api("/auth/cadastro", {
      metodo: "POST",
      corpo: {
        nomeGrupo: form.nomeGrupo,
        nomeFantasia: form.nomeFantasia,
        razaoSocial: form.razaoSocial,
        cgc: form.cgc || undefined,
        nomeUsu: form.nomeUsu,
        email: form.email,
        senha: form.senha,
      },
      token: null,
    });

    if (r.status !== 201) {
      setCarregando(false);
      setErro(
        r.status === 400
          ? "Confira os dados — o e-mail pode já estar cadastrado."
          : "Não foi possível concluir o cadastro.",
      );
      return;
    }

    // O cadastro não devolve tokens: autentica com as credenciais recém-criadas
    // para não obrigar o usuário a digitar tudo de novo logo após se cadastrar.
    const entrada = await api<{ accessToken: string; refreshToken: string }>("/auth/login", {
      metodo: "POST",
      corpo: { email: form.email, senha: form.senha },
      token: null,
    });
    setCarregando(false);

    if (entrada.status === 201 && entrada.json?.accessToken) {
      localStorage.setItem("accessToken", entrada.json.accessToken);
      localStorage.setItem("refreshToken", entrada.json.refreshToken);
      rotear.push("/app");
      return;
    }
    rotear.push("/login"); // conta criada, mas algo impediu o login automático
  }

  const campo: React.CSSProperties = {
    padding: "10px 12px",
    border: "1px solid var(--border-default)",
    borderRadius: 8,
    background: "var(--surface-default)",
    color: "var(--text-body)",
    font: "inherit",
    width: "100%",
  };
  const rotulo: React.CSSProperties = { display: "grid", gap: 6, fontSize: 13, color: "var(--text-body)" };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--surface-page)",
        fontFamily: "var(--font-sans)",
        padding: "32px 16px",
      }}
    >
      <form
        onSubmit={cadastrar}
        style={{
          width: 460,
          maxWidth: "100%",
          background: "var(--surface-default)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg, 10px)",
          padding: 32,
          display: "grid",
          gap: 14,
        }}
      >
        <div>
          <img
            src="/marca/SelexOps_Kit_Identidade/svg/selexops-logo-horizontal-fundo-claro.svg"
            alt="SelexOps"
            style={{ height: 40 }}
          />
          <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 6 }}>
            Criar conta — leva menos de um minuto.
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 4 }}>
          Sua empresa
        </div>
        <label style={rotulo}>
          Nome do grupo
          <input required value={form.nomeGrupo} onChange={(e) => setForm({ ...form, nomeGrupo: e.target.value })} style={campo} />
        </label>
        <label style={rotulo}>
          Nome fantasia
          <input required value={form.nomeFantasia} onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })} style={campo} />
        </label>
        <label style={rotulo}>
          Razão social
          <input required value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} style={campo} />
        </label>
        <label style={rotulo}>
          CNPJ (opcional)
          <input value={form.cgc} onChange={(e) => setForm({ ...form, cgc: e.target.value })} style={campo} />
        </label>

        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 8 }}>
          Seu acesso
        </div>
        <label style={rotulo}>
          Seu nome
          <input required value={form.nomeUsu} onChange={(e) => setForm({ ...form, nomeUsu: e.target.value })} style={campo} />
        </label>
        <label style={rotulo}>
          E-mail
          <input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={campo} />
        </label>
        <label style={rotulo}>
          Senha (mínimo 8 caracteres)
          <input required type="password" autoComplete="new-password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} style={campo} />
        </label>

        {erro && <div style={{ color: "var(--feedback-danger, #B4443E)", fontSize: 13 }}>{erro}</div>}

        <button
          type="submit"
          disabled={carregando}
          style={{
            padding: "11px 12px",
            borderRadius: 8,
            border: "none",
            background: "var(--action-primary, var(--brand-700))",
            color: "#fff",
            fontWeight: 600,
            font: "inherit",
            cursor: "pointer",
            opacity: carregando ? 0.7 : 1,
            marginTop: 4,
          }}
        >
          {carregando ? "Criando..." : "Criar conta"}
        </button>

        <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
          Já tem conta? <Link href="/login" style={{ color: "var(--text-link)" }}>Entrar</Link>
        </div>
      </form>
    </main>
  );
}
