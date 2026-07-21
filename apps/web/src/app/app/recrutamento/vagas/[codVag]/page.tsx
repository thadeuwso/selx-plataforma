"use client";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { BotaoPrimario } from "@/componentes/formulario";
import { CandidatoDrawer } from "@/componentes/candidato-drawer";
import { TabelaCandidatos } from "@/componentes/tabela-candidatos";
import { PipelineKanban } from "@/componentes/pipeline-kanban";
import { GavetaComparacao, TODOS_ESTAGIOS, useVagaContexto, type Candidatura } from "@/componentes/recrutamento-compartilhado";

const ACOES_LOTE = [
  { estagio: "screening", rotulo: "Mover p/ Triagem" },
  { estagio: "interview", rotulo: "Marcar entrevista" },
  { estagio: "not_selected", rotulo: "Reprovar" },
  { estagio: "archived", rotulo: "Arquivar" },
];

export default function AbaCandidatos() {
  const { codVag } = useParams<{ codVag: string }>();
  const { recarregarToken, pedirRecarga } = useVagaContexto();
  const [modo, setModo] = useState<"lista" | "pipeline">("lista");
  const [drawerCodCdt, setDrawerCodCdt] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [carregadas, setCarregadas] = useState<Record<string, Candidatura>>({});
  const [comparacaoAberta, setComparacaoAberta] = useState(false);
  const [processandoLote, setProcessandoLote] = useState(false);
  const [tokenLocal, setTokenLocal] = useState(0);

  const recarregarTudo = useCallback(() => { setTokenLocal((t) => t + 1); pedirRecarga(); }, [pedirRecarga]);

  const registrarCarregadas = useCallback((itens: Candidatura[]) => {
    setCarregadas((atual) => {
      const novo = { ...atual };
      for (const c of itens) novo[c.codCdt] = c;
      return novo;
    });
  }, []);

  function alternarSelecao(codCdt: string) {
    setSelecionados((atual) => (atual.includes(codCdt) ? atual.filter((c) => c !== codCdt) : [...atual, codCdt]));
  }
  function selecionarVarios(codCdts: string[], marcar: boolean) {
    setSelecionados((atual) => (marcar ? Array.from(new Set([...atual, ...codCdts])) : atual.filter((c) => !codCdts.includes(c))));
  }

  const selecionadasObjs = useMemo(
    () => selecionados.map((id) => carregadas[id]).filter((c): c is Candidatura => !!c),
    [selecionados, carregadas],
  );

  async function moverLote(estagio: string) {
    if (selecionados.length === 0) return;
    const rotulo = ACOES_LOTE.find((a) => a.estagio === estagio)?.rotulo ?? estagio;
    if (!confirm(`${rotulo}: ${selecionados.length} candidatura(s)?`)) return;
    setProcessandoLote(true);
    const r = await api(`/vagas/${codVag}/candidaturas/mover-estagio-lote`, { metodo: "PATCH", corpo: { codCdts: selecionados, estagio } });
    setProcessandoLote(false);
    if (r.status !== 200) { alert("Não foi possível executar a ação em massa."); return; }
    setSelecionados([]);
    recarregarTudo();
  }

  async function solicitarAvaliacaoLote() {
    if (selecionados.length === 0) return;
    if (!confirm(`Enviar convite de avaliação comportamental para ${selecionados.length} candidatura(s)?`)) return;
    setProcessandoLote(true);
    await Promise.all(selecionados.map((id) => api(`/candidaturas/${id}/avaliacao-comportamental/convidar`, { metodo: "POST" })));
    setProcessandoLote(false);
    alert("Convites gerados.");
    recarregarTudo();
  }

  function exportarCsv() {
    const linhas = [["Nome", "E-mail", "Cargo atual", "Local", "Etapa", "Aderência geral", "Aderência técnica", "Gaps"].join(",")];
    for (const c of selecionadasObjs.length ? selecionadasObjs : Object.values(carregadas)) {
      const etapa = TODOS_ESTAGIOS.find((e) => e.chave === c.estagio)?.rotulo ?? c.estagio;
      linhas.push([
        `"${c.candidato.nomeCand}"`, c.candidato.email, `"${c.candidato.cargoAtual ?? ""}"`, `"${c.candidato.cidade ?? ""}"`,
        `"${etapa}"`, c.match?.scoreContratacao ?? "", c.match?.scoreGeral ?? "", c.match?.qtdGapsCrit ?? "",
      ].join(","));
    }
    const blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `candidatos-vaga-${codVag}.csv`; a.click();
  }

  function abrirComparacao() {
    if (selecionados.length < 2) { alert("Selecione ao menos 2 candidatos para comparar."); return; }
    if (selecionados.length > 5) { alert("Compare no máximo 5 candidatos por vez."); return; }
    setComparacaoAberta(true);
  }

  const tokenEfetivo = recarregarToken + tokenLocal;

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "inline-flex", border: "1px solid var(--border-default)", borderRadius: 8, overflow: "hidden" }}>
          {(["lista", "pipeline"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              style={{
                padding: "8px 16px", border: "none", cursor: "pointer", font: "inherit", fontSize: 13,
                background: modo === m ? "var(--brand-700)" : "var(--surface-default)",
                color: modo === m ? "#fff" : "var(--text-body)", fontWeight: modo === m ? 600 : 400,
              }}
            >
              {m === "lista" ? "Lista" : "Pipeline"}
            </button>
          ))}
          <button
            onClick={abrirComparacao}
            style={{ padding: "8px 16px", border: "none", borderLeft: "1px solid var(--border-default)", cursor: "pointer", font: "inherit", fontSize: 13, background: "var(--surface-default)", color: "var(--text-body)" }}
          >
            Comparação
          </button>
        </div>
      </div>

      {modo === "lista" ? (
        <TabelaCandidatos
          codVag={codVag}
          recarregarToken={tokenEfetivo}
          selecionados={selecionados}
          alternarSelecao={alternarSelecao}
          selecionarVarios={selecionarVarios}
          abrirDrawer={setDrawerCodCdt}
          onCarregou={registrarCarregadas}
        />
      ) : (
        <PipelineKanban
          codVag={codVag}
          recarregarToken={tokenEfetivo}
          abrirDrawer={setDrawerCodCdt}
          selecionados={selecionados}
          alternarSelecao={alternarSelecao}
          aoMover={pedirRecarga}
          onCarregou={registrarCarregadas}
        />
      )}

      {selecionados.length > 0 && (
        <div
          style={{
            position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
            background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10,
            padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 16px rgba(0,0,0,.15)", zIndex: 40, flexWrap: "wrap", maxWidth: "92vw",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600 }}>{selecionados.length} selecionado(s)</span>
          {ACOES_LOTE.map((a) => (
            <button key={a.estagio} onClick={() => moverLote(a.estagio)} disabled={processandoLote} style={estiloAcaoLote}>{a.rotulo}</button>
          ))}
          <button onClick={solicitarAvaliacaoLote} disabled={processandoLote} style={estiloAcaoLote}>Solicitar avaliação</button>
          <button onClick={exportarCsv} style={estiloAcaoLote}>Exportar CSV</button>
          <BotaoPrimario onClick={abrirComparacao} disabled={selecionados.length < 2} style={{ padding: "6px 12px", fontSize: 13 }}>Comparar</BotaoPrimario>
          <button onClick={() => setSelecionados([])} style={{ background: "none", border: "none", color: "var(--text-link)", cursor: "pointer", font: "inherit", fontSize: 13 }}>Limpar</button>
        </div>
      )}

      <GavetaComparacao candidaturas={selecionadasObjs.slice(0, 5)} aberta={comparacaoAberta} fechar={() => setComparacaoAberta(false)} />
      <CandidatoDrawer codCdt={drawerCodCdt} fechar={() => setDrawerCodCdt(null)} aoAtualizar={recarregarTudo} />
    </main>
  );
}

const estiloAcaoLote: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--surface-default)",
  color: "var(--text-body)", fontSize: 13, cursor: "pointer", font: "inherit",
};
