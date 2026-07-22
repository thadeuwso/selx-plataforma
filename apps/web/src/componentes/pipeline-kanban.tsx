"use client";
import { useCallback, useEffect, useState } from "react";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@/lib/api";
import {
  ESTAGIOS,
  ROTULO_STATUS_CONVITE,
  corPorScore,
  type Candidatura,
  type ListaPaginada,
} from "./recrutamento-compartilhado";

const TAM_PAGINA_COLUNA = 20;

function CardKanban({
  c,
  abrirDrawer,
  selecionados,
  alternarSelecao,
}: {
  c: Candidatura;
  abrirDrawer: (codCdt: string) => void;
  selecionados: string[];
  alternarSelecao: (codCdt: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: c.codCdt });
  const convite = c.convitesComportamentais[0];
  const comportamentalConcluido = convite?.sessao?.resultado;
  const corScore = corPorScore(c.match?.scoreGeral);
  const corComp = corPorScore(comportamentalConcluido?.aderencias[0]?.aderenciaGeral);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-codcdt={c.codCdt}
      onClick={() => abrirDrawer(c.codCdt)}
      style={{
        background: "var(--surface-default)",
        border: "1px solid var(--border-default)",
        borderRadius: 8,
        padding: 10,
        fontSize: 13,
        cursor: "pointer",
        touchAction: "none",
        opacity: isDragging ? 0.4 : 1,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 6 }}>
        <div style={{ fontWeight: 600 }}>{c.candidato.nomeCand}</div>
        {comportamentalConcluido && (
          <label
            title="Selecionar para comparar"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
          >
            <input type="checkbox" checked={selecionados.includes(c.codCdt)} onChange={() => alternarSelecao(c.codCdt)} />
          </label>
        )}
      </div>
      {c.candidato.cargoAtual && <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{c.candidato.cargoAtual}</div>}
      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
        {[c.candidato.cidade, `via ${c.canal.nomeCanal}`].filter(Boolean).join(" · ")}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
        {corScore && c.match && (
          <span title={`Aderência: ${c.match.scoreGeral}`} style={{ padding: "2px 7px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: corScore.bg, color: corScore.fg }}>
            {c.match.scoreGeral}
          </span>
        )}
        {c.knockoutJson && <span title={`Resposta eliminatória em "${c.knockoutJson.pergunta}"`}>⚠️</span>}
        {comportamentalConcluido ? (
          <span
            title="Aderência comportamental"
            style={{ padding: "2px 7px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: corComp?.bg, color: corComp?.fg }}
          >
            🧭 {comportamentalConcluido.aderencias[0]?.aderenciaGeral ?? ""}
          </span>
        ) : convite ? (
          <span title={`Avaliação comportamental: ${ROTULO_STATUS_CONVITE[convite.status] ?? convite.status}`} style={{ opacity: 0.5 }}>🧭</span>
        ) : null}
      </div>
    </div>
  );
}

function ColunaKanban({
  col,
  estado,
  carregarMais,
  abrirDrawer,
  selecionados,
  alternarSelecao,
}: {
  col: { chave: string; rotulo: string };
  estado: { itens: Candidatura[]; total: number; pagina: number };
  carregarMais: (estagio: string) => void;
  abrirDrawer: (codCdt: string) => void;
  selecionados: string[];
  alternarSelecao: (codCdt: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.chave });
  const temMais = estado.itens.length < estado.total;
  return (
    <div
      ref={setNodeRef}
      data-coluna={col.chave}
      style={{
        width: 320,
        flexShrink: 0,
        background: isOver ? "var(--brand-50, #F2E9E2)" : "var(--surface-page)",
        border: "1px solid var(--border-default)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 320px)",
      }}
    >
      <div
        style={{
          fontSize: 13, fontWeight: 600, padding: 10, display: "flex", justifyContent: "space-between",
          position: "sticky", top: 0, background: "inherit", borderBottom: "1px solid var(--border-default)", borderRadius: "10px 10px 0 0",
        }}
      >
        {col.rotulo}
        <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{estado.total}</span>
      </div>
      <div style={{ display: "grid", gap: 8, padding: 10, overflowY: "auto" }}>
        {estado.itens.map((c) => (
          <CardKanban key={c.codCdt} c={c} abrirDrawer={abrirDrawer} selecionados={selecionados} alternarSelecao={alternarSelecao} />
        ))}
        {temMais && (
          <button
            onClick={() => carregarMais(col.chave)}
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border-default)", background: "var(--surface-default)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
          >
            Mostrar mais ({estado.total - estado.itens.length})
          </button>
        )}
        {estado.itens.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", padding: 4 }}>—</div>}
      </div>
    </div>
  );
}

export function PipelineKanban({
  codVag,
  recarregarToken,
  abrirDrawer,
  selecionados,
  alternarSelecao,
  aoMover,
  onCarregou,
}: {
  codVag: string;
  recarregarToken: number;
  abrirDrawer: (codCdt: string) => void;
  selecionados: string[];
  alternarSelecao: (codCdt: string) => void;
  aoMover: () => void;
  onCarregou?: (itens: Candidatura[]) => void;
}) {
  const [colunas, setColunas] = useState<Record<string, { itens: Candidatura[]; total: number; pagina: number }>>({});
  const dndSensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    if (onCarregou) onCarregou(Object.values(colunas).flatMap((c) => c.itens));
  }, [colunas, onCarregou]);

  const carregarColuna = useCallback(
    async (estagio: string, pagina: number, anexar: boolean) => {
      const r = await api<ListaPaginada>(
        `/vagas/${codVag}/candidaturas?estagio=${estagio}&pagina=${pagina}&tamanhoPagina=${TAM_PAGINA_COLUNA}&ordenar=prioridade`,
      );
      if (r.status !== 200 || !r.json) return;
      setColunas((atual) => ({
        ...atual,
        [estagio]: {
          itens: anexar ? [...(atual[estagio]?.itens ?? []), ...r.json!.itens] : r.json!.itens,
          total: r.json!.total,
          pagina,
        },
      }));
    },
    [codVag],
  );

  useEffect(() => {
    for (const col of ESTAGIOS) void carregarColuna(col.chave, 1, false);
  }, [carregarColuna, recarregarToken]);

  function carregarMais(estagio: string) {
    const prox = (colunas[estagio]?.pagina ?? 1) + 1;
    void carregarColuna(estagio, prox, true);
  }

  async function aoTerminarArrastar(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over) return;
    const codCdt = String(active.id);
    const destino = String(over.id);
    const origem = ESTAGIOS.find((col) => colunas[col.chave]?.itens.some((c) => c.codCdt === codCdt))?.chave;
    if (!origem || origem === destino) return;
    await api(`/candidaturas/${codCdt}/estagio`, { metodo: "PATCH", corpo: { estagio: destino } });
    await Promise.all([carregarColuna(origem, 1, false), carregarColuna(destino, 1, false)]);
    aoMover();
  }

  return (
    <DndContext sensors={dndSensores} onDragEnd={aoTerminarArrastar}>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {ESTAGIOS.map((col) => (
          <ColunaKanban
            key={col.chave}
            col={col}
            estado={colunas[col.chave] ?? { itens: [], total: 0, pagina: 1 }}
            carregarMais={carregarMais}
            abrirDrawer={abrirDrawer}
            selecionados={selecionados}
            alternarSelecao={alternarSelecao}
          />
        ))}
      </div>
    </DndContext>
  );
}
