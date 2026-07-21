"use client";
import { useState } from "react";
import { BotaoPrimario, Campo, Entrada } from "./formulario";

export const FATORES_COMPORTAMENTAIS = [
  { sigla: "DIR", rotulo: "Direcionamento" },
  { sigla: "CON", rotulo: "Conexão" },
  { sigla: "SUS", rotulo: "Sustentação" },
  { sigla: "PRE", rotulo: "Precisão" },
] as const;

export interface FatorFormState {
  incluir: boolean;
  minimo: string;
  maximo: string;
  eliminatorio: boolean;
}
export type PerfilFormState = Record<string, FatorFormState>;

export function estadoInicialFatores(fatores: { fator: { sigla: string }; minimo: number; maximo: number; eliminatorio: string }[]): PerfilFormState {
  const preenchido: PerfilFormState = {};
  for (const f of fatores) {
    preenchido[f.fator.sigla] = {
      incluir: true,
      minimo: String(f.minimo),
      maximo: String(f.maximo),
      eliminatorio: f.eliminatorio === "S",
    };
  }
  return preenchido;
}

export function PerfilComportamentalForm({
  valorInicial,
  aoSalvar,
  rotuloBotao = "Salvar perfil comportamental",
}: {
  valorInicial: PerfilFormState;
  aoSalvar: (fatores: { sigla: string; minimo: number; maximo: number; eliminatorio: "S" | "N" }[]) => Promise<void>;
  rotuloBotao?: string;
}) {
  const [form, setForm] = useState<PerfilFormState>(valorInicial);
  const [salvando, setSalvando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const fatores = FATORES_COMPORTAMENTAIS.filter((f) => form[f.sigla]?.incluir).map((f) => {
      const v = form[f.sigla];
      return {
        sigla: f.sigla,
        minimo: Number(v.minimo || 0),
        maximo: Number(v.maximo || 100),
        eliminatorio: (v.eliminatorio ? "S" : "N") as "S" | "N",
      };
    });
    await aoSalvar(fatores);
    setSalvando(false);
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
        Faixa desejada (0-100) por fator. Marque só os fatores relevantes — os demais ficam de fora da aderência.
      </p>
      {FATORES_COMPORTAMENTAIS.map((f) => {
        const v = form[f.sigla] ?? { incluir: false, minimo: "", maximo: "", eliminatorio: false };
        const atualizar = (patch: Partial<FatorFormState>) => setForm({ ...form, [f.sigla]: { ...v, ...patch } });
        return (
          <div key={f.sigla} style={{ border: "1px solid var(--border-default)", borderRadius: 8, padding: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
              <input type="checkbox" checked={v.incluir} onChange={(e) => atualizar({ incluir: e.target.checked })} />
              {f.rotulo}
            </label>
            {v.incluir && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <Campo rotulo="Mínimo">
                  <Entrada type="number" min={0} max={100} value={v.minimo} onChange={(e) => atualizar({ minimo: e.target.value })} />
                </Campo>
                <Campo rotulo="Máximo">
                  <Entrada type="number" min={0} max={100} value={v.maximo} onChange={(e) => atualizar({ maximo: e.target.value })} />
                </Campo>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, gridColumn: "1 / -1" }}>
                  <input type="checkbox" checked={v.eliminatorio} onChange={(e) => atualizar({ eliminatorio: e.target.checked })} />
                  Fora da faixa elimina o candidato
                </label>
              </div>
            )}
          </div>
        );
      })}
      <BotaoPrimario type="submit" disabled={salvando}>
        {salvando ? "Salvando..." : rotuloBotao}
      </BotaoPrimario>
    </form>
  );
}
