import { BadRequestException, Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';

/**
 * Banco de perguntas e modelos de questionário comportamental.
 *
 * O catálogo (`TGPFAT`/`TGPPER`) é GLOBAL — metodologia própria, semeada pela
 * plataforma, não editável por tenant (RN-GP-001). O que o recrutador escolhe
 * é o **modelo**: quais perguntas do banco entram no questionário aplicado.
 * Por isso aqui só se LÊ o banco e se CRIA modelo, nunca se edita pergunta.
 */

const esquemaModelo = z.object({
  nome: z.string().min(3),
  codPerguntas: z.array(z.coerce.bigint()).min(4),
  tempoEstimadoMin: z.coerce.number().int().positive().optional(),
  tempoEstimadoMax: z.coerce.number().int().positive().optional(),
});

function validar<T extends z.ZodTypeAny>(esquema: T, corpo: unknown): z.infer<T> {
  try {
    return esquema.parse(corpo);
  } catch (erro) {
    if (erro instanceof ZodError) {
      throw new BadRequestException({ mensagem: 'Dados inválidos', detalhes: erro.issues });
    }
    throw erro;
  }
}

type ReqAut = Request & { usuario: UsuarioAutenticado };

@Controller('gestao-pessoas')
export class BancoPerguntasController {
  constructor(private readonly prisma: PrismaService) {}

  /** Banco completo, agrupado por fator — o recrutador vê o que pode entrar no questionário. */
  @Get('perguntas')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async listarPerguntas() {
    const fatores = await this.prisma.admin.fatorComportamental.findMany({
      where: { ativo: 'S' },
      orderBy: { ordem: 'asc' },
      include: {
        perguntas: {
          where: { status: 'ATIVA' },
          orderBy: { codPer: 'asc' },
          select: { codPer: true, texto: true, tipo: true, categoria: true, peso: true },
        },
      },
    });
    return fatores.map((f) => ({
      codFat: f.codFat,
      sigla: f.sigla,
      nome: f.nome,
      descricao: f.descricao,
      perguntas: f.perguntas,
    }));
  }

  /** Modelos disponíveis; o publicado de maior versão é o padrão usado nos convites. */
  @Get('modelos')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async listarModelos() {
    return this.prisma.admin.modeloAvaliacaoComportamental.findMany({
      orderBy: [{ status: 'asc' }, { versao: 'desc' }],
      select: {
        codMod: true,
        nome: true,
        versao: true,
        status: true,
        tempoEstimadoMin: true,
        tempoEstimadoMax: true,
        dhPublicacao: true,
        _count: { select: { perguntas: true } },
      },
    });
  }

  /** Detalhe do modelo com as perguntas escolhidas, na ordem. */
  @Get('modelos/:codMod')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async detalharModelo(@Param('codMod') codMod: string) {
    const modelo = await this.prisma.admin.modeloAvaliacaoComportamental.findUnique({
      where: { codMod: BigInt(codMod) },
      include: {
        perguntas: {
          orderBy: { ordem: 'asc' },
          include: { pergunta: { include: { fator: { select: { sigla: true, nome: true } } } } },
        },
      },
    });
    if (!modelo) throw new BadRequestException('Modelo inexistente');
    return modelo;
  }

  /**
   * Cria um modelo novo já publicado, virando o padrão dos próximos convites
   * (a busca do padrão usa `status: PUBLICADO` ordenado por versão desc).
   * Nunca altera um modelo existente: resultados já calculados guardam
   * `versaoMod` e não podem ter o questionário mudado debaixo deles (RN-GP-007).
   */
  @Post('modelos')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async criarModelo(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaModelo, corpo);

    const perguntas = await this.prisma.admin.perguntaComportamental.findMany({
      where: { codPer: { in: dados.codPerguntas }, status: 'ATIVA' },
      include: { fator: { select: { sigla: true } } },
    });
    if (perguntas.length !== dados.codPerguntas.length) {
      throw new BadRequestException('Alguma pergunta informada não existe ou está inativa');
    }

    // Um fator sem pergunta nenhuma não pontua — o resultado sairia incompleto
    // e a aderência à vaga trataria o fator como zero. Barrar aqui é mais
    // honesto do que entregar um perfil com buraco.
    const fatoresAtivos = await this.prisma.admin.fatorComportamental.findMany({ where: { ativo: 'S' } });
    const siglasCobertas = new Set(perguntas.map((p) => p.fator.sigla));
    const semCobertura = fatoresAtivos.filter((f) => !siglasCobertas.has(f.sigla)).map((f) => f.sigla);
    if (semCobertura.length > 0) {
      throw new BadRequestException(
        `Todo fator precisa de ao menos uma pergunta. Sem cobertura: ${semCobertura.join(', ')}`,
      );
    }

    const ultima = await this.prisma.admin.modeloAvaliacaoComportamental.findFirst({
      orderBy: { versao: 'desc' },
      select: { versao: true },
    });
    const versao = (ultima?.versao ?? 0) + 1;

    const modelo = await this.prisma.admin.modeloAvaliacaoComportamental.create({
      data: {
        nome: dados.nome,
        versao,
        status: 'PUBLICADO',
        tempoEstimadoMin: dados.tempoEstimadoMin ?? Math.max(3, Math.round(dados.codPerguntas.length / 6)),
        tempoEstimadoMax: dados.tempoEstimadoMax ?? Math.max(6, Math.round(dados.codPerguntas.length / 3)),
        dhPublicacao: new Date(),
      },
    });
    await this.prisma.admin.modeloAvaliacaoPergunta.createMany({
      data: dados.codPerguntas.map((codPer, i) => ({ codMod: modelo.codMod, codPer, ordem: i + 1 })),
    });

    return { codMod: modelo.codMod, versao: modelo.versao, qtdPerguntas: dados.codPerguntas.length };
  }
}
