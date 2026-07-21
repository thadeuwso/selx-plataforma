import { detectarContatoNoTexto, detectarNomeNoTexto } from './curriculo-extracao';

describe('detectarNomeNoTexto', () => {
  it('pega a primeira linha de conteúdo como nome', () => {
    const texto = ['Maria Aparecida Souza', 'Analista de RH', 'maria@mail.com'].join('\n');
    expect(detectarNomeNoTexto(texto)).toBe('Maria Aparecida Souza');
  });

  it('descarta o cabeçalho "Currículo" e pega o nome da linha seguinte', () => {
    const texto = ['CURRÍCULO VITAE', 'João Pedro Alves', 'Rua X'].join('\n');
    expect(detectarNomeNoTexto(texto)).toBe('João Pedro Alves');
  });

  it('descarta "Dados Pessoais" como cabeçalho', () => {
    expect(detectarNomeNoTexto(['Dados Pessoais', 'Ana Lima'].join('\n'))).toBe('Ana Lima');
  });

  it('normaliza caixa alta mantendo preposições em minúscula', () => {
    expect(detectarNomeNoTexto('JOÃO DA SILVA DOS SANTOS')).toBe('João da Silva dos Santos');
  });

  it('mantém a primeira palavra maiúscula mesmo sendo preposição', () => {
    expect(detectarNomeNoTexto('Da Silva Ferreira')).toBe('Da Silva Ferreira');
  });

  it('ignora linha com e-mail (tem @)', () => {
    const texto = ['contato@empresa.com', 'Carlos Eduardo Nunes'].join('\n');
    expect(detectarNomeNoTexto(texto)).toBe('Carlos Eduardo Nunes');
  });

  it('ignora linha rotulada (tem dois-pontos)', () => {
    const texto = ['Telefone: 11 99999-9999', 'Beatriz Rocha Martins'].join('\n');
    expect(detectarNomeNoTexto(texto)).toBe('Beatriz Rocha Martins');
  });

  it('ignora linha com dígito — endereço não é nome', () => {
    const texto = ['Rua das Flores 42', 'Paulo Henrique Dias'].join('\n');
    expect(detectarNomeNoTexto(texto)).toBe('Paulo Henrique Dias');
  });

  it('recusa uma única palavra — nome precisa de ao menos duas', () => {
    expect(detectarNomeNoTexto('Fernanda')).toBeUndefined();
  });

  it('recusa uma frase longa demais para ser nome (mais de 5 palavras)', () => {
    expect(detectarNomeNoTexto('Profissional com ampla experiência em gestão de pessoas')).toBeUndefined();
  });

  it('recusa linha longa demais em caracteres, mesmo com poucas palavras', () => {
    const linha = 'Desenvolvedorbackendsenior Especialistaemarquiteturadistribuida';
    expect(detectarNomeNoTexto(linha)).toBeUndefined();
  });

  it('cai no nome do arquivo quando o texto não entrega nada confiável', () => {
    expect(detectarNomeNoTexto('12345\n@@@', 'joao_silva.pdf')).toBe('Joao Silva');
  });

  it('aceita hífen e apóstrofo em sobrenome composto', () => {
    expect(detectarNomeNoTexto("Anne-Marie D'Ávila")).toBe("Anne-marie D'ávila");
  });

  it('não usa nome de arquivo que não parece nome de pessoa', () => {
    expect(detectarNomeNoTexto('12345', 'curriculo-2026-final-v3.pdf')).toBeUndefined();
  });

  it('devolve undefined quando não há texto nem nome de arquivo utilizável', () => {
    expect(detectarNomeNoTexto('')).toBeUndefined();
  });
});

describe('detectarContatoNoTexto', () => {
  it('extrai e-mail e telefone de linha rotulada', () => {
    const texto = ['Nome Sobrenome', 'E-mail: pessoa@mail.com', 'Telefone: (11) 98888-7777'].join('\n');
    expect(detectarContatoNoTexto(texto)).toEqual({ email: 'pessoa@mail.com', fone: '(11) 98888-7777' });
  });

  it('não inventa telefone a partir de dígitos soltos fora de linha rotulada', () => {
    const texto = ['Formado em 2015', 'Experiência: 11988887777 horas', 'x@y.com'].join('\n');
    expect(detectarContatoNoTexto(texto).fone).toBeUndefined();
  });
});
