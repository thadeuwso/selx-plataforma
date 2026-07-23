/**
 * Agregações do relatório de recrutamento (RN-REC-019).
 *
 * Funções puras, sobre dados já lidos do banco — testáveis sem mock e sem rede.
 * O controller busca; aqui só se calcula.
 */

/** Etapas de avanço, em ordem. Terminais são desfecho, não degrau (RN-REC-010). */
export const ETAPAS_FUNIL = [
  'applied',
  'screening',
  'analysis',
  'shortlist',
  'interview',
  'offer',
  'hired',
] as const;

export interface EventoEstagio {
  codCdt: bigint;
  estagioNovo: string;
  dhInc: Date;
}

/**
 * Funil global: quantas candidaturas **chegaram ao menos até** cada etapa,
 * reconstruído da timeline — não do estágio atual.
 *
 * É a mesma decisão do funil por canal, e pela mesma razão: contado pelo
 * estágio atual, quem foi entrevistado e recusado sumiria da etapa "entrevista"
 * — justo onde a taxa de conversão importa.
 */
export function montarFunil(
  candidaturas: { codCdt: bigint; estagio: string }[],
  eventos: EventoEstagio[],
): { etapa: string; alcancaram: number; taxaDaEtapaAnterior: number | null }[] {
  const ordem = new Map<string, number>(ETAPAS_FUNIL.map((e, i) => [e, i]));

  // Maior etapa que cada candidatura alcançou: o estágio atual, ou a mais
  // avançada registrada na timeline (que é maior quando terminou num terminal).
  const alcanceMax = new Map<string, number>();
  for (const c of candidaturas) {
    alcanceMax.set(c.codCdt.toString(), ordem.get(c.estagio) ?? -1);
  }
  for (const ev of eventos) {
    const chave = ev.codCdt.toString();
    if (!alcanceMax.has(chave)) continue; // evento de candidatura fora do recorte
    const pos = ordem.get(ev.estagioNovo) ?? -1;
    if (pos > (alcanceMax.get(chave) ?? -1)) alcanceMax.set(chave, pos);
  }

  const alcancaram = (etapa: string) => {
    const alvo = ordem.get(etapa)!;
    let n = 0;
    for (const v of alcanceMax.values()) if (v >= alvo) n++;
    return n;
  };

  return ETAPAS_FUNIL.map((etapa, i) => {
    const atual = alcancaram(etapa);
    const anterior = i > 0 ? alcancaram(ETAPAS_FUNIL[i - 1]) : null;
    return {
      etapa,
      alcancaram: atual,
      // Conversão de um degrau para o próximo. Null na primeira etapa (não há
      // "anterior") e quando o denominador é zero — dividir por zero mentiria.
      taxaDaEtapaAnterior: anterior && anterior > 0 ? Math.round((atual / anterior) * 100) : null,
    };
  });
}

/**
 * Tempo médio (em dias) entre a candidatura e chegar à etapa `hired`.
 *
 * Só conta quem de fato foi contratado; candidatura em andamento não tem tempo
 * final e entraria puxando a média para baixo.
 */
export function tempoMedioContratacao(
  candidaturas: { codCdt: bigint; dhInc: Date }[],
  eventos: EventoEstagio[],
): { dias: number; baseContratacoes: number } | null {
  const inicioPorCdt = new Map(candidaturas.map((c) => [c.codCdt.toString(), c.dhInc]));
  const contratacaoPorCdt = new Map<string, Date>();
  for (const ev of eventos) {
    if (ev.estagioNovo !== 'hired') continue;
    const chave = ev.codCdt.toString();
    // A primeira vez que chegou em hired — reentradas não recontam.
    if (!contratacaoPorCdt.has(chave) && inicioPorCdt.has(chave)) {
      contratacaoPorCdt.set(chave, ev.dhInc);
    }
  }
  if (contratacaoPorCdt.size === 0) return null;

  let soma = 0;
  for (const [chave, dhHired] of contratacaoPorCdt) {
    const inicio = inicioPorCdt.get(chave)!;
    soma += (dhHired.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000);
  }
  return { dias: Math.round(soma / contratacaoPorCdt.size), baseContratacoes: contratacaoPorCdt.size };
}

/**
 * Motivos de recusa de proposta, agrupados. O texto livre não agrupa sozinho,
 * mas a contagem de quantas recusas houve, e quantas trouxeram motivo, já diz
 * ao gestor se vale ler os motivos um a um.
 */
export function resumoRecusas(
  propostas: { status: string; motivoRecusa: string | null }[],
): { enviadas: number; aceitas: number; recusadas: number; recusasComMotivo: number } {
  let aceitas = 0;
  let recusadas = 0;
  let recusasComMotivo = 0;
  for (const p of propostas) {
    if (p.status === 'ACEITA') aceitas++;
    else if (p.status === 'RECUSADA') {
      recusadas++;
      if (p.motivoRecusa?.trim()) recusasComMotivo++;
    }
  }
  return { enviadas: propostas.length, aceitas, recusadas, recusasComMotivo };
}
