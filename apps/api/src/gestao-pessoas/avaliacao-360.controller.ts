import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { resolverAvaliacao } from './nota-avaliacao';

type ReqAut = Request & { usuario: UsuarioAutenticado };

export const TIPOS_AVALIADOR = ['AUTO', 'GESTOR', 'PAR', 'LIDERADO', 'COMITE', 'CLIENTE_INTERNO'] as const;

/** Grau derivado dos tipos: ≤2 → 180°, 3 → 270°, ≥4 → 360°. Só um rótulo. */
export function grauDoModelo(qtdTipos: number): string {
  if (qtdTipos >= 4) return '360°';
  if (qtdTipos === 3) return '270°';
  return '180°';
}

const esquemaModelo = z.object({
  nome: z.string().min(2).max(160),
  codEmp: z.coerce.bigint().nullish(),
  codDep: z.coerce.bigint().nullish(),
  colaboradores: z.array(z.coerce.bigint()).default([]),
  avaliadores: z
    .array(
      z.object({
        tipo: z.enum(TIPOS_AVALIADOR),
        peso: z.coerce.number().int().min(1).max(10).default(1),
        obrigatorio: z.boolean().default(true),
      }),
    )
    .min(1),
});
const esquemaCompetenciasCargo = z.object({
  competencias: z
    .array(
      z.object({
        nome: z.string().min(1).max(160),
        nivelEsperado: z.coerce.number().int().min(1).max(5),
        criticidade: z.enum(['ALTA', 'MEDIA', 'BAIXA']).default('MEDIA'),
        descricao: z.string().max(2000).optional(),
        justificativa: z.string().max(2000).optional(),
      }),
    )
    .max(50),
});
const esquemaAtribuir = z.object({ codUsuAvaliador: z.coerce.bigint() });
const esquemaNotaPart = z.object({
  codComp: z.coerce.bigint(),
  nota: z.coerce.number().int().min(1).max(5),
  comentario: z.string().max(2000).optional(),
});

function validar<T extends z.ZodTypeAny>(esquema: T, corpo: unknown): z.infer<T> {
  try {
    return esquema.parse(corpo);
  } catch (erro) {
    if (erro instanceof ZodError) throw new BadRequestException({ mensagem: 'Dados inválidos', detalhes: erro.issues });
    throw erro;
  }
}

/**
 * Avaliação 360 configurável por cargo (performance-360, RN-GP-025).
 *
 * Config do modelo por cargo, participantes de uma avaliação (instanciados do
 * modelo ao enturmar) e as notas de cada participante. A nota final é sempre a
 * consolidação ponderada — ver `resolverAvaliacao`.
 */
@Controller('gestao-pessoas')
export class Avaliacao360Controller {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Modelos 360 com escopo (empresa/departamento/colaboradores) ----

  /** Lista os modelos do tenant com escopo, tipos e grau. */
  @Get('modelos-360')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async listarModelos(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const modelos = await tx.modeloAvaliacao360.findMany({
        where: { ativo: 'S' },
        orderBy: { codMod: 'desc' },
        select: {
          codMod: true,
          nome: true,
          empresa: { select: { nomeFantasia: true } },
          departamento: { select: { descrDep: true } },
          avaliadores: { where: { ativo: 'S' }, select: { tipo: true } },
          _count: { select: { alvos: true } },
        },
      });
      return modelos.map((m) => ({
        codMod: m.codMod,
        nome: m.nome,
        empresa: m.empresa?.nomeFantasia ?? null,
        departamento: m.departamento?.descrDep ?? null,
        qtdColaboradores: m._count.alvos,
        tipos: m.avaliadores.map((a) => a.tipo),
        grau: grauDoModelo(m.avaliadores.length),
      }));
    });
  }

  @Get('modelos-360/:codMod')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async detalharModelo(@Req() req: ReqAut, @Param('codMod') codMod: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const m = await tx.modeloAvaliacao360.findFirst({
        where: { codMod: BigInt(codMod), ativo: 'S' },
        include: {
          avaliadores: { where: { ativo: 'S' }, orderBy: { codModAval: 'asc' } },
          alvos: { select: { codFun: true, funcionario: { select: { nomeFun: true } } } },
        },
      });
      if (!m) throw new NotFoundException('Modelo inexistente neste tenant');
      return {
        codMod: m.codMod,
        nome: m.nome,
        codEmp: m.codEmp,
        codDep: m.codDep,
        avaliadores: m.avaliadores.map((a) => ({ tipo: a.tipo, peso: a.peso, obrigatorio: a.obrigatorio === 'S' })),
        colaboradores: m.alvos.map((a) => ({ codFun: a.codFun, nome: a.funcionario.nomeFun })),
      };
    });
  }

  @Post('modelos-360')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async criarModelo(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaModelo, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const modelo = await tx.modeloAvaliacao360.create({
        data: {
          codTen: req.usuario.codTen,
          nome: dados.nome,
          codEmp: dados.codEmp ?? null,
          codDep: dados.codDep ?? null,
          codUsuInc: req.usuario.codUsu,
        },
      });
      await this.sincronizarModelo(tx, req.usuario.codTen, modelo.codMod, dados);
      return { ok: true, codMod: modelo.codMod };
    });
  }

  @Put('modelos-360/:codMod')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async atualizarModelo(@Req() req: ReqAut, @Param('codMod') codMod: string, @Body() corpo: unknown) {
    const dados = validar(esquemaModelo, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const m = await tx.modeloAvaliacao360.findFirst({ where: { codMod: BigInt(codMod), ativo: 'S' } });
      if (!m) throw new NotFoundException('Modelo inexistente neste tenant');
      await tx.modeloAvaliacao360.update({
        where: { codMod: m.codMod },
        data: { nome: dados.nome, codEmp: dados.codEmp ?? null, codDep: dados.codDep ?? null },
      });
      await this.sincronizarModelo(tx, req.usuario.codTen, m.codMod, dados);
      return { ok: true, codMod: m.codMod };
    });
  }

  @Patch('modelos-360/:codMod/remover')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async removerModelo(@Req() req: ReqAut, @Param('codMod') codMod: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const m = await tx.modeloAvaliacao360.findFirst({ where: { codMod: BigInt(codMod) } });
      if (!m) throw new NotFoundException('Modelo inexistente neste tenant');
      await tx.modeloAvaliacao360.update({ where: { codMod: m.codMod }, data: { ativo: 'N' } });
      return { ok: true };
    });
  }

  /** Sincroniza avaliadores (soft-remove) e alvos de um modelo. */
  private async sincronizarModelo(
    tx: Parameters<Parameters<PrismaService['executarNoTenant']>[1]>[0],
    codTen: bigint,
    codMod: bigint,
    dados: z.infer<typeof esquemaModelo>,
  ) {
    const tiposInformados = new Set(dados.avaliadores.map((a) => a.tipo));
    for (const a of dados.avaliadores) {
      await tx.modeloAvaliador360.upsert({
        where: { codMod_tipo: { codMod, tipo: a.tipo } },
        create: { codTen, codMod, tipo: a.tipo, peso: a.peso, obrigatorio: a.obrigatorio ? 'S' : 'N' },
        update: { peso: a.peso, obrigatorio: a.obrigatorio ? 'S' : 'N', ativo: 'S' },
      });
    }
    const existentes = await tx.modeloAvaliador360.findMany({ where: { codMod, ativo: 'S' } });
    for (const e of existentes) {
      if (!tiposInformados.has(e.tipo as (typeof TIPOS_AVALIADOR)[number])) {
        await tx.modeloAvaliador360.update({ where: { codModAval: e.codModAval }, data: { ativo: 'N' } });
      }
    }
    // Alvos (colaboradores): soft-remove todos e reativa/insere os informados.
    await tx.modeloAlvo360.updateMany({ where: { codMod, ativo: 'S' }, data: { ativo: 'N' } });
    for (const codFun of dados.colaboradores) {
      await tx.modeloAlvo360.upsert({
        where: { codMod_codFun: { codMod, codFun } },
        create: { codTen, codMod, codFun },
        update: { ativo: 'S' },
      });
    }
  }

  /**
   * Modelo 360 aplicável a um funcionário, pela precedência de escopo:
   * colaborador-alvo › departamento › empresa › padrão do tenant (ambos nulos).
   * Retorna o modelo mais específico ou null (→ avaliador único).
   */
  static async modeloAplicavel(
    tx: Parameters<Parameters<PrismaService['executarNoTenant']>[1]>[0],
    fun: { codFun: bigint; codEmp: bigint | null; codDep: bigint | null },
  ) {
    const modelos = await tx.modeloAvaliacao360.findMany({
      where: { ativo: 'S' },
      orderBy: { codMod: 'desc' },
      select: {
        codMod: true,
        codEmp: true,
        codDep: true,
        alvos: { where: { ativo: 'S' }, select: { codFun: true } },
        avaliadores: { where: { ativo: 'S' }, select: { tipo: true, peso: true } },
      },
    });
    const pontua = (m: (typeof modelos)[number]): number => {
      if (m.alvos.some((a) => a.codFun === fun.codFun)) return 3; // alvo específico
      if (m.codDep !== null && m.codDep === fun.codDep) return 2; // departamento
      if (m.codEmp !== null && m.codEmp === fun.codEmp && m.codDep === null) return 1; // empresa
      // "tudo nulo" só é padrão do tenant se NÃO for um modelo de alvos específicos —
      // senão um modelo mirado em pessoas vazaria para todo mundo.
      if (m.codEmp === null && m.codDep === null && m.alvos.length === 0) return 0;
      return -1; // escopo não cobre este funcionário
    };
    let escolhido: (typeof modelos)[number] | null = null;
    let melhor = -1;
    for (const m of modelos) {
      const p = pontua(m);
      if (p > melhor) {
        melhor = p;
        escolhido = m;
      }
    }
    return escolhido && escolhido.avaliadores.length > 0 ? escolhido : null;
  }

  // ---- Competências esperadas do cargo (role-fit) ----

  @Get('cargos/:codCar/competencias-esperadas')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async competenciasEsperadas(@Req() req: ReqAut, @Param('codCar') codCar: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cargo = await tx.cargo.findFirst({ where: { codCar: BigInt(codCar), ativo: 'S' }, select: { nomeCar: true } });
      if (!cargo) throw new NotFoundException('Cargo inexistente neste tenant');
      const competencias = await tx.competenciaCargo.findMany({
        where: { codCar: BigInt(codCar), ativo: 'S' },
        orderBy: [{ ordem: 'asc' }, { codCarComp: 'asc' }],
        select: { codCarComp: true, nome: true, descricao: true, nivelEsperado: true, criticidade: true, justificativa: true },
      });
      return { cargo: { nomeCar: cargo.nomeCar }, competencias };
    });
  }

  @Put('cargos/:codCar/competencias-esperadas')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async salvarCompetenciasEsperadas(@Req() req: ReqAut, @Param('codCar') codCar: string, @Body() corpo: unknown) {
    const dados = validar(esquemaCompetenciasCargo, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cargo = await tx.cargo.findFirst({ where: { codCar: BigInt(codCar), ativo: 'S' } });
      if (!cargo) throw new NotFoundException('Cargo inexistente neste tenant');
      // Substitui o conjunto: inativa as atuais (sem DELETE) e recria as novas.
      await tx.competenciaCargo.updateMany({ where: { codCar: BigInt(codCar), ativo: 'S' }, data: { ativo: 'N' } });
      if (dados.competencias.length > 0) {
        await tx.competenciaCargo.createMany({
          data: dados.competencias.map((c, i) => ({
            codTen: req.usuario.codTen,
            codCar: BigInt(codCar),
            nome: c.nome,
            descricao: c.descricao,
            nivelEsperado: c.nivelEsperado,
            criticidade: c.criticidade,
            justificativa: c.justificativa,
            ordem: i,
            codUsuInc: req.usuario.codUsu,
          })),
        });
      }
      return { ok: true, total: dados.competencias.length };
    });
  }

  // ---- Participantes de uma avaliação ----

  @Get('avaliacoes/:codAval/participantes')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async participantes(@Req() req: ReqAut, @Param('codAval') codAval: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const aval = await tx.avaliacaoDesempenho.findFirst({
        where: { codAval: BigInt(codAval) },
        include: {
          ciclo: { select: { status: true, competencias: { orderBy: [{ ordem: 'asc' }, { codComp: 'asc' }], select: { codComp: true, nome: true, peso: true } } } },
          notas: { select: { codComp: true, nota: true } },
          participantes: {
            orderBy: { codAvalPart: 'asc' },
            include: { avaliador: { select: { nomeUsu: true } }, notas: { select: { codComp: true, nota: true, comentario: true } } },
          },
        },
      });
      if (!aval) throw new NotFoundException('Avaliação inexistente neste tenant');

      const resolvida = resolverAvaliacao(
        aval.ciclo.competencias,
        aval.notas,
        aval.participantes.map((p) => ({ peso: p.peso, notas: p.notas })),
      );

      return {
        codAval: aval.codAval,
        cicloStatus: aval.ciclo.status,
        modo: resolvida.modo,
        notaFinal: resolvida.notaFinal,
        competencias: aval.ciclo.competencias,
        participantes: aval.participantes.map((p) => ({
          codAvalPart: p.codAvalPart,
          tipo: p.tipo,
          peso: p.peso,
          status: p.status,
          avaliador: p.avaliador?.nomeUsu ?? null,
          codUsuAvaliador: p.codUsuAvaliador,
          notas: p.notas,
        })),
      };
    });
  }

  @Patch('participantes/:codAvalPart')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async atribuir(@Req() req: ReqAut, @Param('codAvalPart') codAvalPart: string, @Body() corpo: unknown) {
    const dados = validar(esquemaAtribuir, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const part = await tx.participanteAvaliacao.findFirst({ where: { codAvalPart: BigInt(codAvalPart) } });
      if (!part) throw new NotFoundException('Participante inexistente neste tenant');
      await tx.participanteAvaliacao.update({
        where: { codAvalPart: part.codAvalPart },
        data: { codUsuAvaliador: dados.codUsuAvaliador },
      });
      return { ok: true };
    });
  }

  @Patch('participantes/:codAvalPart/notas')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async lancarNotaParticipante(@Req() req: ReqAut, @Param('codAvalPart') codAvalPart: string, @Body() corpo: unknown) {
    const dados = validar(esquemaNotaPart, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const part = await tx.participanteAvaliacao.findFirst({
        where: { codAvalPart: BigInt(codAvalPart) },
        include: { avaliacao: { select: { codCiclo: true, ciclo: { select: { status: true } } } } },
      });
      if (!part) throw new NotFoundException('Participante inexistente neste tenant');
      if (part.status === 'CONCLUIDA') throw new BadRequestException('Participante já concluiu — não aceita mudança');
      if (part.avaliacao.ciclo.status !== 'ABERTO') throw new BadRequestException('Ciclo não está aberto para avaliação');

      const comp = await tx.competenciaCiclo.findFirst({ where: { codComp: dados.codComp, codCiclo: part.avaliacao.codCiclo } });
      if (!comp) throw new BadRequestException('Competência não pertence ao ciclo desta avaliação');

      const existente = await tx.notaParticipante.findFirst({ where: { codAvalPart: part.codAvalPart, codComp: dados.codComp } });
      if (existente) {
        await tx.notaParticipante.update({ where: { codNotaPart: existente.codNotaPart }, data: { nota: dados.nota, comentario: dados.comentario } });
      } else {
        await tx.notaParticipante.create({
          data: { codTen: req.usuario.codTen, codAvalPart: part.codAvalPart, codComp: dados.codComp, nota: dados.nota, comentario: dados.comentario },
        });
      }
      if (part.status === 'PENDENTE') {
        await tx.participanteAvaliacao.update({ where: { codAvalPart: part.codAvalPart }, data: { status: 'EM_ANDAMENTO' } });
      }
      return { ok: true };
    });
  }

  @Patch('participantes/:codAvalPart/concluir')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async concluirParticipante(@Req() req: ReqAut, @Param('codAvalPart') codAvalPart: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const part = await tx.participanteAvaliacao.findFirst({
        where: { codAvalPart: BigInt(codAvalPart) },
        include: {
          avaliacao: { select: { codCiclo: true, ciclo: { select: { competencias: { select: { codComp: true } } } } } },
          notas: { select: { codComp: true } },
        },
      });
      if (!part) throw new NotFoundException('Participante inexistente neste tenant');
      if (part.status === 'CONCLUIDA') return { ok: true, jaConcluido: true };
      // Só conclui com todas as competências avaliadas por este participante.
      if (part.notas.length < part.avaliacao.ciclo.competencias.length) {
        throw new BadRequestException('Avalie todas as competências antes de concluir');
      }
      await tx.participanteAvaliacao.update({
        where: { codAvalPart: part.codAvalPart },
        data: { status: 'CONCLUIDA', dhConclusao: new Date() },
      });
      return { ok: true };
    });
  }
}
