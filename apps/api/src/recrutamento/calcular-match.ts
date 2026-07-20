/**
 * Match determinístico (RN-REC-006) — porte fiel da fórmula validada em produção
 * no SelX 1.0 (backend/src/services/match/compatibilityV1.ts). Sem IA: o score
 * oficial nunca é decidido por LLM, só matemática explicável.
 *
 * Desvios conscientes do legado (ver "09 - Módulos/Recrutamento e Seleção/01 -
 * Modelo de Dados.md" — RN-REC-006): sem o fallback sim/não de formato antigo
 * (nossa UI sempre captura nível 0-4 direto); `evidenciaExigida` é só um hint de
 * UI (texto sempre pontua pelo tamanho, não há gate extra na fórmula).
 */
import { createHash } from 'node:crypto';

export interface RequisitoScoring {
  codVagReq: string;
  descrReq: string;
  tipoReq: 'OBRIGATORIO' | 'DESEJAVEL';
  peso: number;
  nivelEsperado: number | null;
  tempoEspMeses: number | null;
}

export interface AutoavaliacaoResp {
  nivel: number | null;
  tempoMeses: number | null;
  evidenciaTexto: string | null;
}

const DIMENSOES_CULTURA = [
  'autonomy', 'pace', 'collaboration', 'structure', 'dataDriven', 'directCommunication',
] as const;
export type PerfilCultural = Partial<Record<(typeof DIMENSOES_CULTURA)[number], number>>;

export interface ResultadoMatch {
  scoreGeral: number;
  scoreContratacao: number;
  scoreCultura: number | null;
  driverPrincipal: string | null;
  qtdGapsCrit: number;
  qtdGapsMelh: number;
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

/** score01 de um requisito: 0.55 nível + 0.35 tempo + 0.10 evidência (ou 0.80/0.20 sem tempo esperado). */
export function calcularScoreRequisito(req: RequisitoScoring, resp: AutoavaliacaoResp | undefined): number {
  const nivel = resp?.nivel ?? null;
  const tempo = resp?.tempoMeses ?? null;
  const evidenceScore = resp?.evidenciaTexto && resp.evidenciaTexto.trim().length >= 12 ? 1 : 0;

  let levelScore: number;
  if (req.nivelEsperado != null) {
    if (nivel == null) levelScore = 0;
    else if (req.nivelEsperado <= 0) levelScore = nivel > 0 ? 1 : 0;
    else levelScore = clamp01(nivel / req.nivelEsperado);
  } else {
    levelScore = nivel != null ? clamp01(nivel / 4) : 0;
  }

  if (req.tempoEspMeses != null) {
    const timeScore = tempo != null ? clamp01(tempo / req.tempoEspMeses) : 0;
    return clamp01(0.55 * levelScore + 0.35 * timeScore + 0.10 * evidenceScore);
  }
  return clamp01(0.80 * levelScore + 0.20 * evidenceScore);
}

/** Fit cultural: média de (1 - |candidato-ideal|/4) nas 6 dimensões fixas, escala 1-5. Null se faltar dado. */
export function calcularFitCultural(ideal: PerfilCultural | null, candidato: PerfilCultural | null): number | null {
  if (!ideal || !candidato) return null;
  const dims = DIMENSOES_CULTURA.filter((d) => ideal[d] != null && candidato[d] != null);
  if (dims.length === 0) return null;

  const soma = dims.reduce((acc, d) => {
    const v1 = Math.min(5, Math.max(1, Math.round(ideal[d] as number)));
    const v2 = Math.min(5, Math.max(1, Math.round(candidato[d] as number)));
    return acc + (1 - Math.abs(v2 - v1) / 4);
  }, 0);
  return Math.round((soma / dims.length) * 100);
}

/** Calcula e resume o match de uma candidatura. Null se a vaga não tem requisitos (nada a medir). */
export function calcularMatch(args: {
  requisitos: RequisitoScoring[];
  autoavaliacoes: Record<string, AutoavaliacaoResp>;
  perfilIdeal: PerfilCultural | null;
  perfilCandidato: PerfilCultural | null;
}): ResultadoMatch | null {
  const { requisitos, autoavaliacoes, perfilIdeal, perfilCandidato } = args;
  if (requisitos.length === 0) return null;

  const avaliados = requisitos.map((r) => ({
    requisito: r,
    score01: calcularScoreRequisito(r, autoavaliacoes[r.codVagReq]),
  }));

  const pesoTotal = avaliados.reduce((s, a) => s + a.requisito.peso, 0) || 1;
  let scoreGeral = (avaliados.reduce((s, a) => s + a.score01 * a.requisito.peso, 0) / pesoTotal) * 100;

  const obrigatoriosReprovados = avaliados.filter(
    (a) => a.requisito.tipoReq === 'OBRIGATORIO' && a.score01 < 0.6,
  );
  scoreGeral *= 0.92 ** obrigatoriosReprovados.length;
  scoreGeral = Math.round(clamp01(scoreGeral / 100) * 100);

  const gapsCriticos = avaliados.filter(
    (a) => (a.requisito.tipoReq === 'OBRIGATORIO' || a.requisito.peso >= 7) && a.score01 < 0.6,
  );
  const gapsMelhoria = avaliados
    .filter((a) => a.score01 < 0.5 && !gapsCriticos.includes(a))
    .sort((a, b) => b.requisito.peso - a.requisito.peso)
    .slice(0, 5);

  const scoreCultura = calcularFitCultural(perfilIdeal, perfilCandidato);

  const respondidos = avaliados.filter((a) => autoavaliacoes[a.requisito.codVagReq]);
  const engajamentoEvidencia = respondidos.length > 0
    ? respondidos.filter((a) => {
        const ev = autoavaliacoes[a.requisito.codVagReq]?.evidenciaTexto;
        return Boolean(ev && ev.trim().length >= 12);
      }).length / respondidos.length
    : 0;

  const obrigatorios = avaliados.filter((a) => a.requisito.tipoReq === 'OBRIGATORIO');
  const saudeObrigatorios = obrigatorios.length > 0
    ? ((obrigatorios.length - obrigatoriosReprovados.length) / obrigatorios.length) * 100
    : 100;

  const scoreContratacao = Math.round(
    clamp01(
      (scoreCultura != null
        ? 0.65 * scoreGeral + 0.20 * scoreCultura + 0.10 * saudeObrigatorios + 0.05 * (engajamentoEvidencia * 100)
        : (0.65 * scoreGeral + 0.10 * saudeObrigatorios + 0.05 * (engajamentoEvidencia * 100)) / 0.80) / 100,
    ) * 100,
  );

  // Driver principal: requisito com maior contribuição positiva (peso × score) — a maior força do candidato, não um gap.
  const driverPrincipal = [...avaliados].sort(
    (a, b) => b.requisito.peso * b.score01 - a.requisito.peso * a.score01,
  )[0]?.requisito.descrReq ?? null;

  return {
    scoreGeral,
    scoreContratacao,
    scoreCultura,
    driverPrincipal,
    qtdGapsCrit: gapsCriticos.length,
    qtdGapsMelh: gapsMelhoria.length,
  };
}

function stableStringify(valor: unknown): string {
  if (valor === null || typeof valor !== 'object') return JSON.stringify(valor);
  if (Array.isArray(valor)) return `[${valor.map(stableStringify).join(',')}]`;
  const chaves = Object.keys(valor as Record<string, unknown>).sort();
  return `{${chaves.map((k) => `${JSON.stringify(k)}:${stableStringify((valor as Record<string, unknown>)[k])}`).join(',')}}`;
}

/** Guarda de cache — recalcular só se a entrada mudou (sem outro papel). */
export function calcularHashEntrada(args: {
  requisitos: RequisitoScoring[];
  autoavaliacoes: Record<string, AutoavaliacaoResp>;
  perfilIdeal: PerfilCultural | null;
  perfilCandidato: PerfilCultural | null;
  versaoMatch: string;
}): string {
  return createHash('sha256').update(stableStringify(args)).digest('hex');
}
