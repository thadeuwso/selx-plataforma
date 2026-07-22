import { montarEvidencias, normalizarAnalise, normalizarSeveridade, termosDoRequisito } from './analise-candidato';

describe('termosDoRequisito', () => {
  it('descarta palavras genéricas de requisito', () => {
    expect(termosDoRequisito('Experiência com SQL')).toEqual(['sql']);
  });

  it('remove acentos para casar com currículo escrito de qualquer jeito', () => {
    expect(termosDoRequisito('Gestão de Operações')).toEqual(['gestao', 'operacoes']);
  });

  it('preserva siglas e tecnologias com símbolo', () => {
    expect(termosDoRequisito('C# e Node.js')).toEqual(expect.arrayContaining(['c#', 'node.js']));
  });

  it('descarta números soltos — "5 anos" não localiza nada', () => {
    expect(termosDoRequisito('5 anos de experiência')).toEqual([]);
  });

  it('descarta palavras de 1-2 letras, que casariam em qualquer linha', () => {
    expect(termosDoRequisito('Domínio de BI')).toEqual(['dominio']);
  });

  it('não repete o mesmo termo', () => {
    expect(termosDoRequisito('SQL avançado e SQL Server')).toEqual(['sql', 'avancado', 'server']);
  });
});

describe('montarEvidencias', () => {
  const cv = [
    'João da Silva',
    'Analista de Dados na Empresa X',
    // Casa 1 termo ("power") e vem ANTES da linha forte: é o que distingue
    // "melhor linha" de "primeira linha que casa".
    'Power Point para apresentações executivas',
    'Desenvolvimento de dashboards em Power BI e consultas SQL complexas',
    'Automação de rotinas em Python',
    'Formação: Engenharia de Produção',
  ].join('\n');

  it('encontra o requisito e devolve a linha que o sustenta', () => {
    const [ev] = montarEvidencias([{ descrReq: 'Experiência com SQL', tipoReq: 'OBRIGATORIO' }], cv);
    expect(ev.encontrado).toBe(true);
    expect(ev.trecho).toContain('SQL');
  });

  it('marca encontrado=false quando não há evidência — a lacuna precisa ser visível', () => {
    const [ev] = montarEvidencias([{ descrReq: 'Certificação PMP', tipoReq: 'OBRIGATORIO' }], cv);
    expect(ev).toEqual({
      requisito: 'Certificação PMP',
      tipo: 'OBRIGATORIO',
      encontrado: false,
      trecho: null,
    });
  });

  it('devolve um item por requisito, sempre — nenhum some da lista', () => {
    const evidencias = montarEvidencias(
      [
        { descrReq: 'SQL', tipoReq: 'OBRIGATORIO' },
        { descrReq: 'Certificação PMP', tipoReq: 'DESEJAVEL' },
        { descrReq: 'Python', tipoReq: 'OBRIGATORIO' },
      ],
      cv,
    );
    expect(evidencias).toHaveLength(3);
    expect(evidencias.map((e) => e.encontrado)).toEqual([true, false, true]);
  });

  it('prefere a linha que cobre mais termos, não a primeira que casa', () => {
    // "Power Point" casa só "power" e aparece antes; a linha dos dashboards
    // casa "power" e "dashboards". A evidência forte tem de vencer a próxima.
    const [ev] = montarEvidencias(
      [{ descrReq: 'Dashboards em Power BI', tipoReq: 'OBRIGATORIO' }],
      cv,
    );
    expect(ev.trecho).toContain('dashboards');
    expect(ev.trecho).not.toContain('Power Point');
  });

  it('casa mesmo com acentuação diferente entre vaga e currículo', () => {
    const [ev] = montarEvidencias(
      [{ descrReq: 'Automação de processos', tipoReq: 'DESEJAVEL' }],
      'Automacao de rotinas repetitivas',
    );
    expect(ev.encontrado).toBe(true);
  });

  it('sem currículo, nenhum requisito é dado como atendido', () => {
    const evidencias = montarEvidencias([{ descrReq: 'SQL', tipoReq: 'OBRIGATORIO' }], null);
    expect(evidencias[0].encontrado).toBe(false);
  });

  it('requisito só de palavras genéricas não casa com qualquer linha', () => {
    const [ev] = montarEvidencias([{ descrReq: 'Experiência de 5 anos', tipoReq: 'OBRIGATORIO' }], cv);
    expect(ev.encontrado).toBe(false);
  });

  it('trunca o trecho para não inflar o prompt', () => {
    const linhaLonga = `SQL ${'x'.repeat(500)}`;
    const [ev] = montarEvidencias([{ descrReq: 'SQL', tipoReq: 'OBRIGATORIO' }], linhaLonga);
    expect(ev.trecho!.length).toBe(220);
  });
});

describe('normalizarSeveridade', () => {
  // O schema tolera a grafia que o modelo produzir; o banco guarda uma só.
  it.each([
    ['MEDIA', 'MEDIA'],
    ['MÉDIA', 'MEDIA'],
    ['Média', 'MEDIA'],
    ['media', 'MEDIA'],
    ['ALTA', 'ALTA'],
    ['Alta', 'ALTA'],
    ['BAIXA', 'BAIXA'],
    ['baixa', 'BAIXA'],
  ])('normaliza %s para %s', (bruta, esperada) => {
    expect(normalizarSeveridade(bruta)).toBe(esperada);
  });

  it('cai em MEDIA diante de valor inesperado, sem quebrar a tela', () => {
    expect(normalizarSeveridade('crítico')).toBe('MEDIA');
    expect(normalizarSeveridade('')).toBe('MEDIA');
  });
});

describe('normalizarAnalise', () => {
  it('normaliza a severidade de todos os riscos e preserva o resto', () => {
    const bruta = {
      resumoExecutivo: 'texto',
      riscos: [
        { risco: 'a', severidade: 'MÉDIA', motivo: 'm1' },
        { risco: 'b', severidade: 'Alta', motivo: 'm2' },
      ],
    };
    expect(normalizarAnalise(bruta)).toEqual({
      resumoExecutivo: 'texto',
      riscos: [
        { risco: 'a', severidade: 'MEDIA', motivo: 'm1' },
        { risco: 'b', severidade: 'ALTA', motivo: 'm2' },
      ],
    });
  });

  it('devolve intacto o que não tem riscos', () => {
    expect(normalizarAnalise({ resumoExecutivo: 'x' })).toEqual({ resumoExecutivo: 'x' });
    expect(normalizarAnalise(null)).toBeNull();
  });
});
