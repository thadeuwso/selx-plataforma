/**
 * Motor de pontuação da Avaliação Comportamental (RN-GP-006) — determinístico,
 * sem IA. Ver "09 - Módulos/Gestão de Pessoas/03 - Motor de Pontuação.md".
 */

export type TipoPergunta = 'DIRETA' | 'REVERSA';
export type IndicadorConsistencia = 'ADEQUADA' | 'REQUER_ATENCAO' | 'BAIXA_CONSISTENCIA';

export const VERSAO_ALGORITMO = 'v1';
export const VERSAO_FAIXA = 'FAIXA_V1';

export interface RespostaFator {
  codFat: string;
  tipo: TipoPergunta;
  peso: number;
  valor: number; // 1-5
}

export interface ResultadoFator {
  codFat: string;
  pontuacaoBruta: number;
  minimoPossivel: number;
  maximoPossivel: number;
  percentualNormalizado: number;
  media: number;
  desvio: number;
  faixaInterpretativa: string;
}

export interface ResultadoConsistencia {
  percRespNeutras: number;
  percRespUniformes: number;
  indicadorConsistencia: IndicadorConsistencia;
}

export interface PerfilVagaFator {
  codFat: string;
  minimo: number;
  maximo: number;
  peso: number;
  eliminatorio: boolean;
}

export interface AderenciaFator {
  codFat: string;
  distanciaFaixa: number;
  aderenciaDimensao: number;
  dentroDaFaixa: boolean;
}

export interface ResultadoAderencia {
  aderenciaGeral: number;
  fatores: AderenciaFator[];
}

/** pontosBase (1-5, invertido se reversa) × peso da pergunta. */
export function calcularPontosResposta(valor: number, tipo: TipoPergunta, peso: number): number {
  const pontosBase = tipo === 'REVERSA' ? 6 - valor : valor;
  return pontosBase * peso;
}

/** Faixas interpretativas versionadas (RN-GP-007) — mudar aqui cria FAIXA_V2, nunca sobrescreve. */
export function calcularFaixaInterpretativa(percentual: number): string {
  if (percentual <= 20) return 'muito_baixa';
  if (percentual <= 40) return 'baixa';
  if (percentual <= 60) return 'moderada';
  if (percentual <= 80) return 'alta';
  return 'muito_alta';
}

/** Agrega respostas por fator: pontuação bruta, mín/máx possível, percentual, média, desvio, faixa. */
export function calcularResultadoPorFator(respostas: RespostaFator[]): ResultadoFator[] {
  const porFator = new Map<string, RespostaFator[]>();
  for (const r of respostas) {
    if (!porFator.has(r.codFat)) porFator.set(r.codFat, []);
    porFator.get(r.codFat)!.push(r);
  }

  return Array.from(porFator.entries()).map(([codFat, itens]) => {
    const pontosPorItem = itens.map((r) => calcularPontosResposta(r.valor, r.tipo, r.peso));
    const pontuacaoBruta = pontosPorItem.reduce((s, v) => s + v, 0);
    const minimoPossivel = itens.reduce((s, r) => s + 1 * r.peso, 0);
    const maximoPossivel = itens.reduce((s, r) => s + 5 * r.peso, 0);
    const percentualNormalizado =
      maximoPossivel > minimoPossivel
        ? ((pontuacaoBruta - minimoPossivel) / (maximoPossivel - minimoPossivel)) * 100
        : 0;
    const media = pontuacaoBruta / itens.length;
    const desvio = Math.sqrt(
      pontosPorItem.reduce((s, v) => s + (v - media) ** 2, 0) / itens.length,
    );

    return {
      codFat,
      pontuacaoBruta,
      minimoPossivel,
      maximoPossivel,
      percentualNormalizado,
      media,
      desvio,
      faixaInterpretativa: calcularFaixaInterpretativa(percentualNormalizado),
    };
  });
}

export interface RespostaFaceta extends RespostaFator {
  faceta: string;
}

export interface ResultadoFaceta {
  codFat: string;
  faceta: string;
  percentualNormalizado: number;
  quantidade: number;
}

/**
 * Mesma agregação de `calcularResultadoPorFator`, só que na granularidade da
 * faceta (RN-GP-006 detalhamento) — explica *onde dentro do fator* a resposta
 * do candidato puxou o resultado pra cima ou pra baixo. Não é persistido —
 * calculado sob demanda a partir das respostas já salvas.
 */
export function calcularResultadoPorFaceta(respostas: RespostaFaceta[]): ResultadoFaceta[] {
  const porFaceta = new Map<string, RespostaFaceta[]>();
  for (const r of respostas) {
    const chave = `${r.codFat}::${r.faceta}`;
    if (!porFaceta.has(chave)) porFaceta.set(chave, []);
    porFaceta.get(chave)!.push(r);
  }

  return Array.from(porFaceta.values()).map((itens) => {
    const pontosPorItem = itens.map((r) => calcularPontosResposta(r.valor, r.tipo, r.peso));
    const pontuacaoBruta = pontosPorItem.reduce((s, v) => s + v, 0);
    const minimoPossivel = itens.reduce((s, r) => s + 1 * r.peso, 0);
    const maximoPossivel = itens.reduce((s, r) => s + 5 * r.peso, 0);
    const percentualNormalizado =
      maximoPossivel > minimoPossivel
        ? ((pontuacaoBruta - minimoPossivel) / (maximoPossivel - minimoPossivel)) * 100
        : 0;

    return {
      codFat: itens[0].codFat,
      faceta: itens[0].faceta,
      percentualNormalizado,
      quantidade: itens.length,
    };
  });
}

/**
 * Indicadores de consistência (versão simplificada do v1 — ver Motor de
 * Pontuação §4): % neutras, % na alternativa mais frequente. Nunca reprova
 * automaticamente — só classifica com evidência numérica junto.
 */
export function calcularConsistencia(valoresResposta: number[]): ResultadoConsistencia {
  const total = valoresResposta.length || 1;
  const percRespNeutras = (valoresResposta.filter((v) => v === 3).length / total) * 100;

  const contagem = new Map<number, number>();
  for (const v of valoresResposta) contagem.set(v, (contagem.get(v) ?? 0) + 1);
  const maiorContagem = Math.max(0, ...contagem.values());
  const percRespUniformes = (maiorContagem / total) * 100;

  let indicadorConsistencia: IndicadorConsistencia = 'ADEQUADA';
  if (percRespUniformes > 85) indicadorConsistencia = 'BAIXA_CONSISTENCIA';
  else if (percRespNeutras > 40) indicadorConsistencia = 'REQUER_ATENCAO';

  return { percRespNeutras, percRespUniformes, indicadorConsistencia };
}

/**
 * Aderência à vaga (RN-GP-009): dentro da faixa = 100; fora, redução
 * progressiva proporcional à distância (1 ponto de aderência por ponto de
 * distância — multiplicador simples e documentado, ajustável em versão futura
 * sem alterar o restante da fórmula).
 */
export function calcularAderenciaVaga(
  resultadoFatores: ResultadoFator[],
  perfilFatores: PerfilVagaFator[],
): ResultadoAderencia {
  const percentualPorFator = new Map(resultadoFatores.map((r) => [r.codFat, r.percentualNormalizado]));

  const fatores: AderenciaFator[] = perfilFatores.map((p) => {
    const percentual = percentualPorFator.get(p.codFat) ?? 0;
    let distanciaFaixa = 0;
    if (percentual < p.minimo) distanciaFaixa = p.minimo - percentual;
    else if (percentual > p.maximo) distanciaFaixa = percentual - p.maximo;

    const aderenciaDimensao = Math.min(100, Math.max(0, 100 - distanciaFaixa));
    return {
      codFat: p.codFat,
      distanciaFaixa,
      aderenciaDimensao,
      dentroDaFaixa: distanciaFaixa === 0,
    };
  });

  const pesoTotal = perfilFatores.reduce((s, p) => s + p.peso, 0) || 1;
  const aderenciaGeral = fatores.reduce((s, f, i) => s + f.aderenciaDimensao * perfilFatores[i].peso, 0) / pesoTotal;

  return { aderenciaGeral, fatores };
}
