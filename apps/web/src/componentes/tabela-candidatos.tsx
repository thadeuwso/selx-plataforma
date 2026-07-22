"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  ChipScore,
  ESTAGIOS,
  ROTULO_STATUS_CONVITE,
  TODOS_ESTAGIOS,
  rotuloEstagio,
  type Candidatura,
  type ListaPaginada,
} from "./recrutamento-compartilhado";

const ORDENACOES = [
  { valor: "prioridade", rotulo: "Prioridade SelX" },
  { valor: "aderencia_desc", rotulo: "Maior aderência" },
  { valor: "aderencia_asc", rotulo: "Menor aderência" },
  { valor: "recentes", rotulo: "Mais recentes" },
  { valor: "antigos", rotulo: "Mais antigos" },
  { valor: "nome", rotulo: "Nome" },
  { valor: "etapa", rotulo: "Etapa" },
];

function statusAvaliacao(c: Candidatura): { texto: string; cor: string } {
  const convite = c.convitesComportamentais[0];
  if (!convite) return { texto: "—", cor: "var(--text-muted)" };
  if (convite.sessao?.resultado) {
    const ader = convite.sessao.resultado.aderencias[0]?.aderenciaGeral;
    return { texto: ader != null ? `Concluída · ${ader}` : "Concluída", cor: "var(--green-700, #1D533B)" };
  }
  return { texto: ROTULO_STATUS_CONVITE[convite.status] ?? convite.status, cor: "var(--amber-700, #714E08)" };
}

export function TabelaCandidatos({
  codVag,
  recarregarToken,
  selecionados,
  alternarSelecao,
  selecionarVarios,
  abrirDrawer,
  onCarregou,
}: {
  codVag: string;
  recarregarToken: number;
  selecionados: string[];
  alternarSelecao: (codCdt: string) => void;
  selecionarVarios: (codCdts: string[], marcar: boolean) => void;
  abrirDrawer: (codCdt: string) => void;
  onCarregou: (itens: Candidatura[]) => void;
}) {
  const [itens, setItens] = useState<Candidatura[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina] = useState(25);
  const [ordenar, setOrdenar] = useState("prioridade");
  const [estagioFiltro, setEstagioFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [buscaAtiva, setBuscaAtiva] = useState("");
  const [aderenciaMin, setAderenciaMin] = useState("");
  const [densidade, setDensidade] = useState<"confortavel" | "compacta">("confortavel");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const ehFavorito = (c: Candidatura) => (c.favoritas?.length ?? 0) > 0;

  /**
   * Alterna o favorito e recarrega. Sem otimismo na tela: favoritar é barato e
   * a confirmação vinda do servidor evita mostrar estrela cheia se falhou.
   */
  async function alternarFavorito(c: Candidatura) {
    await api(`/candidaturas/${c.codCdt}/favorito`, { metodo: ehFavorito(c) ? "DELETE" : "POST" });
    await carregar();
  }

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(false);
    const params = new URLSearchParams({ pagina: String(pagina), tamanhoPagina: String(tamanhoPagina), ordenar });
    if (estagioFiltro) params.set("estagio", estagioFiltro);
    if (buscaAtiva) params.set("busca", buscaAtiva);
    if (aderenciaMin) params.set("aderenciaMin", aderenciaMin);
    const r = await api<ListaPaginada>(`/vagas/${codVag}/candidaturas?${params.toString()}`);
    setCarregando(false);
    if (r.status !== 200 || !r.json) {
      setErro(true);
      return;
    }
    setItens(r.json.itens);
    setTotal(r.json.total);
    onCarregou(r.json.itens);
  }, [codVag, pagina, tamanhoPagina, ordenar, estagioFiltro, buscaAtiva, aderenciaMin, onCarregou]);

  useEffect(() => {
    void carregar();
  }, [carregar, recarregarToken]);

  useEffect(() => {
    setPagina(1);
  }, [ordenar, estagioFiltro, buscaAtiva, aderenciaMin]);

  const totalPaginas = Math.max(1, Math.ceil(total / tamanhoPagina));
  const padCel = densidade === "compacta" ? "6px 10px" : "10px 12px";
  const cel: React.CSSProperties = { padding: padCel, fontSize: 13, borderBottom: "1px solid var(--border-default)", textAlign: "left", verticalAlign: "middle" };
  const celCabecalho: React.CSSProperties = { ...cel, fontWeight: 600, color: "var(--text-muted)", position: "sticky", top: 0, background: "var(--surface-page)", zIndex: 1 };

  const idsPagina = itens.map((c) => c.codCdt);
  const todosSelecionados = idsPagina.length > 0 && idsPagina.every((id) => selecionados.includes(id));

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <form
          onSubmit={(e) => { e.preventDefault(); setBuscaAtiva(busca.trim()); }}
          style={{ display: "flex", gap: 6 }}
        >
          <input
            placeholder="Buscar por nome ou e-mail…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid var(--border-default)", borderRadius: 8, background: "var(--surface-default)", color: "var(--text-body)", fontFamily: "inherit", fontSize: 13, width: 240 }}
          />
        </form>
        <select value={ordenar} onChange={(e) => setOrdenar(e.target.value)} style={estiloSelect}>
          {ORDENACOES.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
        </select>
        <select value={estagioFiltro} onChange={(e) => setEstagioFiltro(e.target.value)} style={estiloSelect}>
          <option value="">Todas as etapas</option>
          {TODOS_ESTAGIOS.map((e) => <option key={e.chave} value={e.chave}>{e.rotulo}</option>)}
        </select>
        <select value={aderenciaMin} onChange={(e) => setAderenciaMin(e.target.value)} style={estiloSelect}>
          <option value="">Qualquer aderência</option>
          <option value="75">Alta (≥75)</option>
          <option value="50">Média (≥50)</option>
        </select>
        <button
          onClick={() => setDensidade((d) => (d === "confortavel" ? "compacta" : "confortavel"))}
          style={{ ...estiloSelect, cursor: "pointer", marginLeft: "auto" }}
        >
          {densidade === "confortavel" ? "Densidade compacta" : "Densidade confortável"}
        </button>
      </div>

      <div style={{ background: "var(--surface-default)", border: "1px solid var(--border-default)", borderRadius: 10, overflow: "auto", maxHeight: "calc(100vh - 340px)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ ...celCabecalho, width: 36 }}>
                <input
                  type="checkbox"
                  checked={todosSelecionados}
                  onChange={(e) => selecionarVarios(idsPagina, e.target.checked)}
                  aria-label="Selecionar página"
                />
              </th>
              <th style={{ ...celCabecalho, width: 30 }} title="Favoritos (só seus)">★</th>
              <th style={celCabecalho}>Candidato</th>
              <th style={celCabecalho}>Cargo atual</th>
              <th style={celCabecalho}>Local</th>
              <th style={celCabecalho}>Geral</th>
              <th style={celCabecalho}>Técnica</th>
              <th style={celCabecalho}>Comportamental</th>
              <th style={celCabecalho}>Gaps</th>
              <th style={celCabecalho}>Etapa</th>
              <th style={celCabecalho}>Avaliação</th>
              <th style={celCabecalho}>Origem</th>
              <th style={celCabecalho}>Inscrição</th>
            </tr>
          </thead>
          <tbody>
            {carregando && itens.length === 0 &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  <td style={cel} colSpan={13}>
                    <div style={{ height: 16, background: "var(--surface-page)", borderRadius: 4, opacity: 0.6 }} />
                  </td>
                </tr>
              ))}
            {!carregando && erro && (
              <tr><td style={{ ...cel, textAlign: "center", color: "var(--red-600, #9A3833)", padding: 24 }} colSpan={13}>
                Não foi possível carregar os candidatos. <button onClick={() => carregar()} style={{ color: "var(--text-link)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit" }}>Tentar de novo</button>
              </td></tr>
            )}
            {!carregando && !erro && itens.length === 0 && (
              <tr><td style={{ ...cel, textAlign: "center", color: "var(--text-muted)", padding: 24 }} colSpan={13}>Nenhum candidato para esses filtros.</td></tr>
            )}
            {itens.map((c) => {
              const av = statusAvaliacao(c);
              const comp = c.convitesComportamentais[0]?.sessao?.resultado?.aderencias[0]?.aderenciaGeral;
              return (
                <tr
                  key={c.codCdt}
                  onClick={() => abrirDrawer(c.codCdt)}
                  style={{ cursor: "pointer", background: selecionados.includes(c.codCdt) ? "var(--brand-50, #F2E9E2)" : undefined }}
                >
                  <td style={cel} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selecionados.includes(c.codCdt)} onChange={() => alternarSelecao(c.codCdt)} aria-label={`Selecionar ${c.candidato.nomeCand}`} />
                  </td>
                  <td style={cel} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => alternarFavorito(c)}
                      title={ehFavorito(c) ? "Remover dos meus favoritos" : "Marcar como meu favorito"}
                      style={{
                        background: "none", border: "none", cursor: "pointer", padding: 0,
                        fontSize: 15, lineHeight: 1,
                        color: ehFavorito(c) ? "var(--amber-700, #714E08)" : "var(--border-default)",
                      }}
                    >
                      {ehFavorito(c) ? "★" : "☆"}
                    </button>
                  </td>
                  <td style={cel}>
                    <div style={{ fontWeight: 600 }}>{c.candidato.nomeCand}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{c.candidato.email}</div>
                    {(c.candidato.tags?.length ?? 0) > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                        {c.candidato.tags!.map((t) => (
                          <span
                            key={t.tag.codTag}
                            style={{
                              fontSize: 10, padding: "1px 7px", borderRadius: 999,
                              background: t.tag.cor, color: "#fff", whiteSpace: "nowrap",
                            }}
                          >
                            {t.tag.nome}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ ...cel, color: "var(--text-muted)" }}>{c.candidato.cargoAtual ?? "—"}</td>
                  <td style={{ ...cel, color: "var(--text-muted)" }}>{c.candidato.cidade ?? "—"}</td>
                  <td style={cel}><ChipScore score={c.match?.scoreContratacao} titulo="Prioridade de contratação (composto)" /></td>
                  <td style={cel}><ChipScore score={c.match?.scoreGeral} titulo="Aderência técnica (match de requisitos)" /></td>
                  <td style={cel}>{comp != null ? <ChipScore score={comp} titulo="Aderência comportamental" /> : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  <td style={cel}>
                    {c.match && c.match.qtdGapsCrit > 0
                      ? <span style={{ color: "var(--red-600, #9A3833)", fontWeight: 600 }}>{c.match.qtdGapsCrit}</span>
                      : <span style={{ color: "var(--text-muted)" }}>0</span>}
                    {c.knockoutJson && <span title={`Eliminatória: ${c.knockoutJson.pergunta}`}> ⚠️</span>}
                  </td>
                  <td style={{ ...cel, whiteSpace: "nowrap" }}>{rotuloEstagio(c.estagio)}</td>
                  <td style={{ ...cel, color: av.cor, whiteSpace: "nowrap" }}>{av.texto}</td>
                  <td style={{ ...cel, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{c.canal.nomeCanal}</td>
                  <td style={{ ...cel, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{new Date(c.dhInc).toLocaleDateString("pt-BR")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
        <span>{total} candidato(s){estagioFiltro ? ` em ${ESTAGIOS.find((e) => e.chave === estagioFiltro)?.rotulo ?? estagioFiltro}` : ""}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1} style={estiloPaginacao(pagina <= 1)}>← Anterior</button>
          <span>Página {pagina} de {totalPaginas}</span>
          <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas} style={estiloPaginacao(pagina >= totalPaginas)}>Próxima →</button>
        </div>
      </div>
    </div>
  );
}

const estiloSelect: React.CSSProperties = {
  padding: "8px 12px", border: "1px solid var(--border-default)", borderRadius: 8, background: "var(--surface-default)", color: "var(--text-body)", fontFamily: "inherit", fontSize: 13,
};
function estiloPaginacao(desabilitado: boolean): React.CSSProperties {
  return {
    padding: "6px 12px", border: "1px solid var(--border-default)", borderRadius: 8, background: "var(--surface-default)",
    color: desabilitado ? "var(--text-muted)" : "var(--text-body)", fontFamily: "inherit", fontSize: 13, cursor: desabilitado ? "not-allowed" : "pointer", opacity: desabilitado ? 0.5 : 1,
  };
}
