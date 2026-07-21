"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PerfilComportamentalForm, estadoInicialFatores, type PerfilFormState } from "@/componentes/perfil-comportamental-form";

interface PerfilPadrao {
  codPerPad: string;
  fatores: { fator: { sigla: string }; minimo: number; maximo: number; eliminatorio: string }[];
}

export default function PaginaComportamentalPadrao() {
  const [perfil, setPerfil] = useState<PerfilPadrao | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await api<PerfilPadrao | null>("/gestao-pessoas/perfil-comportamental-padrao");
    if (r.status === 200) setPerfil(r.json);
    setCarregado(true);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar(fatores: { sigla: string; minimo: number; maximo: number; eliminatorio: "S" | "N" }[]) {
    const r = await api("/gestao-pessoas/perfil-comportamental-padrao", { metodo: "POST", corpo: { fatores } });
    if (r.status !== 201) {
      alert("Não foi possível salvar o padrão comportamental da empresa.");
      return;
    }
    setMensagem("Padrão salvo — vagas sem perfil próprio passam a usar esta faixa.");
    setTimeout(() => setMensagem(null), 4000);
    await carregar();
  }

  if (!carregado) return null;

  const valorInicial: PerfilFormState = perfil ? estadoInicialFatores(perfil.fatores) : {};

  return (
    <main style={{ padding: 32, maxWidth: 560 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Padrão Comportamental</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Faixa desejada por fator (DIR/CON/SUS/PRE) usada como fallback em qualquer vaga que não tenha o próprio
          perfil comportamental configurado. Configurar o perfil de uma vaga específica sempre tem prioridade sobre
          este padrão.
        </p>
      </header>

      {mensagem && (
        <div
          style={{
            marginBottom: 16,
            padding: "8px 14px",
            borderRadius: 8,
            background: "var(--green-100, #D6E9DF)",
            color: "var(--green-700, #1D533B)",
            fontSize: 13,
          }}
        >
          {mensagem}
        </div>
      )}

      <PerfilComportamentalForm valorInicial={valorInicial} aoSalvar={salvar} rotuloBotao="Salvar padrão da empresa" />
    </main>
  );
}
