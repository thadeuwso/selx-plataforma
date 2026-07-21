import { BadRequestException, Controller, Param, Post, Req, ServiceUnavailableException } from '@nestjs/common';
import type { Request } from 'express';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';

/**
 * Explicação por IA de um resultado JÁ CALCULADO (RN-GP-006) — última fase do
 * módulo. Nunca recalcula nem contesta o score determinístico; só traduz em
 * linguagem simples pro RH. Passa pelo AI Gateway (ADR-0003), como
 * `ia-vagas.controller.ts` já faz.
 *
 * A chamada à IA nunca acontece dentro de uma transação Prisma (o timeout
 * padrão de transação interativa é bem menor que a latência de um LLM) —
 * lê-se o resultado, chama-se o gateway fora de transação, e só então
 * persiste-se o resumo, em uma segunda transação curta.
 */

const PURPOSE_RESUMO = 'comportamental.resumo@v1';
const PURPOSE_PERGUNTAS = 'comportamental.perguntas-entrevista@v1';

const PROMPT_BASE = `Você é um assistente de RH de uma plataforma brasileira de gestão de pessoas.
Você recebe o resultado JÁ CALCULADO de uma avaliação comportamental própria da empresa (fatores Direcionamento,
Conexão, Sustentação e Precisão — nunca mencione DISC ou qualquer metodologia comercial de terceiros).
Sua função é só EXPLICAR o que os números já calculados significam — você NUNCA recalcula, contesta ou atribui
uma pontuação própria. Não trate nenhum resultado como "certo" ou "errado" nem como apto/inapto — descreva
tendências de comportamento no trabalho. Idioma: português do Brasil. Responda SOMENTE com JSON válido, sem
markdown, sem comentários, seguindo EXATAMENTE as chaves do modelo abaixo (mesmos nomes, mesmos tipos).`;

const PROMPT_RESUMO = `${PROMPT_BASE}

Sua função específica agora: escrever um resumo executivo curto (2 a 4 frases, tom profissional, sem jargão
técnico) explicando o perfil comportamental, mais 2-3 pontos fortes e 1-3 pontos de atenção — sempre enquadrados
como algo a explorar na entrevista, nunca como defeito.

Modelo exato de resposta:
{ "resumo": "string", "pontosFortes": ["string", "..."], "pontosAtencao": ["string", "..."] }`;

const PROMPT_PERGUNTAS = `${PROMPT_BASE}

Sua função específica agora: sugerir de 3 a 5 perguntas de entrevista comportamental (peça exemplos de situações
reais vividas pelo candidato, não perguntas teóricas) que ajudem o entrevistador a validar na prática os pontos
identificados no resultado. Nunca sugira perguntas sobre saúde, religião, política, vida pessoal, estado civil,
orientação sexual ou qualquer tema sensível.

Modelo exato de resposta:
{ "perguntas": [{ "pergunta": "string", "motivo": "string curta explicando o que essa pergunta ajuda a validar" }] }`;

const ESQUEMA_RESUMO = {
  type: 'object',
  required: ['resumo', 'pontosFortes', 'pontosAtencao'],
  properties: {
    resumo: { type: 'string' },
    pontosFortes: { type: 'array', items: { type: 'string' } },
    pontosAtencao: { type: 'array', items: { type: 'string' } },
  },
} as const;

const ESQUEMA_PERGUNTAS = {
  type: 'object',
  required: ['perguntas'],
  properties: {
    perguntas: {
      type: 'array',
      items: {
        type: 'object',
        required: ['pergunta', 'motivo'],
        properties: { pergunta: { type: 'string' }, motivo: { type: 'string' } },
      },
    },
  },
} as const;

interface RespostaResumo {
  resumo: string;
  pontosFortes: string[];
  pontosAtencao: string[];
}
interface RespostaPerguntas {
  perguntas: { pergunta: string; motivo: string }[];
}

type ReqAut = Request & { usuario: UsuarioAutenticado };
type Tx = Parameters<Parameters<PrismaService['executarNoTenant']>[1]>[0];

async function chamarGateway(codTen: bigint, purpose: string, promptSistema: string, dadosResultado: unknown, esquemaSaida: object) {
  const baseUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';
  const inicio = Date.now();
  let resp: Response;
  try {
    resp = await fetch(`${baseUrl}/v1/ia/gerar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        purpose,
        cod_ten: Number(codTen),
        mensagens: [
          { papel: 'system', conteudo: promptSistema },
          { papel: 'user', conteudo: JSON.stringify(dadosResultado) },
        ],
        orcamento_tokens: 800,
        esquema_saida: esquemaSaida,
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    throw new ServiceUnavailableException({ codigo: 'IA_INDISPONIVEL', mensagem: 'Serviço de IA não respondeu.' });
  }
  const duracaoMs = Date.now() - inicio;
  const json = (await resp.json().catch(() => null)) as { detail?: unknown; conteudo?: unknown; modelo?: string } | null;
  if (!resp.ok) {
    throw new ServiceUnavailableException(json?.detail ?? { codigo: 'IA_ERRO', mensagem: 'Falha ao gerar com IA.' });
  }
  return { conteudo: json?.conteudo, modelo: json?.modelo ?? null, duracaoMs };
}

function montarDadosResultado(resultado: {
  indicadorConsistencia: string;
  fatores: { fator: { sigla: string; nome: string }; percentualNormalizado: unknown; faixaInterpretativa: string }[];
  aderencias: { aderenciaGeral: unknown }[];
}) {
  return {
    indicadorConsistencia: resultado.indicadorConsistencia,
    fatores: resultado.fatores.map((f) => ({
      sigla: f.fator.sigla,
      nome: f.fator.nome,
      percentual: Number(f.percentualNormalizado),
      faixa: f.faixaInterpretativa,
    })),
    aderenciaGeralVaga: resultado.aderencias[0] ? Number(resultado.aderencias[0].aderenciaGeral) : null,
  };
}

async function buscarResultado(tx: Tx, codCdt: string) {
  const convite = await tx.conviteComportamental.findFirst({
    where: { codCdt: BigInt(codCdt) },
    orderBy: { codConv: 'desc' },
    include: {
      sessao: {
        include: {
          resultado: {
            include: {
              fatores: { include: { fator: true } },
              aderencias: true,
            },
          },
        },
      },
    },
  });
  if (!convite?.sessao?.resultado) {
    throw new BadRequestException('Esta candidatura ainda não tem resultado de avaliação comportamental');
  }
  return convite.sessao.resultado;
}

@Controller('candidaturas/:codCdt/avaliacao-comportamental')
export class IaComportamentalController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('gerar-resumo')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async gerarResumo(@Req() req: ReqAut, @Param('codCdt') codCdt: string): Promise<RespostaResumo> {
    const codTen = req.usuario.codTen;
    const resultado = await this.prisma.executarNoTenant(codTen, (tx) => buscarResultado(tx, codCdt));

    const existente = await this.prisma.executarNoTenant(codTen, (tx) =>
      tx.iAResumoComportamental.findFirst({
        where: { codResult: resultado.codResult, tipo: 'RESUMO_EXECUTIVO', status: 'OK' },
        orderBy: { codIaResumo: 'desc' },
      }),
    );
    if (existente) return existente.conteudoJson as unknown as RespostaResumo;

    const { conteudo, modelo, duracaoMs } = await chamarGateway(
      codTen, PURPOSE_RESUMO, PROMPT_RESUMO, montarDadosResultado(resultado), ESQUEMA_RESUMO,
    );
    await this.prisma.executarNoTenant(codTen, (tx) =>
      tx.iAResumoComportamental.create({
        data: {
          codTen, codResult: resultado.codResult, tipo: 'RESUMO_EXECUTIVO',
          conteudoJson: conteudo as object, modeloUsado: modelo, versaoPrompt: 'v1', duracaoMs, status: 'OK',
        },
      }),
    );
    return conteudo as RespostaResumo;
  }

  @Post('gerar-perguntas-entrevista')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async gerarPerguntasEntrevista(@Req() req: ReqAut, @Param('codCdt') codCdt: string): Promise<RespostaPerguntas> {
    const codTen = req.usuario.codTen;
    const resultado = await this.prisma.executarNoTenant(codTen, (tx) => buscarResultado(tx, codCdt));

    const existente = await this.prisma.executarNoTenant(codTen, (tx) =>
      tx.iAResumoComportamental.findFirst({
        where: { codResult: resultado.codResult, tipo: 'PERGUNTAS_ENTREVISTA', status: 'OK' },
        orderBy: { codIaResumo: 'desc' },
      }),
    );
    if (existente) return existente.conteudoJson as unknown as RespostaPerguntas;

    const { conteudo, modelo, duracaoMs } = await chamarGateway(
      codTen, PURPOSE_PERGUNTAS, PROMPT_PERGUNTAS, montarDadosResultado(resultado), ESQUEMA_PERGUNTAS,
    );
    await this.prisma.executarNoTenant(codTen, (tx) =>
      tx.iAResumoComportamental.create({
        data: {
          codTen, codResult: resultado.codResult, tipo: 'PERGUNTAS_ENTREVISTA',
          conteudoJson: conteudo as object, modeloUsado: modelo, versaoPrompt: 'v1', duracaoMs, status: 'OK',
        },
      }),
    );
    return conteudo as RespostaPerguntas;
  }
}
