import { classificacaoDesempenho, distribuicaoPorFaixa } from './desempenho-360';

describe('classificacaoDesempenho (performance-360)', () => {
  it('sem nota devolve null (não "insatisfatório")', () => {
    expect(classificacaoDesempenho(null)).toBeNull();
  });
  it('4,2 é Bom desempenho', () => {
    expect(classificacaoDesempenho(4.2)?.chave).toBe('BOM');
  });
  it('4,5 já é Excelente (limite inferior)', () => {
    expect(classificacaoDesempenho(4.5)?.chave).toBe('EXCELENTE');
  });
  it('nota máxima 5 é Excelente', () => {
    expect(classificacaoDesempenho(5)?.chave).toBe('EXCELENTE');
  });
  it('nota mínima 1 é Insatisfatório', () => {
    expect(classificacaoDesempenho(1)?.chave).toBe('INSATISFATORIO');
  });
  it('2,5 é Regular (limite)', () => {
    expect(classificacaoDesempenho(2.5)?.chave).toBe('REGULAR');
  });
});

describe('distribuicaoPorFaixa (performance-360)', () => {
  it('lista vazia dá tudo zero, sem dividir por zero', () => {
    const d = distribuicaoPorFaixa([]);
    expect(d).toHaveLength(5);
    expect(d.every((f) => f.quantidade === 0 && f.percentual === 0)).toBe(true);
  });
  it('conta cada nota na faixa certa com percentual', () => {
    // 5, 4, 4, 3 → Excelente 1 (25%), Bom 2 (50%), Regular 1 (25%)
    const d = distribuicaoPorFaixa([5, 4, 4, 3]);
    const por = Object.fromEntries(d.map((f) => [f.chave, f]));
    expect(por.EXCELENTE.quantidade).toBe(1);
    expect(por.EXCELENTE.percentual).toBe(25);
    expect(por.BOM.quantidade).toBe(2);
    expect(por.BOM.percentual).toBe(50);
    expect(por.REGULAR.quantidade).toBe(1);
    expect(por.INSATISFATORIO.quantidade).toBe(0);
  });
  it('soma das quantidades bate com o total de notas', () => {
    const notas = [1, 2, 3, 4, 5, 5];
    const soma = distribuicaoPorFaixa(notas).reduce((s, f) => s + f.quantidade, 0);
    expect(soma).toBe(notas.length);
  });
});
