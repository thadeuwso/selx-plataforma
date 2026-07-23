import { calcularAderencia, SinaisAderencia } from './aderencia';

const base: SinaisAderencia = {
  planosAtivos: 1,
  progressoMedio: 100,
  acoesAtrasadas: 0,
  feedbacksConstrutivosSemCiencia: 0,
  ultimaNotaDesempenho: 5,
};

describe('calcularAderencia (RN-GP-023)', () => {
  it('tudo em dia é ADERENTE com score cheio', () => {
    const r = calcularAderencia(base);
    expect(r.score).toBe(100);
    expect(r.nivel).toBe('ADERENTE');
    expect(r.motivos).toEqual([]);
  });

  it('sem plano ativo é a lacuna de raiz e recomenda criar plano', () => {
    const r = calcularAderencia({ ...base, planosAtivos: 0, progressoMedio: null });
    expect(r.score).toBe(60);
    expect(r.motivos).toContain('Sem plano de desenvolvimento ativo');
    expect(r.recomendacoes).toContain('Criar um plano de desenvolvimento');
  });

  it('progresso baixo penaliza proporcionalmente', () => {
    // (100-40)*0.3 = 18 -> 82
    const r = calcularAderencia({ ...base, progressoMedio: 40 });
    expect(r.score).toBe(82);
    expect(r.motivos.some((m) => m.includes('progresso baixo'))).toBe(true);
  });

  it('ações atrasadas penalizam com teto de 30', () => {
    const r = calcularAderencia({ ...base, acoesAtrasadas: 9 });
    expect(r.score).toBe(70); // teto -30, não -90
    expect(r.motivos.some((m) => m.includes('atrasada'))).toBe(true);
  });

  it('feedback construtivo sem ciência penaliza com teto de 24', () => {
    const r = calcularAderencia({ ...base, feedbacksConstrutivosSemCiencia: 10 });
    expect(r.score).toBe(76); // teto -24
  });

  it('desempenho baixo (<=2) penaliza e recomenda ação nas competências fracas', () => {
    const r = calcularAderencia({ ...base, ultimaNotaDesempenho: 2 });
    expect(r.score).toBe(80);
    expect(r.recomendacoes.some((x) => x.includes('competências'))).toBe(true);
  });

  it('nunca avaliado não penaliza (ausência de dado, não nota zero)', () => {
    const r = calcularAderencia({ ...base, ultimaNotaDesempenho: null });
    expect(r.score).toBe(100);
  });

  it('acúmulo de sinais leva a RISCO, sem passar de 0', () => {
    const r = calcularAderencia({
      planosAtivos: 0,
      progressoMedio: null,
      acoesAtrasadas: 5,
      feedbacksConstrutivosSemCiencia: 5,
      ultimaNotaDesempenho: 1,
    });
    // 100 -40 -30 -24 -20 = -14 -> 0
    expect(r.score).toBe(0);
    expect(r.nivel).toBe('RISCO');
  });

  it('faixa de níveis: 75 ADERENTE, 50 ATENCAO, abaixo RISCO', () => {
    expect(calcularAderencia({ ...base, progressoMedio: 17 }).nivel).toBe('ADERENTE'); // ~75
    expect(calcularAderencia({ ...base, planosAtivos: 0, progressoMedio: null }).nivel).toBe('ATENCAO'); // 60
    expect(calcularAderencia({ ...base, planosAtivos: 0, progressoMedio: null, acoesAtrasadas: 2 }).nivel).toBe('RISCO'); // 40
  });
});
