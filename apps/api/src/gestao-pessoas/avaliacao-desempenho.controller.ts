import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { podeConcluir } from './avaliacao-desempenho';
import { resolverAvaliacao } from './nota-avaliacao';
import { Avaliacao360Controller } from './avaliacao-360.controller';

const esquemaCiclo = z.object({
  nome: z.string().min(2).max(160),
  descricao: z.string().max(4000).optional(),
  dtInicio: z.coerce.date(),
  dtFim: z.coerce.date(),
});

const esquemaCicloPatch = z.object({
  nome: z.string().min(2).max(160).optional(),
  descricao: z.string().max(4000).optional(),
  dtInicio: z.coerce.date().optional(),
  dtFim: z.coerce.date().optional(),
  status: z.enum(['RASCUNHO', 'ABERTO', 'ENCERRADO']).optional(),
});

const esquemaCompetencia = z.object({
  nome: z.string().min(2).max(160),
  descricao: z.string().max(2000).optional(),
  peso: z.coerce.number().int().min(0).max(10).default(1),
  ordem: z.coerce.number().int().min(0).default(0),
});

const esquemaEnturmar = z.object({
  codFun: z.coerce.bigint(),
  codUsuAvaliador: z.coerce.bigint().optional(),
});

const esquemaNota = z.object({
  codComp: z.coerce.bigint(),
  nota: z.coerce.number().int().min(1).max(5),
  comentario: z.string().max(2000).optional(),
});

const esquemaAvaliacaoPatch = z.object({
  comentarioGeral: z.string().max(4000).optional(),
  codUsuAvaliador: z.coerce.bigint().optional(),
  concluir: z.boolean().optional(),
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
 * Ciclo de avaliação de desempenho (RN-GP-022).
 *
 * A campanha periódica com competências (RASCUNHO → ABERTO → ENCERRADO), a
 * avaliação por funcionário e a nota por competência. A **nota final é sempre
 * derivada** (ponderada pelas competências), nunca um campo à parte — igual ao
 * progresso do PDI.
 */
@Controller('gestao-pessoas')
export class AvaliacaoDesempenhoController {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Visão geral do desempenho ----

  /**
   * Painel do módulo: novas contratações, andamento das avaliações dos ciclos
   * abertos (quem já completou) e indicadores por departamento. Tudo derivado —
   * nota média por departamento sai das avaliações concluídas, não de um campo.
   */
  @Get('desempenho/visao-geral')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async visaoGeral(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const limite = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const funcionarios = await tx.funcionario.findMany({
        where: { ativo: 'S' },
        select: {
          codFun: true,
          nomeFun: true,
          dtAdm: true,
          codDep: true,
          departamento: { select: { descrDep: true } },
          cargo: { select: { nomeCar: true } },
        },
      });

      const novasContratacoes = funcionarios
        .filter((f) => f.dtAdm >= limite)
        .sort((a, b) => b.dtAdm.getTime() - a.dtAdm.getTime())
        .map((f) => ({
          codFun: f.codFun,
          nomeFun: f.nomeFun,
          dtAdm: f.dtAdm,
          cargo: f.cargo?.nomeCar ?? null,
          departamento: f.departamento?.descrDep ?? null,
        }));

      // Avaliações dos ciclos ABERTOS — o que está acontecendo agora.
      const abertas = await tx.avaliacaoDesempenho.findMany({
        where: { ciclo: { status: 'ABERTO' } },
        select: {
          codFun: true,
          status: true,
          dhConclusao: true,
          funcionario: { select: { nomeFun: true } },
          ciclo: { select: { nome: true, competencias: { select: { codComp: true, peso: true } } } },
          notas: { select: { codComp: true, nota: true } },
          participantes: { select: { peso: true, notas: { select: { codComp: true, nota: true } } } },
        },
      });
      const notaDe = (
        comps: { codComp: bigint; peso: number }[],
        notas: { codComp: bigint; nota: number }[],
        participantes: { peso: number; notas: { codComp: bigint; nota: number }[] }[],
      ) => resolverAvaliacao(comps, notas, participantes).notaFinal;
      const concluidas = abertas.filter((a) => a.status === 'CONCLUIDA');
      const avaliacao = {
        total: abertas.length,
        concluidas: concluidas.length,
        emAndamento: abertas.filter((a) => a.status === 'EM_ANDAMENTO').length,
        pendentes: abertas.filter((a) => a.status === 'PENDENTE').length,
        concluidasLista: concluidas.map((a) => ({
          codFun: a.codFun,
          nomeFun: a.funcionario.nomeFun,
          ciclo: a.ciclo.nome,
          dhConclusao: a.dhConclusao,
          notaFinal: notaDe(a.ciclo.competencias, a.notas, a.participantes),
        })),
      };

      // Nota média por departamento — de todas as avaliações concluídas (histórico).
      const concluidasTodas = await tx.avaliacaoDesempenho.findMany({
        where: { status: 'CONCLUIDA' },
        select: {
          codFun: true,
          ciclo: { select: { competencias: { select: { codComp: true, peso: true } } } },
          notas: { select: { codComp: true, nota: true } },
          participantes: { select: { peso: true, notas: { select: { codComp: true, nota: true } } } },
        },
      });
      const notasPorFun = new Map<string, number[]>();
      for (const a of concluidasTodas) {
        const nf = notaDe(a.ciclo.competencias, a.notas, a.participantes);
        if (nf !== null) {
          const arr = notasPorFun.get(a.codFun.toString()) ?? [];
          arr.push(nf);
          notasPorFun.set(a.codFun.toString(), arr);
        }
      }
      const grupos = new Map<string, { codDep: string | null; departamento: string; headcount: number; notas: number[] }>();
      for (const f of funcionarios) {
        const chave = f.codDep ? f.codDep.toString() : 'sem';
        const g =
          grupos.get(chave) ??
          {
            codDep: f.codDep ? f.codDep.toString() : null,
            departamento: f.departamento?.descrDep ?? 'Sem departamento',
            headcount: 0,
            notas: [] as number[],
          };
        g.headcount += 1;
        const nf = notasPorFun.get(f.codFun.toString());
        if (nf) g.notas.push(...nf);
        grupos.set(chave, g);
      }
      const porDepartamento = [...grupos.values()]
        .map((g) => ({
          codDep: g.codDep,
          departamento: g.departamento,
          headcount: g.headcount,
          avaliados: g.notas.length,
          notaMedia: g.notas.length
            ? Math.round((g.notas.reduce((s, n) => s + n, 0) / g.notas.length) * 10) / 10
            : null,
        }))
        .sort((a, b) => b.headcount - a.headcount);

      return { novasContratacoes, avaliacao, porDepartamento };
    });
  }

  // ---- Ciclos ----

  @Get('ciclos')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async listarCiclos(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const ciclos = await tx.cicloAvaliacao.findMany({
        orderBy: { codCiclo: 'desc' },
        include: {
          _count: { select: { competencias: true, avaliacoes: true } },
          avaliacoes: { select: { status: true } },
        },
      });
      return ciclos.map((c) => ({
        codCiclo: c.codCiclo,
        nome: c.nome,
        descricao: c.descricao,
        dtInicio: c.dtInicio,
        dtFim: c.dtFim,
        status: c.status,
        qtdCompetencias: c._count.competencias,
        qtdAvaliacoes: c._count.avaliacoes,
        qtdConcluidas: c.avaliacoes.filter((a) => a.status === 'CONCLUIDA').length,
      }));
    });
  }

  @Post('ciclos')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  criarCiclo(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaCiclo, corpo);
    if (dados.dtFim < dados.dtInicio) throw new BadRequestException('Data de fim antes do início');
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.cicloAvaliacao.create({
        data: {
          codTen: req.usuario.codTen,
          nome: dados.nome,
          descricao: dados.descricao,
          dtInicio: dados.dtInicio,
          dtFim: dados.dtFim,
          codUsuInc: req.usuario.codUsu,
        },
      }),
    );
  }

  @Get('ciclos/:codCiclo')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async detalharCiclo(@Req() req: ReqAut, @Param('codCiclo') codCiclo: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const ciclo = await tx.cicloAvaliacao.findFirst({
        where: { codCiclo: BigInt(codCiclo) },
        include: {
          competencias: { orderBy: [{ ordem: 'asc' }, { codComp: 'asc' }] },
          avaliacoes: {
            orderBy: { codAval: 'asc' },
            include: {
              funcionario: { select: { nomeFun: true, numCad: true } },
              avaliador: { select: { nomeUsu: true } },
              notas: { select: { codComp: true, nota: true } },
              participantes: { select: { peso: true, notas: { select: { codComp: true, nota: true } } } },
            },
          },
        },
      });
      if (!ciclo) throw new NotFoundException('Ciclo inexistente neste tenant');

      const totalComp = ciclo.competencias.length;

      return {
        codCiclo: ciclo.codCiclo,
        nome: ciclo.nome,
        descricao: ciclo.descricao,
        dtInicio: ciclo.dtInicio,
        dtFim: ciclo.dtFim,
        status: ciclo.status,
        competencias: ciclo.competencias,
        avaliacoes: ciclo.avaliacoes.map((a) => {
          const resolvida = resolverAvaliacao(ciclo.competencias, a.notas, a.participantes);
          return {
            codAval: a.codAval,
            codFun: a.codFun,
            funcionario: a.funcionario,
            avaliador: a.avaliador,
            status: a.status,
            dhConclusao: a.dhConclusao,
            notaFinal: resolvida.notaFinal,
            competenciasComNota: resolvida.porCompetencia.size,
            totalCompetencias: totalComp,
          };
        }),
      };
    });
  }

  @Patch('ciclos/:codCiclo')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async atualizarCiclo(@Req() req: ReqAut, @Param('codCiclo') codCiclo: string, @Body() corpo: unknown) {
    const dados = validar(esquemaCicloPatch, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const ciclo = await tx.cicloAvaliacao.findFirst({ where: { codCiclo: BigInt(codCiclo) } });
      if (!ciclo) throw new NotFoundException('Ciclo inexistente neste tenant');

      // Abrir um ciclo sem competência entregaria avaliações sem o que avaliar.
      if (dados.status === 'ABERTO' && ciclo.status === 'RASCUNHO') {
        const qtd = await tx.competenciaCiclo.count({ where: { codCiclo: ciclo.codCiclo } });
        if (qtd === 0) throw new BadRequestException('Defina ao menos uma competência antes de abrir o ciclo');
      }
      const dtInicio = dados.dtInicio ?? ciclo.dtInicio;
      const dtFim = dados.dtFim ?? ciclo.dtFim;
      if (dtFim < dtInicio) throw new BadRequestException('Data de fim antes do início');

      return tx.cicloAvaliacao.update({
        where: { codCiclo: ciclo.codCiclo },
        data: {
          nome: dados.nome,
          descricao: dados.descricao,
          dtInicio: dados.dtInicio,
          dtFim: dados.dtFim,
          status: dados.status,
        },
      });
    });
  }

  // ---- Competências ----

  @Post('ciclos/:codCiclo/competencias')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async adicionarCompetencia(@Req() req: ReqAut, @Param('codCiclo') codCiclo: string, @Body() corpo: unknown) {
    const dados = validar(esquemaCompetencia, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const ciclo = await tx.cicloAvaliacao.findFirst({ where: { codCiclo: BigInt(codCiclo) } });
      if (!ciclo) throw new NotFoundException('Ciclo inexistente neste tenant');
      // Ciclo encerrado é congelado: mexer nas competências mudaria a régua de
      // avaliações já concluídas.
      if (ciclo.status === 'ENCERRADO') throw new BadRequestException('Ciclo encerrado não aceita mudanças');
      return tx.competenciaCiclo.create({
        data: {
          codTen: req.usuario.codTen,
          codCiclo: ciclo.codCiclo,
          nome: dados.nome,
          descricao: dados.descricao,
          peso: dados.peso,
          ordem: dados.ordem,
        },
      });
    });
  }

  // ---- Avaliações (enturmar funcionário) ----

  @Post('ciclos/:codCiclo/avaliacoes')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async enturmar(@Req() req: ReqAut, @Param('codCiclo') codCiclo: string, @Body() corpo: unknown) {
    const dados = validar(esquemaEnturmar, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const ciclo = await tx.cicloAvaliacao.findFirst({ where: { codCiclo: BigInt(codCiclo) } });
      if (!ciclo) throw new NotFoundException('Ciclo inexistente neste tenant');
      if (ciclo.status === 'ENCERRADO') throw new BadRequestException('Ciclo encerrado não aceita novos avaliados');

      const func = await tx.funcionario.findFirst({ where: { codFun: dados.codFun, ativo: 'S' }, select: { codFun: true, codEmp: true, codDep: true } });
      if (!func) throw new BadRequestException('Funcionário inexistente neste tenant');

      // Uma avaliação por funcionário por ciclo — não avaliar a mesma pessoa duas
      // vezes na mesma campanha.
      const jaTem = await tx.avaliacaoDesempenho.findFirst({
        where: { codCiclo: ciclo.codCiclo, codFun: dados.codFun },
      });
      if (jaTem) throw new BadRequestException('Funcionário já está neste ciclo');

      const avaliacao = await tx.avaliacaoDesempenho.create({
        data: {
          codTen: req.usuario.codTen,
          codCiclo: ciclo.codCiclo,
          codFun: dados.codFun,
          codUsuAvaliador: dados.codUsuAvaliador,
          codUsuInc: req.usuario.codUsu,
        },
      });

      // 360 com escopo (RN-GP-027): acha o modelo mais específico que cobre este
      // funcionário (colaborador › departamento › empresa › padrão) e instancia
      // um participante por tipo. Ninguém coberto mantém o avaliador único.
      const modelo = await Avaliacao360Controller.modeloAplicavel(tx, func);
      if (modelo) {
        await tx.participanteAvaliacao.createMany({
          data: modelo.avaliadores.map((a) => ({
            codTen: req.usuario.codTen,
            codAval: avaliacao.codAval,
            tipo: a.tipo,
            peso: a.peso,
          })),
        });
      }
      return avaliacao;
    });
  }

  @Get('avaliacoes')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async listarAvaliacoesDoFuncionario(@Req() req: ReqAut, @Query('codFun') codFun?: string) {
    if (!codFun) throw new BadRequestException('Informe o funcionário (codFun)');
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const avals = await tx.avaliacaoDesempenho.findMany({
        where: { codFun: BigInt(codFun) },
        orderBy: { codAval: 'desc' },
        include: {
          ciclo: { select: { nome: true, dtInicio: true, dtFim: true, status: true, competencias: { select: { codComp: true, peso: true } } } },
          avaliador: { select: { nomeUsu: true } },
          notas: { select: { codComp: true, nota: true } },
          participantes: { select: { peso: true, notas: { select: { codComp: true, nota: true } } } },
        },
      });
      return avals.map((a) => ({
        codAval: a.codAval,
        ciclo: { nome: a.ciclo.nome, dtInicio: a.ciclo.dtInicio, dtFim: a.ciclo.dtFim, status: a.ciclo.status },
        avaliador: a.avaliador,
        status: a.status,
        dhConclusao: a.dhConclusao,
        notaFinal: resolverAvaliacao(a.ciclo.competencias, a.notas, a.participantes).notaFinal,
      }));
    });
  }

  @Get('avaliacoes/:codAval')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async detalharAvaliacao(@Req() req: ReqAut, @Param('codAval') codAval: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const aval = await tx.avaliacaoDesempenho.findFirst({
        where: { codAval: BigInt(codAval) },
        include: {
          funcionario: { select: { nomeFun: true, numCad: true } },
          avaliador: { select: { nomeUsu: true } },
          ciclo: {
            select: {
              codCiclo: true,
              nome: true,
              status: true,
              competencias: { orderBy: [{ ordem: 'asc' }, { codComp: 'asc' }] },
            },
          },
          notas: true,
          participantes: { select: { peso: true, notas: { select: { codComp: true, nota: true } } } },
        },
      });
      if (!aval) throw new NotFoundException('Avaliação inexistente neste tenant');

      const resolvida = resolverAvaliacao(aval.ciclo.competencias, aval.notas, aval.participantes);
      const notaPorComp = new Map(aval.notas.map((n) => [n.codComp.toString(), n]));
      const competencias = aval.ciclo.competencias.map((c) => {
        const n = notaPorComp.get(c.codComp.toString());
        return {
          codComp: c.codComp,
          nome: c.nome,
          descricao: c.descricao,
          peso: c.peso,
          // Nota resolvida (single ou consolidada 360); comentário só no modo single.
          nota: resolvida.porCompetencia.get(c.codComp.toString()) ?? null,
          comentario: n?.comentario ?? null,
        };
      });

      return {
        codAval: aval.codAval,
        funcionario: aval.funcionario,
        avaliador: aval.avaliador,
        status: aval.status,
        modo: resolvida.modo,
        comentarioGeral: aval.comentarioGeral,
        dhConclusao: aval.dhConclusao,
        ciclo: { codCiclo: aval.ciclo.codCiclo, nome: aval.ciclo.nome, status: aval.ciclo.status },
        competencias,
        notaFinal: resolvida.notaFinal,
        podeConcluir: podeConcluir(competencias.length, resolvida.porCompetencia.size),
      };
    });
  }

  /** Lança/atualiza a nota de uma competência (upsert por avaliação+competência). */
  @Patch('avaliacoes/:codAval/notas')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async lancarNota(@Req() req: ReqAut, @Param('codAval') codAval: string, @Body() corpo: unknown) {
    const dados = validar(esquemaNota, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const aval = await tx.avaliacaoDesempenho.findFirst({
        where: { codAval: BigInt(codAval) },
        include: { ciclo: { select: { status: true } } },
      });
      if (!aval) throw new NotFoundException('Avaliação inexistente neste tenant');
      if (aval.status === 'CONCLUIDA') throw new BadRequestException('Avaliação concluída não aceita mudança de nota');
      if (aval.ciclo.status !== 'ABERTO') throw new BadRequestException('Ciclo não está aberto para avaliação');

      // A competência precisa ser do ciclo desta avaliação.
      const comp = await tx.competenciaCiclo.findFirst({
        where: { codComp: dados.codComp, codCiclo: aval.codCiclo },
      });
      if (!comp) throw new BadRequestException('Competência não pertence ao ciclo desta avaliação');

      const existente = await tx.notaCompetencia.findFirst({
        where: { codAval: aval.codAval, codComp: dados.codComp },
      });
      if (existente) {
        await tx.notaCompetencia.update({
          where: { codNota: existente.codNota },
          data: { nota: dados.nota, comentario: dados.comentario },
        });
      } else {
        await tx.notaCompetencia.create({
          data: {
            codTen: req.usuario.codTen,
            codAval: aval.codAval,
            codComp: dados.codComp,
            nota: dados.nota,
            comentario: dados.comentario,
          },
        });
      }

      // Primeira nota tira a avaliação de PENDENTE.
      if (aval.status === 'PENDENTE') {
        await tx.avaliacaoDesempenho.update({
          where: { codAval: aval.codAval },
          data: { status: 'EM_ANDAMENTO' },
        });
      }
      return { ok: true };
    });
  }

  @Patch('avaliacoes/:codAval')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async atualizarAvaliacao(@Req() req: ReqAut, @Param('codAval') codAval: string, @Body() corpo: unknown) {
    const dados = validar(esquemaAvaliacaoPatch, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const aval = await tx.avaliacaoDesempenho.findFirst({
        where: { codAval: BigInt(codAval) },
        include: { ciclo: { select: { competencias: { select: { codComp: true } } } } },
      });
      if (!aval) throw new NotFoundException('Avaliação inexistente neste tenant');

      const data: {
        comentarioGeral?: string;
        codUsuAvaliador?: bigint;
        status?: string;
        dhConclusao?: Date;
      } = {
        comentarioGeral: dados.comentarioGeral,
        codUsuAvaliador: dados.codUsuAvaliador,
      };

      if (dados.concluir) {
        if (aval.status === 'CONCLUIDA') return { ok: true, jaConcluida: true };
        // Só conclui com todas as competências do ciclo avaliadas.
        const comNota = await tx.notaCompetencia.count({ where: { codAval: aval.codAval } });
        if (!podeConcluir(aval.ciclo.competencias.length, comNota)) {
          throw new BadRequestException('Avalie todas as competências antes de concluir');
        }
        data.status = 'CONCLUIDA';
        data.dhConclusao = new Date();
      }

      await tx.avaliacaoDesempenho.update({ where: { codAval: aval.codAval }, data });
      return { ok: true };
    });
  }
}
