"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ESTAGIOS, ListaPaginada, rotuloEstagio, useVagaContexto } from "@/componentes/recrutamento-compartilhado";

export default function VisaoGeralVaga() {
  const { codVag } = useParams<{ codVag: string }>();
  const { recarregarToken } = useVagaContexto();
  const [porEstagio, setPorEstagio] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);

  const carregar = useCallback(async () => {
    const resultados = await Promise.all(
      ESTAGIOS.map((e) => api<ListaPaginada>(`/vagas/${codVag}/candidaturas?estagio=${e.chave}&tamanhoPagina=1`)),
    );
    const mapa: Record<string, number> = {};
    let soma = 0;
    resultados.forEach((r, i) => {
      const t = r.json?.total ?? 0;
      mapa[ESTAGIOS[i].chave] = t;
      soma += t;
    });
    setPorEstagio(mapa);
    setTotal(soma);
  }, [codVag]);

  useEffect(() => { void carregar(); }, [carregar, recarregarToken]);

  const maxEtapa = Math.max(1, ...Object.values(porEstagio));

  return (
    <main style={{ padding: 24, maxWidth: 640 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>Funil da vaga</h2>
      <div style={{ display: "grid", gap: 8 }}>
        {ESTAGIOS.map((e) => {
          const n = porEstagio[e.chave] ?? 0;
          return (
            <Link
              key={e.chave}
              href={`/app/recrutamento/vagas/${codVag}?estagio=${e.chave}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 120, fontSize: 13, color: "var(--text-body)" }}>{rotuloEstagio(e.chave)}</span>
                <div style={{ flex: 1, height: 22, background: "var(--surface-page)", borderRadius: 6, overflow: "hidden", border: "1px solid var(--border-default)" }}>
                  <div style={{ height: "100%", width: `${(n / maxEtapa) * 100}%`, background: "var(--brand-500, #8A5B3F)", minWidth: n > 0 ? 2 : 0 }} />
                </div>
                <span style={{ width: 32, textAlign: "right", fontSize: 13, fontWeight: 600 }}>{n}</span>
              </div>
            </Link>
          );
        })}
      </div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 16 }}>
        {total} candidato(s) em etapas ativas. Etapas encerradas (eliminado/não selecionado/arquivado) não aparecem aqui.
      </p>
    </main>
  );
}
