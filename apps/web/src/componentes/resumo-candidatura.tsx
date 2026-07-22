"use client";
import { rotuloEstagio } from "./recrutamento-compartilhado";

const DIMENSOES_CULTURA = [
  { chave: "autonomy", rotulo: "Autonomia" },
  { chave: "pace", rotulo: "Ritmo" },
  { chave: "collaboration", rotulo: "Colaboração" },
  { chave: "structure", rotulo: "Estrutura" },
  { chave: "dataDriven", rotulo: "Orientação a dados" },
  { chave: "directCommunication", rotulo: "Comunicação direta" },
] as const;

const ROTULO_STATUS_CONVITE: Record<string, string> = {
  PENDENTE: "Convite enviado",
  ACEITO: "Respondendo",
  REVOGADO: "Revogado",
  EXPIRADO: "Expirado",
};

export interface SituacaoCandidatura {
  diasNaEtapa: number;
  curriculo: { dhInc: string; temTexto: boolean } | null;
  comportamental: { status: string; concluida: boolean; dhConclusao: string | null } | null;
  analise: { dhInc: string } | null;
}

export interface RequisitoAvaliado {
  codVagReq: string;
  descrReq: string;
  tipoReq: string;
  scorePct: number;
  evidenciaTexto: string | null;
  evidenciaCurriculo: string | null;
}

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

function Bloco({ titulo, apoio, children }: { titulo: string; apoio?: string; children: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid var(--border-default)", borderRadius: 10, padding: 14 }}>
      <div style={{ marginBottom: 10 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{titulo}</h4>
        {apoio && <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>{apoio}</p>}
      </div>
      {children}
    </section>
  );
}

/** Linha de situação: um pendente é acionável, um concluído é só informação. */
function ItemSituacao({ rotulo, valor, pendente }: { rotulo: string; valor: string; pendente?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, padding: "5px 0" }}>
      <span style={{ color: "var(--text-muted)" }}>{rotulo}</span>
      <span style={{ fontWeight: pendente ? 400 : 500, color: pendente ? "var(--amber-700, #714E08)" : "var(--text-body)", textAlign: "right" }}>
        {valor}
      </span>
    </div>
  );
}

/**
 * Resumo da candidatura — o quadro que responde, sem abrir outra aba: em que
 * etapa está, o que falta, quanto o currículo comprova e de onde vem cada
 * número.
 *
 * Tudo aqui é **determinístico**: etapa, contagem de dias, evidência buscada no
 * texto do currículo e scores do motor de match. Nada é interpretação — essa
 * mora na aba Dossiê, e é a diferença que justifica as duas existirem.
 */
export function ResumoCandidatura({
  estagio,
  situacao,
  match,
  requisitos,
  perfilCandidato,
  perfilIdeal,
  aoIrParaDossie,
}: {
  estagio: string;
  situacao: SituacaoCandidatura | null;
  match: { scoreGeral: number; scoreContratacao: number; scoreCultura: number | null; driverPrincipal: string | null; qtdGapsCrit: number } | null;
  requisitos: RequisitoAvaliado[];
  perfilCandidato: Record<string, number> | null;
  perfilIdeal: Record<string, number> | null;
  aoIrParaDossie: () => void;
}) {
  const comprovados = requisitos.filter((r) => r.evidenciaCurriculo);
  const semEvidencia = requisitos.filter((r) => !r.evidenciaCurriculo);
  const obrigatoriosSemEvidencia = semEvidencia.filter((r) => r.tipoReq === "OBRIGATORIO");

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, alignItems: "start" }}>
        <Bloco titulo="Onde está" apoio="Etapa atual no processo desta vaga">
          <div style={{ fontSize: 18, fontWeight: 700 }}>{rotuloEstagio(estagio)}</div>
          {situacao && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {situacao.diasNaEtapa === 0
                ? "mudou hoje"
                : `há ${situacao.diasNaEtapa} dia${situacao.diasNaEtapa > 1 ? "s" : ""} nesta etapa`}
            </div>
          )}
        </Bloco>

        <Bloco titulo="O que já temos" apoio="Insumos disponíveis para decidir">
          {situacao === null ? (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Carregando…</p>
          ) : (
            <>
              <ItemSituacao
                rotulo="Currículo"
                pendente={!situacao.curriculo}
                valor={
                  situacao.curriculo
                    ? situacao.curriculo.temTexto
                      ? `anexado em ${dataCurta(situacao.curriculo.dhInc)}`
                      : "anexado, sem texto extraído"
                    : "não enviado"
                }
              />
              <ItemSituacao
                rotulo="Avaliação comportamental"
                pendente={!situacao.comportamental?.concluida}
                valor={
                  !situacao.comportamental
                    ? "não solicitada"
                    : situacao.comportamental.concluida
                      ? `concluída em ${dataCurta(situacao.comportamental.dhConclusao!)}`
                      : (ROTULO_STATUS_CONVITE[situacao.comportamental.status] ?? situacao.comportamental.status)
                }
              />
              <ItemSituacao
                rotulo="Dossiê"
                pendente={!situacao.analise}
                valor={situacao.analise ? `gerado em ${dataCurta(situacao.analise.dhInc)}` : "não gerado"}
              />
            </>
          )}
        </Bloco>

        <Bloco titulo="Aderência" apoio="Calculada pelo motor de match, sem IA">
          {match ? (
            <>
              <div style={{ display: "flex", gap: 18 }}>
                <Numero rotulo="Geral" valor={match.scoreGeral} />
                <Numero rotulo="Contratação" valor={match.scoreContratacao} />
                <Numero rotulo="Cultural" valor={match.scoreCultura} />
              </div>
              {match.driverPrincipal && (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                  Ponto forte: {match.driverPrincipal}
                </div>
              )}
              {match.qtdGapsCrit > 0 && (
                <div style={{ fontSize: 12, color: "var(--feedback-danger, #b91c1c)", marginTop: 2 }}>
                  {match.qtdGapsCrit} gap(s) em requisito obrigatório
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Sem match — a vaga não tem requisitos cadastrados ou o candidato não respondeu à autoavaliação.
            </p>
          )}
        </Bloco>
      </div>

      {requisitos.length > 0 && (
        <Bloco
          titulo="O que o currículo comprova"
          apoio="Busca literal no texto do currículo — sem IA. Confira o trecho antes de considerar comprovado."
        >
          {!situacao?.curriculo ? (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Sem currículo anexado, não há o que conferir. Os requisitos abaixo dependem só da autoavaliação.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {obrigatoriosSemEvidencia.length > 0 && (
                <p style={{ fontSize: 12, margin: "0 0 4px", color: "var(--feedback-danger, #b91c1c)" }}>
                  {obrigatoriosSemEvidencia.length} requisito(s) obrigatório(s) sem qualquer menção no currículo.
                </p>
              )}
              {[...comprovados, ...semEvidencia].map((r) => (
                <div key={r.codVagReq} style={{ display: "grid", gap: 2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
                    <span>
                      <span aria-hidden style={{ color: r.evidenciaCurriculo ? "var(--feedback-success, #15803d)" : "var(--text-muted)" }}>
                        ●
                      </span>{" "}
                      {r.descrReq}
                      {r.tipoReq === "OBRIGATORIO" && (
                        <span style={{ color: "var(--text-muted)" }}> (obrigatório)</span>
                      )}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                      {r.scorePct}%
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", paddingLeft: 14, fontStyle: r.evidenciaCurriculo ? "italic" : "normal" }}>
                    {r.evidenciaCurriculo ? `“${r.evidenciaCurriculo}”` : "sem menção encontrada no currículo"}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={aoIrParaDossie}
            style={{
              marginTop: 12, background: "none", border: "none", padding: 0,
              color: "var(--text-link)", cursor: "pointer", fontFamily: "inherit", fontSize: 12,
            }}
          >
            Ver a leitura completa no Dossiê →
          </button>
        </Bloco>
      )}

      {(perfilCandidato || perfilIdeal) && (
        <Bloco
          titulo="Perfil cultural"
          // Procedência explícita: o número parece medido, mas é estimativa de
          // quem cadastrou. Sem isso, "Fit cultural 88" passa por objetivo — e
          // ele pesa no score de contratação.
          apoio="O perfil do candidato é preenchido à mão pelo recrutador no cadastro da candidatura; o ideal vem das configurações da vaga. Não sai do currículo nem da avaliação comportamental."
        >
          {!perfilCandidato && (
            <p style={{ fontSize: 12, color: "var(--amber-700, #714E08)", margin: "0 0 8px" }}>
              Ninguém preencheu o perfil cultural deste candidato — por isso não há fit cultural calculado.
            </p>
          )}
          <div style={{ display: "grid", gap: 4 }}>
            {DIMENSOES_CULTURA.map((d) => {
              const ideal = perfilIdeal?.[d.chave];
              const cand = perfilCandidato?.[d.chave];
              if (ideal == null && cand == null) return null;
              return (
                <div key={d.chave} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span>{d.rotulo}</span>
                  <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {ideal ?? "—"} ideal · {cand ?? "—"} candidato
                  </span>
                </div>
              );
            })}
          </div>
        </Bloco>
      )}
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: number | null }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{rotulo}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{valor ?? "—"}</div>
    </div>
  );
}
