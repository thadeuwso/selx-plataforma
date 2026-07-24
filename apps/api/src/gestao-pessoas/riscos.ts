/**
 * Motor de riscos e alertas (performance-360, Fase 10) — regra pura, transparente.
 *
 * Cada alerta nasce de uma REGRA explícita, com as evidências que a dispararam.
 * Nada aqui é caixa-preta: quem vê o alerta vê por que ele apareceu. A IA, quando
 * houver, só complementa a explicação — nunca inventa o risco. Sem dado médico,
 * familiar ou sensível.
 */

export type NivelRisco = 'BAIXO' | 'MEDIO' | 'ALTO';

export interface Alerta {
  chave: string;
  tipo: string;
  nivel: NivelRisco;
  titulo: string;
  regra: string;
  evidencias: string[];
  acaoRecomendada: string;
}

export interface SinaisRisco {
  /** Ciclo aberto, prazo vencido e avaliação ainda não concluída. */
  avaliacaoAtrasada: boolean;
  /** notaAtual − notaAnterior (negativo = queda); null se não dá para comparar. */
  tendenciaNota: number | null;
  notaAtual: number | null;
  metasAtrasadas: number;
  pdiAcoesAtrasadas: number;
  semPlanoPdi: boolean;
  treinosObrigatoriosPendentes: number;
  treinosVencidos: number;
  /** Dias desde o último feedback recebido; null se nunca recebeu. */
  diasSemFeedback: number | null;
  /** Alguma competência do 360 com dispersão alta entre avaliadores. */
  divergenciaAvaliadores: boolean;
  aderenciaScore: number;
  aderenciaNivel: string; // ADERENTE | ATENCAO | RISCO
}

export function avaliarRiscos(s: SinaisRisco): Alerta[] {
  const a: Alerta[] = [];

  if (s.avaliacaoAtrasada) {
    a.push({
      chave: 'AVALIACAO_ATRASADA', tipo: 'PROCESSO', nivel: 'MEDIO', titulo: 'Avaliação atrasada',
      regra: 'Ciclo aberto com prazo vencido e avaliação não concluída.',
      evidencias: ['Prazo do ciclo já passou e a avaliação segue pendente.'],
      acaoRecomendada: 'Concluir a avaliação do ciclo.',
    });
  }
  if (s.tendenciaNota !== null && s.tendenciaNota <= -0.5) {
    a.push({
      chave: 'QUEDA_DESEMPENHO', tipo: 'DESEMPENHO', nivel: 'ALTO', titulo: 'Queda de desempenho',
      regra: 'Nota caiu 0,5 ou mais em relação ao ciclo anterior.',
      evidencias: [`Variação de ${s.tendenciaNota.toFixed(1)} vs. o ciclo anterior${s.notaAtual !== null ? ` (nota atual ${s.notaAtual.toFixed(1)})` : ''}.`],
      acaoRecomendada: 'Conversar para entender o que mudou e apoiar.',
    });
  }
  if (s.treinosVencidos > 0) {
    a.push({
      chave: 'CERTIFICACAO_VENCIDA', tipo: 'CONFORMIDADE', nivel: 'ALTO', titulo: 'Certificação vencida',
      regra: 'Treinamento concluído com validade expirada.',
      evidencias: [`${s.treinosVencidos} certificação(ões) vencida(s).`],
      acaoRecomendada: 'Renovar a certificação.',
    });
  }
  if (s.treinosObrigatoriosPendentes > 0) {
    a.push({
      chave: 'TREINO_OBRIGATORIO_PENDENTE', tipo: 'CONFORMIDADE', nivel: 'MEDIO', titulo: 'Treinamento obrigatório pendente',
      regra: 'Há treinamento obrigatório do catálogo sem matrícula concluída.',
      evidencias: [`${s.treinosObrigatoriosPendentes} obrigatório(s) pendente(s).`],
      acaoRecomendada: 'Matricular no treinamento obrigatório.',
    });
  }
  if (s.metasAtrasadas > 0) {
    a.push({
      chave: 'METAS_ATRASADAS', tipo: 'METAS', nivel: 'MEDIO', titulo: 'Metas atrasadas',
      regra: 'Meta viva com prazo vencido e progresso abaixo de 100%.',
      evidencias: [`${s.metasAtrasadas} meta(s) atrasada(s).`],
      acaoRecomendada: 'Revisar prazos e apoio das metas atrasadas.',
    });
  }
  if (s.pdiAcoesAtrasadas > 0) {
    a.push({
      chave: 'PDI_ATRASADO', tipo: 'DESENVOLVIMENTO', nivel: 'MEDIO', titulo: 'PDI com ações atrasadas',
      regra: 'Ação de desenvolvimento com prazo vencido e não concluída.',
      evidencias: [`${s.pdiAcoesAtrasadas} ação(ões) de PDI atrasada(s).`],
      acaoRecomendada: 'Retomar ou repactuar as ações do plano.',
    });
  } else if (s.semPlanoPdi) {
    a.push({
      chave: 'SEM_PDI', tipo: 'DESENVOLVIMENTO', nivel: 'BAIXO', titulo: 'Sem plano de desenvolvimento',
      regra: 'Nenhum plano de desenvolvimento ativo.',
      evidencias: ['O colaborador não tem PDI ativo.'],
      acaoRecomendada: 'Criar um plano de desenvolvimento.',
    });
  }
  if (s.diasSemFeedback !== null && s.diasSemFeedback >= 90) {
    a.push({
      chave: 'SEM_FEEDBACK', tipo: 'ACOMPANHAMENTO', nivel: 'BAIXO', titulo: 'Sem feedback recente',
      regra: 'Sem feedback registrado há 90 dias ou mais.',
      evidencias: [`Último feedback há ${s.diasSemFeedback} dias.`],
      acaoRecomendada: 'Registrar um feedback e agendar uma conversa.',
    });
  }
  if (s.divergenciaAvaliadores) {
    a.push({
      chave: 'DIVERGENCIA_AVALIADORES', tipo: 'DESEMPENHO', nivel: 'MEDIO', titulo: 'Divergência entre avaliadores',
      regra: 'Alguma competência tem diferença relevante entre avaliadores no 360.',
      evidencias: ['Percepções divergentes em ao menos uma competência.'],
      acaoRecomendada: 'Calibrar percepções na conversa de feedback (alerta neutro).',
    });
  }
  // Composto: quem entrega bem mas está desengajando é risco de perda de talento.
  if (s.aderenciaNivel === 'RISCO' && s.notaAtual !== null && s.notaAtual >= 4) {
    a.push({
      chave: 'PERDA_TALENTO', tipo: 'ENGAJAMENTO', nivel: 'ALTO', titulo: 'Risco de perda de talento',
      regra: 'Alto desempenho (nota ≥ 4) com aderência ao desenvolvimento em risco.',
      evidencias: [`Nota ${s.notaAtual.toFixed(1)} e aderência ${s.aderenciaScore}/100 (em risco).`],
      acaoRecomendada: 'Conversar sobre carreira e reengajamento.',
    });
  } else if (s.aderenciaNivel === 'RISCO') {
    a.push({
      chave: 'DESENGAJAMENTO', tipo: 'ENGAJAMENTO', nivel: 'ALTO', titulo: 'Risco de desengajamento',
      regra: 'Aderência ao desenvolvimento no nível de risco.',
      evidencias: [`Aderência ${s.aderenciaScore}/100 (em risco).`],
      acaoRecomendada: 'Entender bloqueios e repactuar o desenvolvimento.',
    });
  }

  return a;
}
