import { montarFunil, resumoRecusas, tempoMedioContratacao } from './relatorio-recrutamento';

const ev = (codCdt: number, estagioNovo: string, dia: number) => ({
  codCdt: BigInt(codCdt),
  estagioNovo,
  dhInc: new Date(2026, 6, dia),
});

describe('montarFunil', () => {
  it('conta quem chegou ao menos até cada etapa, pela timeline', () => {
    const candidaturas = [
      { codCdt: 1n, estagio: 'rejected' }, // foi até entrevista e caiu
      { codCdt: 2n, estagio: 'screening' },
      { codCdt: 3n, estagio: 'applied' },
    ];
    const eventos = [
      ev(1, 'screening', 2),
      ev(1, 'interview', 5),
      ev(1, 'rejected', 6),
      ev(2, 'screening', 3),
    ];
    const f = montarFunil(candidaturas, eventos);
    const por = Object.fromEntries(f.map((x) => [x.etapa, x.alcancaram]));
    expect(por.applied).toBe(3);
    expect(por.screening).toBe(2);
    // O rejeitado continua contando na entrevista — o ponto do "chegou até".
    expect(por.interview).toBe(1);
    expect(por.hired).toBe(0);
  });

  it('candidatura rejeitada não some da etapa que alcançou', () => {
    const f = montarFunil(
      [{ codCdt: 1n, estagio: 'not_selected' }],
      [ev(1, 'screening', 2), ev(1, 'interview', 4), ev(1, 'not_selected', 5)],
    );
    expect(f.find((x) => x.etapa === 'interview')!.alcancaram).toBe(1);
  });

  it('calcula a conversão de um degrau para o próximo', () => {
    // 4 chegaram em applied, 2 em screening → 50%.
    const cands = [1, 2, 3, 4].map((n) => ({ codCdt: BigInt(n), estagio: 'applied' }));
    const eventos = [ev(1, 'screening', 2), ev(2, 'screening', 2)];
    const f = montarFunil(cands, eventos);
    expect(f.find((x) => x.etapa === 'screening')!.taxaDaEtapaAnterior).toBe(50);
  });

  it('a primeira etapa não tem taxa (não há anterior)', () => {
    const f = montarFunil([{ codCdt: 1n, estagio: 'applied' }], []);
    expect(f[0].taxaDaEtapaAnterior).toBeNull();
  });

  it('taxa é null quando o degrau anterior tem zero — não divide por zero', () => {
    // Ninguém passou de applied; a conversão applied→screening é 0/x, mas
    // screening→analysis é 0/0 e tem de ser null, não NaN.
    const f = montarFunil([{ codCdt: 1n, estagio: 'applied' }], []);
    expect(f.find((x) => x.etapa === 'analysis')!.taxaDaEtapaAnterior).toBeNull();
  });

  it('evento de candidatura fora do recorte é ignorado', () => {
    const f = montarFunil([{ codCdt: 1n, estagio: 'applied' }], [ev(99, 'hired', 3)]);
    expect(f.find((x) => x.etapa === 'hired')!.alcancaram).toBe(0);
  });

  it('um evento que recua não rebaixa o alcance já atingido', () => {
    // Chegou em interview e voltou para screening (o recrutador corrigiu a
    // etapa): o funil registra que passou por interview, não que regrediu.
    // (`>` vs `>=` no comparador é mutante equivalente — na igualdade, os dois
    // gravam o mesmo valor; nenhum teste distingue, e está certo assim.)
    const f = montarFunil(
      [{ codCdt: 1n, estagio: 'screening' }],
      [ev(1, 'screening', 2), ev(1, 'interview', 4), ev(1, 'screening', 6)],
    );
    expect(f.find((x) => x.etapa === 'interview')!.alcancaram).toBe(1);
  });
});

describe('tempoMedioContratacao', () => {
  it('mede da candidatura até chegar em hired', () => {
    const r = tempoMedioContratacao(
      [{ codCdt: 1n, dhInc: new Date(2026, 6, 1) }],
      [ev(1, 'hired', 11)],
    );
    expect(r).toEqual({ dias: 10, baseContratacoes: 1 });
  });

  it('faz a média entre várias contratações', () => {
    const r = tempoMedioContratacao(
      [
        { codCdt: 1n, dhInc: new Date(2026, 6, 1) },
        { codCdt: 2n, dhInc: new Date(2026, 6, 1) },
      ],
      [ev(1, 'hired', 11), ev(2, 'hired', 21)],
    );
    expect(r).toEqual({ dias: 15, baseContratacoes: 2 }); // (10+20)/2
  });

  it('ignora candidatura em andamento — só quem foi contratado conta', () => {
    const r = tempoMedioContratacao(
      [
        { codCdt: 1n, dhInc: new Date(2026, 6, 1) },
        { codCdt: 2n, dhInc: new Date(2026, 6, 1) },
      ],
      [ev(1, 'hired', 11)], // só o 1 foi contratado
    );
    expect(r).toEqual({ dias: 10, baseContratacoes: 1 });
  });

  it('reentrada em hired não reconta', () => {
    const r = tempoMedioContratacao(
      [{ codCdt: 1n, dhInc: new Date(2026, 6, 1) }],
      [ev(1, 'hired', 11), ev(1, 'hired', 20)],
    );
    expect(r!.baseContratacoes).toBe(1);
    expect(r!.dias).toBe(10); // a primeira vez
  });

  it('sem nenhuma contratação devolve null, não zero', () => {
    expect(tempoMedioContratacao([{ codCdt: 1n, dhInc: new Date() }], [])).toBeNull();
  });
});

describe('resumoRecusas', () => {
  it('conta aceitas, recusadas e quantas recusas trouxeram motivo', () => {
    const r = resumoRecusas([
      { status: 'ACEITA', motivoRecusa: null },
      { status: 'RECUSADA', motivoRecusa: 'salário' },
      { status: 'RECUSADA', motivoRecusa: '  ' }, // só espaço não conta
      { status: 'ENVIADA', motivoRecusa: null },
    ]);
    expect(r).toEqual({ enviadas: 4, aceitas: 1, recusadas: 2, recusasComMotivo: 1 });
  });

  it('lista vazia zera tudo', () => {
    expect(resumoRecusas([])).toEqual({ enviadas: 0, aceitas: 0, recusadas: 0, recusasComMotivo: 0 });
  });
});
