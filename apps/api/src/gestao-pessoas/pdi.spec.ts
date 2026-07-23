import { progressoDoPlano } from './pdi';

const a = (status: string, progresso = 0) => ({ status, progresso });

describe('progressoDoPlano', () => {
  it('sem ações, é zero', () => {
    expect(progressoDoPlano([])).toBe(0);
  });

  it('média simples do progresso das ações', () => {
    expect(progressoDoPlano([a('EM_ANDAMENTO', 40), a('EM_ANDAMENTO', 60)])).toBe(50);
  });

  it('ação concluída vale 100 mesmo com progresso não fechado à mão', () => {
    // Concluir é a fonte de verdade; o número guardado (30) não contradiz isso.
    expect(progressoDoPlano([a('CONCLUIDA', 30)])).toBe(100);
  });

  it('ação cancelada sai da conta, não puxa a média para baixo', () => {
    // 80% feito de uma ação; a outra foi cancelada. O plano está 80%, não 40%.
    expect(progressoDoPlano([a('EM_ANDAMENTO', 80), a('CANCELADA', 0)])).toBe(80);
  });

  it('todas canceladas equivale a sem ações — zero, não divisão por zero', () => {
    expect(progressoDoPlano([a('CANCELADA', 50), a('CANCELADA', 0)])).toBe(0);
  });

  it('mistura de pendente, andamento e concluída', () => {
    // (0 + 50 + 100) / 3 = 50
    expect(progressoDoPlano([a('PENDENTE', 0), a('EM_ANDAMENTO', 50), a('CONCLUIDA', 100)])).toBe(50);
  });

  it('arredonda para inteiro', () => {
    // (0 + 0 + 100) / 3 = 33,33 → 33
    expect(progressoDoPlano([a('PENDENTE', 0), a('PENDENTE', 0), a('CONCLUIDA', 100)])).toBe(33);
  });

  it('plano inteiro concluído é 100', () => {
    expect(progressoDoPlano([a('CONCLUIDA', 100), a('CONCLUIDA', 100)])).toBe(100);
  });
});
