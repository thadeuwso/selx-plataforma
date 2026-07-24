import { avaliarRiscos, SinaisRisco } from './riscos';

const base: SinaisRisco = {
  avaliacaoAtrasada: false,
  tendenciaNota: null,
  notaAtual: 4,
  metasAtrasadas: 0,
  pdiAcoesAtrasadas: 0,
  semPlanoPdi: false,
  treinosObrigatoriosPendentes: 0,
  treinosVencidos: 0,
  diasSemFeedback: null,
  divergenciaAvaliadores: false,
  aderenciaScore: 90,
  aderenciaNivel: 'ADERENTE',
};
const chaves = (s: SinaisRisco) => avaliarRiscos(s).map((a) => a.chave);

describe('avaliarRiscos (motor de regras)', () => {
  it('tudo em ordem não gera alerta', () => {
    expect(avaliarRiscos(base)).toEqual([]);
  });
  it('queda de 0,5+ dispara QUEDA_DESEMPENHO alto', () => {
    const a = avaliarRiscos({ ...base, tendenciaNota: -0.6 });
    expect(a[0].chave).toBe('QUEDA_DESEMPENHO');
    expect(a[0].nivel).toBe('ALTO');
    expect(a[0].evidencias.length).toBeGreaterThan(0);
  });
  it('queda menor que 0,5 não dispara', () => {
    expect(chaves({ ...base, tendenciaNota: -0.3 })).not.toContain('QUEDA_DESEMPENHO');
  });
  it('certificação vencida e obrigatório pendente são de conformidade', () => {
    expect(chaves({ ...base, treinosVencidos: 1, treinosObrigatoriosPendentes: 2 })).toEqual(
      expect.arrayContaining(['CERTIFICACAO_VENCIDA', 'TREINO_OBRIGATORIO_PENDENTE']),
    );
  });
  it('PDI atrasado tem precedência sobre "sem PDI"', () => {
    const c = chaves({ ...base, pdiAcoesAtrasadas: 1, semPlanoPdi: true });
    expect(c).toContain('PDI_ATRASADO');
    expect(c).not.toContain('SEM_PDI');
  });
  it('sem feedback há 90+ dias alerta', () => {
    expect(chaves({ ...base, diasSemFeedback: 100 })).toContain('SEM_FEEDBACK');
    expect(chaves({ ...base, diasSemFeedback: 30 })).not.toContain('SEM_FEEDBACK');
  });
  it('alto desempenho + aderência em risco → perda de talento (não desengajamento)', () => {
    const c = chaves({ ...base, notaAtual: 4.5, aderenciaNivel: 'RISCO', aderenciaScore: 30 });
    expect(c).toContain('PERDA_TALENTO');
    expect(c).not.toContain('DESENGAJAMENTO');
  });
  it('baixo desempenho + aderência em risco → desengajamento', () => {
    const c = chaves({ ...base, notaAtual: 2, aderenciaNivel: 'RISCO', aderenciaScore: 30 });
    expect(c).toContain('DESENGAJAMENTO');
    expect(c).not.toContain('PERDA_TALENTO');
  });
});
