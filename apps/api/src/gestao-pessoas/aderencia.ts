/**
 * Aderência ao desenvolvimento (RN-GP-023) — regra pura, testável sem banco.
 *
 * Responde "esta pessoa está engajando e progredindo?" a partir de sinais que
 * JÁ existem — progresso dos planos, ações atrasadas, feedback sem ciência,
 * nota do último ciclo. Não é um campo guardado (que envelheceria e mentiria):
 * é derivada, recalculada na hora.
 *
 * E **explica, não decide**: além do número, devolve os motivos (por que caiu)
 * e recomendações (o que fazer) — inclusive a semente do próximo plano. É o elo
 * que traz o desempenho de volta para o desenvolvimento.
 */

export interface SinaisAderencia {
  /** Planos com status ATIVO. Zero é o sinal mais forte: todo mundo deveria ter um. */
  planosAtivos: number;
  /** Média do progresso (0..100) dos planos ativos; null quando não há plano. */
  progressoMedio: number | null;
  /** Ações com prazo vencido e ainda não concluídas nem canceladas. */
  acoesAtrasadas: number;
  /** Feedbacks construtivos que a pessoa ainda não deu ciência (não leu). */
  feedbacksConstrutivosSemCiencia: number;
  /** Nota final (1..5) do último ciclo concluído; null se nunca avaliada. */
  ultimaNotaDesempenho: number | null;
}

export type NivelAderencia = 'ADERENTE' | 'ATENCAO' | 'RISCO';

export interface ResultadoAderencia {
  score: number; // 0..100
  nivel: NivelAderencia;
  motivos: string[];
  recomendacoes: string[];
}

const limitar = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function calcularAderencia(s: SinaisAderencia): ResultadoAderencia {
  const motivos: string[] = [];
  const recomendacoes: string[] = [];
  let score = 100;

  // Sem plano ativo — a lacuna de raiz. O PDI deveria nascer na admissão.
  if (s.planosAtivos === 0) {
    score -= 40;
    motivos.push('Sem plano de desenvolvimento ativo');
    recomendacoes.push('Criar um plano de desenvolvimento');
  } else if (s.progressoMedio !== null) {
    // Quanto mais parado o plano, mais pesa. Progresso 100 não tira nada.
    const penalidade = Math.round((100 - s.progressoMedio) * 0.3);
    if (penalidade > 0) {
      score -= penalidade;
      if (s.progressoMedio < 50) {
        motivos.push(`Planos com progresso baixo (${s.progressoMedio}%)`);
        recomendacoes.push('Retomar as ações do plano de desenvolvimento');
      }
    }
  }

  // Ações atrasadas — sinal forte de não-andamento. Teto para não zerar sozinho.
  if (s.acoesAtrasadas > 0) {
    score -= limitar(s.acoesAtrasadas * 10, 0, 30);
    motivos.push(`${s.acoesAtrasadas} ação(ões) de desenvolvimento atrasada(s)`);
    recomendacoes.push('Revisar prazos das ações atrasadas');
  }

  // Feedback construtivo sem ciência — não leu, então não engajou com o retorno.
  if (s.feedbacksConstrutivosSemCiencia > 0) {
    score -= limitar(s.feedbacksConstrutivosSemCiencia * 8, 0, 24);
    motivos.push(`${s.feedbacksConstrutivosSemCiencia} feedback(s) construtivo(s) sem ciência`);
    recomendacoes.push('Garantir que os feedbacks foram lidos e conversados');
  }

  // Desempenho do último ciclo. Nunca avaliado não penaliza — é ausência de dado.
  if (s.ultimaNotaDesempenho !== null) {
    if (s.ultimaNotaDesempenho <= 2) {
      score -= 20;
      motivos.push(`Desempenho abaixo do esperado no último ciclo (${s.ultimaNotaDesempenho.toFixed(1)})`);
      recomendacoes.push('Definir ações para as competências mais fracas do último ciclo');
    } else if (s.ultimaNotaDesempenho < 3.5) {
      score -= 8;
    }
  }

  score = limitar(score, 0, 100);
  const nivel: NivelAderencia = score >= 75 ? 'ADERENTE' : score >= 50 ? 'ATENCAO' : 'RISCO';

  return { score, nivel, motivos, recomendacoes };
}
