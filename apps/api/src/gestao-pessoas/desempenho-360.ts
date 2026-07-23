/**
 * Regras puras do Painel 360 — desempenho (performance-360, Fase 4).
 * Testáveis sem banco. Faixas hoje fixas (espelham o ADL de referência);
 * tornam-se configuráveis por tenant numa fase futura.
 */

export interface Faixa {
  chave: string;
  rotulo: string;
  min: number;
  max: number;
}

/** Faixas de classificação, do maior para o menor (ordem de exibição). */
export const FAIXAS: Faixa[] = [
  { chave: 'EXCELENTE', rotulo: 'Excelente', min: 4.5, max: 5.0 },
  { chave: 'BOM', rotulo: 'Bom desempenho', min: 3.5, max: 4.49 },
  { chave: 'REGULAR', rotulo: 'Regular', min: 2.5, max: 3.49 },
  { chave: 'ABAIXO', rotulo: 'Abaixo do esperado', min: 1.5, max: 2.49 },
  { chave: 'INSATISFATORIO', rotulo: 'Insatisfatório', min: 1.0, max: 1.49 },
];

/**
 * Classificação de uma nota geral (1..5). `null` quando não há nota — ausência
 * de avaliação não é "insatisfatório".
 */
export function classificacaoDesempenho(nota: number | null): Faixa | null {
  if (nota === null || !Number.isFinite(nota)) return null;
  // A primeira faixa cujo mínimo a nota alcança (lista já ordenada desc).
  return FAIXAS.find((f) => nota >= f.min) ?? FAIXAS[FAIXAS.length - 1];
}

export interface FaixaDistribuicao {
  chave: string;
  rotulo: string;
  quantidade: number;
  percentual: number;
}

/**
 * Distribui as notas por competência (cada uma 1..5) nas faixas. Serve ao
 * "resumo da avaliação" (quantos critérios em cada nível), com percentual —
 * nunca só cor.
 */
export function distribuicaoPorFaixa(notas: number[]): FaixaDistribuicao[] {
  const total = notas.length;
  return FAIXAS.map((f) => {
    const quantidade = notas.filter((n) => n >= f.min && n <= f.max).length;
    return {
      chave: f.chave,
      rotulo: f.rotulo,
      quantidade,
      percentual: total === 0 ? 0 : Math.round((quantidade / total) * 100),
    };
  });
}
