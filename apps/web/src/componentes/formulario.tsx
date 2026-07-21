"use client";
import type { ReactNode } from "react";

/** Padrão ADL: painel lateral (drawer) para criação em contexto. */
export function Gaveta({
  titulo,
  aberta,
  fechar,
  largura = 420,
  children,
}: {
  titulo: string;
  aberta: boolean;
  fechar: () => void;
  largura?: number;
  children: ReactNode;
}) {
  if (!aberta) return null;
  return (
    <div
      onClick={fechar}
      style={{ position: "fixed", inset: 0, background: "rgba(23,21,18,.4)", zIndex: 50, display: "flex", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: largura,
          maxWidth: "90vw",
          background: "var(--surface-default)",
          height: "100%",
          padding: 28,
          overflowY: "auto",
          display: "grid",
          gap: 16,
          alignContent: "start",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>{titulo}</h2>
          <button onClick={fechar} aria-label="Fechar" style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)" }}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const estiloEntrada: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid var(--border-default)",
  borderRadius: 8,
  background: "var(--surface-default)",
  color: "var(--text-body)",
  font: "inherit",
  width: "100%",
};

export function Campo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 13, color: "var(--text-body)" }}>
      {rotulo}
      {children}
    </label>
  );
}

export function Entrada(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...estiloEntrada, ...props.style }} />;
}

export function Selecao(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...estiloEntrada, ...props.style }} />;
}

export function BotaoPrimario(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        border: "none",
        background: "var(--action-primary, var(--brand-700))",
        color: "#fff",
        fontWeight: 600,
        font: "inherit",
        cursor: "pointer",
        opacity: props.disabled ? 0.6 : 1,
        ...props.style,
      }}
    />
  );
}

export function Erro({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;
  return <div style={{ color: "var(--red-600, #9A3833)", fontSize: 13 }}>{mensagem}</div>;
}

export function Abas({
  ativa,
  aoMudar,
  abas,
}: {
  ativa: string;
  aoMudar: (id: string) => void;
  abas: { id: string; rotulo: string }[];
}) {
  return (
    <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border-default)" }}>
      {abas.map((a) => (
        <button
          key={a.id}
          onClick={() => aoMudar(a.id)}
          style={{
            padding: "8px 12px",
            border: "none",
            borderBottom: a.id === ativa ? "2px solid var(--brand-700)" : "2px solid transparent",
            background: "none",
            color: a.id === ativa ? "var(--text-body)" : "var(--text-muted)",
            fontWeight: a.id === ativa ? 600 : 400,
            fontSize: 13,
            cursor: "pointer",
            font: "inherit",
            marginBottom: -1,
          }}
        >
          {a.rotulo}
        </button>
      ))}
    </div>
  );
}
