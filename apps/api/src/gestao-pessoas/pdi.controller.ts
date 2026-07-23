import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import type { Prisma } from '@prisma/client';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { progressoDoPlano } from './pdi';

const TIPOS_ACAO = ['TREINAMENTO', 'LEITURA', 'PROJETO', 'MENTORIA', 'CERTIFICACAO', 'OUTRO'] as const;
const STATUS_ACAO = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'] as const;
const STATUS_PDI = ['RASCUNHO', 'ATIVO', 'CONCLUIDO', 'CANCELADO'] as const;

const esquemaPlano = z.object({
  codFun: z.coerce.bigint(),
  titulo: z.string().min(2).max(160),
  objetivo: z.string().max(4000).optional(),
  codUsuResp: z.coerce.bigint().optional(),
  dtRevisao: z.coerce.date().optional(),
});

const esquemaAcao = z.object({
  descricao: z.string().min(2).max(300),
  tipo: z.enum(TIPOS_ACAO).default('TREINAMENTO'),
  competencia: z.string().max(120).optional(),
  prazo: z.coerce.date().optional(),
});

const esquemaAtualizarAcao = z.object({
  status: z.enum(STATUS_ACAO).optional(),
  progresso: z.coerce.number().int().min(0).max(100).optional(),
  descricao: z.string().min(2).max(300).optional(),
  prazo: z.coerce.date().optional(),
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

/**
 * Plano de Desenvolvimento Individual (RN-GP-020).
 *
 * Primeira frente da fase 2 de Gestão de Pessoas: o funcionário admitido entra
 * já com um plano, e as ações concretas dentro dele são acompanhadas até
 * concluir. Nenhuma folha de pagamento envolvida — este módulo é sobre
 * desenvolvimento, não remuneração.
 */
@Controller('gestao-pessoas/pdi')
export class PdiController {
  constructor(private readonly prisma: PrismaService) {}

  /** Planos de um funcionário (ou todos, se `codFun` ausente). */
  @Get()
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async listar(@Req() req: ReqAut, @Query('codFun') codFun?: string) {
    const planos = await this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.planoDesenvolvimento.findMany({
        where: codFun ? { codFun: BigInt(codFun) } : {},
        orderBy: { codPdi: 'desc' },
        include: {
          funcionario: { select: { nomeFun: true } },
          responsavel: { select: { nomeUsu: true } },
          acoes: { select: { status: true, progresso: true } },
        },
      }),
    );
    return planos.map((p) => {
      const { acoes, ...resto } = p;
      return {
        ...resto,
        totalAcoes: acoes.length,
        acoesConcluidas: acoes.filter((a) => a.status === 'CONCLUIDA').length,
        progresso: progressoDoPlano(acoes),
      };
    });
  }

  /** Detalhe do plano com as ações, na ordem. */
  @Get(':codPdi')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async detalhar(@Req() req: ReqAut, @Param('codPdi') codPdi: string) {
    const plano = await this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.planoDesenvolvimento.findFirst({
        where: { codPdi: BigInt(codPdi) },
        include: {
          funcionario: { select: { codFun: true, nomeFun: true } },
          responsavel: { select: { codUsu: true, nomeUsu: true } },
          acoes: { orderBy: [{ ordem: 'asc' }, { codAcao: 'asc' }] },
        },
      }),
    );
    if (!plano) throw new BadRequestException('Plano inexistente neste tenant');
    return { ...plano, progresso: progressoDoPlano(plano.acoes) };
  }

  @Post()
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async criar(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaPlano, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const func = await tx.funcionario.findFirst({ where: { codFun: dados.codFun, ativo: 'S' } });
      if (!func) throw new BadRequestException('Funcionário inexistente neste tenant');
      return tx.planoDesenvolvimento.create({
        data: {
          codTen: req.usuario.codTen,
          codFun: dados.codFun,
          titulo: dados.titulo,
          objetivo: dados.objetivo,
          codUsuResp: dados.codUsuResp ?? req.usuario.codUsu,
          dtRevisao: dados.dtRevisao,
          codUsuInc: req.usuario.codUsu,
        },
      });
    });
  }

  @Patch(':codPdi')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async atualizarPlano(@Req() req: ReqAut, @Param('codPdi') codPdi: string, @Body() corpo: unknown) {
    const dados = validar(
      z.object({
        titulo: z.string().min(2).max(160).optional(),
        objetivo: z.string().max(4000).optional(),
        status: z.enum(STATUS_PDI).optional(),
        codUsuResp: z.coerce.bigint().optional(),
        dtRevisao: z.coerce.date().optional(),
      }),
      corpo,
    );
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const existe = await tx.planoDesenvolvimento.findFirst({ where: { codPdi: BigInt(codPdi) } });
      if (!existe) throw new BadRequestException('Plano inexistente neste tenant');
      return tx.planoDesenvolvimento.update({
        where: { codPdi: existe.codPdi },
        data: { ...dados, codUsuAlt: req.usuario.codUsu },
      });
    });
  }

  // ===== Ações do plano =====

  @Post(':codPdi/acoes')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async adicionarAcao(@Req() req: ReqAut, @Param('codPdi') codPdi: string, @Body() corpo: unknown) {
    const dados = validar(esquemaAcao, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const plano = await tx.planoDesenvolvimento.findFirst({ where: { codPdi: BigInt(codPdi) } });
      if (!plano) throw new BadRequestException('Plano inexistente neste tenant');
      const ultima = await tx.acaoDesenvolvimento.findFirst({
        where: { codPdi: plano.codPdi },
        orderBy: { ordem: 'desc' },
        select: { ordem: true },
      });
      return tx.acaoDesenvolvimento.create({
        data: {
          codTen: req.usuario.codTen,
          codPdi: plano.codPdi,
          ...dados,
          ordem: (ultima?.ordem ?? 0) + 1,
          codUsuInc: req.usuario.codUsu,
        },
      });
    });
  }

  @Patch('acoes/:codAcao')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async atualizarAcao(@Req() req: ReqAut, @Param('codAcao') codAcao: string, @Body() corpo: unknown) {
    const dados = validar(esquemaAtualizarAcao, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const acao = await tx.acaoDesenvolvimento.findFirst({ where: { codAcao: BigInt(codAcao) } });
      if (!acao) throw new BadRequestException('Ação inexistente neste tenant');

      const data: Prisma.AcaoDesenvolvimentoUpdateInput = { ...dados };
      // Concluir carimba a data e leva o progresso a 100; reabrir limpa a data.
      // Sem isso, uma ação "concluída" com progresso 60 seria contraditória.
      if (dados.status === 'CONCLUIDA') {
        data.progresso = 100;
        data.dhConclusao = new Date();
      } else if (dados.status) {
        data.dhConclusao = null;
      }
      return tx.acaoDesenvolvimento.update({ where: { codAcao: acao.codAcao }, data });
    });
  }
}
