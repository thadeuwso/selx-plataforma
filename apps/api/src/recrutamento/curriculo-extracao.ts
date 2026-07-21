/**
 * Extração determinística de texto de currículos (PDF/DOCX/TXT).
 * Porte do padrão comprovado do SelX 1.0 (backend/src/lib/resume-extract.ts):
 * sem IA aqui — extração de texto é mecânica; estruturação assistida por IA
 * fica para uma fase futura (via AI Gateway, purpose recrutamento.*).
 */
import mammoth from 'mammoth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages: number }>;

export type ArquivoRecebido = { nomeArquivo: string; mimetype: string; buffer: Buffer };
export type StatusExtracao = 'ok' | 'sem_texto' | 'erro';
export type TipoArquivoCurriculo = 'pdf' | 'docx' | 'txt';

export interface ResultadoExtracao {
  texto: string;
  status: StatusExtracao;
  tipoArquivo: TipoArquivoCurriculo;
  caracteres: number;
  paginas?: number | null;
  mensagemErro?: string;
}

const MIME_PDF = 'application/pdf';
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIME_TXT = 'text/plain';

export function tipoArquivoAceito(nomeArquivo: string, mimetype: string): TipoArquivoCurriculo | null {
  const nome = nomeArquivo.toLowerCase();
  if (mimetype === MIME_PDF || nome.endsWith('.pdf')) return 'pdf';
  if (mimetype === MIME_DOCX || nome.endsWith('.docx')) return 'docx';
  if (mimetype === MIME_TXT || nome.endsWith('.txt')) return 'txt';
  return null;
}

export async function extrairTextoCurriculo(arquivo: ArquivoRecebido): Promise<ResultadoExtracao> {
  const tipo = tipoArquivoAceito(arquivo.nomeArquivo, arquivo.mimetype);
  if (!tipo) {
    return { texto: '', status: 'erro', tipoArquivo: 'txt', caracteres: 0, mensagemErro: 'Formato não suportado (use PDF, DOCX ou TXT)' };
  }

  try {
    if (tipo === 'pdf') {
      const resultado = await pdfParse(arquivo.buffer);
      const texto = (resultado.text ?? '').trim();
      return { texto, status: texto ? 'ok' : 'sem_texto', tipoArquivo: 'pdf', caracteres: texto.length, paginas: resultado.numpages ?? null };
    }
    if (tipo === 'docx') {
      const resultado = await mammoth.extractRawText({ buffer: arquivo.buffer });
      const texto = (resultado.value ?? '').trim();
      return { texto, status: texto ? 'ok' : 'sem_texto', tipoArquivo: 'docx', caracteres: texto.length };
    }
    const texto = arquivo.buffer.toString('utf8').trim();
    return { texto, status: texto ? 'ok' : 'sem_texto', tipoArquivo: 'txt', caracteres: texto.length };
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : 'Falha desconhecida ao extrair texto';
    return { texto: '', status: 'erro', tipoArquivo: tipo, caracteres: 0, mensagemErro: mensagem };
  }
}

/**
 * Heurística leve para prefill de cadastro (e-mail e telefone) — sem IA.
 * Telefone é ancorado em linha rotulada (Telefone/Fone/Celular/Tel), não um
 * regex solto no texto inteiro — um regex cego captura dígitos de qualquer
 * lugar (ex.: timestamp embutido no e-mail), gerando falso positivo.
 */
export function detectarContatoNoTexto(texto: string): { email?: string; fone?: string } {
  const email = texto.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}(?:\.[a-z]{2,})?/i)?.[0];

  const padraoFone = /\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/;
  const linhaFone = texto
    .split(/\r?\n/)
    .find((linha) => /^\s*(telefone|fone|celular|tel)\s*:/i.test(linha));
  const fone = linhaFone ? padraoFone.exec(linhaFone)?.[0] : undefined;

  return { email, fone };
}

/** Cabeçalhos comuns que ocupam a primeira linha e não são o nome de ninguém. */
const CABECALHOS_IGNORADOS =
  /^(curr[ií]culo|curriculum|curriculum\s+vitae|cv|dados\s+pessoais|perfil\s+profissional|resumo)\b/i;

/**
 * Nome do candidato a partir do currículo, para importação em lote — sem IA.
 *
 * Currículo não tem campo "nome": o nome é quase sempre a primeira linha de
 * conteúdo, em destaque. A heurística aceita apenas linhas curtas, de 2 a 5
 * palavras, só com letras (acentos e hífen inclusos), descartando cabeçalhos
 * ("Currículo", "Dados pessoais") e qualquer linha com dígito, "@" ou ":" —
 * sinais de que é contato, endereço ou rótulo, não nome.
 *
 * Quando o texto não entrega nada confiável, cai no nome do arquivo
 * (`joao_silva.pdf` → "Joao Silva"), padrão comum em exportação de portal. Se
 * nem isso resolver, devolve `undefined` — quem chama decide, e a importação
 * prefere marcar o arquivo para revisão a inventar um nome.
 */
export function detectarNomeNoTexto(texto: string, nomeArquivo?: string): string | undefined {
  const candidata = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 5 && l.length <= 60)
    .filter((l) => !/[\d@:;|/\\]/.test(l))
    .filter((l) => !CABECALHOS_IGNORADOS.test(l))
    .find((l) => {
      const palavras = l.split(/\s+/);
      return palavras.length >= 2 && palavras.length <= 5 && /^[\p{L}\s'-]+$/u.test(l);
    });
  if (candidata) return normalizarNome(candidata);

  if (!nomeArquivo) return undefined;
  const base = nomeArquivo.replace(/\.[^.]+$/, '').replace(/[_.-]+/g, ' ').trim();
  const palavras = base.split(/\s+/);
  if (palavras.length < 2 || palavras.length > 5 || !/^[\p{L}\s'-]+$/u.test(base)) return undefined;
  return normalizarNome(base);
}

/** "JOÃO DA SILVA" e "joão da silva" viram "João da Silva" — preposições em minúscula. */
const PREPOSICOES = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
function normalizarNome(bruto: string): string {
  return bruto
    .split(/\s+/)
    .map((p, i) => {
      const minuscula = p.toLocaleLowerCase('pt-BR');
      if (i > 0 && PREPOSICOES.has(minuscula)) return minuscula;
      return minuscula.charAt(0).toLocaleUpperCase('pt-BR') + minuscula.slice(1);
    })
    .join(' ');
}
