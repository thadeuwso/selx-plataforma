import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { notaFinal } from './avaliacao-desempenho';
import { progressoDoPlano } from './pdi';
import { calcularAderencia } from './aderencia';
import { classificacaoDesempenho, distribuicaoPorFaixa } from './desempenho-360';

type ReqAut = Request & { usuario: UsuarioAutenticado };

const esquemaProxima = z.object({
  acao: z.string().min(2).max(400),
  prioridade: z.enum(['ALTA', 'MEDIA', 'BAIXA']).default('MEDIA'),
  prazo: z.coerce.date().optional(),
  origem: z.enum(['MANUAL', 'ADERENCIA', 'AVALIACAO', 'IA']).default('MANUAL'),
  justificativa: z.string().max(2000).optional(),
  codUsuResp: z.coerce.bigint().optional(),
});
const esquemaProximaPatch = z.object({ status: z.enum(['CONCLUIDA', 'DESCARTADA']) });

function validar<T extends z.ZodTypeAny>(esquema: T, corpo: unknown): z.infer<T> {
  try {
    return esquema.parse(corpo);
  } catch (erro) {
    if (erro instanceof ZodError) throw new BadRequestException({ mensagem: 'Dados inválidos', detalhes: erro.issues });
    throw erro;
  }
}

/**
 * Painel 360 do Colaborador (performance-360, Fase 3 — estrutura base).
 *
 * Agregador ENXUTO do topo do painel: cabeçalho do colaborador, ciclo atual,
 * nota da avaliação, contadores de PDI/feedback e aderência. Só compõe dados
 * que JÁ existem — nenhuma entidade nova nesta fase. As abas pesadas carregam
 * sob demanda pelos endpoints de domínio (fases seguintes).
 *
 * Consultas em paralelo (Promise.all) para não empilhar latência.
 */
@Controller('gestao-pessoas/colaboradores')
export class Colaborador360Controller {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':codFun/360')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async painel360(
    @Req() req: ReqAut,
    @Param('codFun') codFunParam: string,
    @Query('cicloId') cicloIdParam?: string,
  ) {
    const codFun = BigInt(codFunParam);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const funcionario = await tx.funcionario.findFirst({
        where: { codFun, ativo: 'S' },
        select: {
          codFun: true,
          nomeFun: true,
          numCad: true,
          dtAdm: true,
          situacao: true,
          empresa: { select: { nomeFantasia: true } },
          cargo: { select: { nomeCar: true } },
          departamento: { select: { codDep: true, descrDep: true } },
        },
      });
      if (!funcionario) throw new BadRequestException('Colaborador inexistente neste tenant');

      // Avaliação de desempenho a exibir: do ciclo pedido, senão a mais recente.
      const avaliacao = await tx.avaliacaoDesempenho.findFirst({
        where: { codFun, ...(cicloIdParam ? { codCiclo: BigInt(cicloIdParam) } : {}) },
        orderBy: { codAval: 'desc' },
        select: {
          codAval: true,
          status: true,
          dhConclusao: true,
          avaliador: { select: { nomeUsu: true } },
          ciclo: {
            select: {
              codCiclo: true,
              nome: true,
              dtInicio: true,
              dtFim: true,
              status: true,
              competencias: { select: { codComp: true, peso: true } },
            },
          },
          notas: { select: { codComp: true, nota: true } },
        },
      });

      // Ciclo anterior concluído (para a tendência) — o segundo mais recente.
      const [planos, feedbacks, avaliacoesConcluidas] = await Promise.all([
        tx.planoDesenvolvimento.findMany({
          where: { codFun, status: 'ATIVO' },
          select: { acoes: { select: { status: true, progresso: true, prazo: true } } },
        }),
        tx.feedback.findMany({
          where: { codFun },
          select: { tipo: true, cienteFun: true },
        }),
        tx.avaliacaoDesempenho.findMany({
          where: { codFun, status: 'CONCLUIDA' },
          orderBy: { codAval: 'desc' },
          take: 2,
          select: {
            ciclo: { select: { nome: true, competencias: { select: { codComp: true, peso: true } } } },
            notas: { select: { codComp: true, nota: true } },
          },
        }),
      ]);

      const notaDe = (
        comps: { codComp: bigint; peso: number }[],
        notas: { codComp: bigint; nota: number }[],
      ) => {
        const pesos = new Map(comps.map((c) => [c.codComp.toString(), c.peso]));
        return notaFinal(notas.map((n) => ({ nota: n.nota, peso: pesos.get(n.codComp.toString()) ?? 1 })));
      };

      const notaAtual = avaliacao ? notaDe(avaliacao.ciclo.competencias, avaliacao.notas) : null;
      const notas2 = avaliacoesConcluidas.map((a) => notaDe(a.ciclo.competencias, a.notas));
      const notaAnterior = notas2.length >= 2 ? notas2[1] : null;
      const tendencia =
        notaAtual !== null && notaAnterior !== null
          ? Math.round((notaAtual - notaAnterior) * 10) / 10
          : null;

      // Sinais de aderência (reusa a regra pura; sinais coletados aqui).
      const hoje = new Date();
      const progressos = planos.map((p) => progressoDoPlano(p.acoes));
      const progressoMedio =
        progressos.length === 0
          ? null
          : Math.round(progressos.reduce((s, n) => s + n, 0) / progressos.length);
      const acoesAtrasadas = planos.reduce(
        (soma, p) =>
          soma +
          p.acoes.filter((a) => a.prazo && a.prazo < hoje && a.status !== 'CONCLUIDA' && a.status !== 'CANCELADA')
            .length,
        0,
      );
      const feedbacksSemCiencia = feedbacks.filter(
        (f) => f.tipo === 'CONSTRUTIVO' && f.cienteFun !== 'S',
      ).length;
      const aderencia = calcularAderencia({
        planosAtivos: planos.length,
        progressoMedio,
        acoesAtrasadas,
        feedbacksConstrutivosSemCiencia: feedbacksSemCiencia,
        ultimaNotaDesempenho: notas2[0] ?? null,
      });

      const acoesPendentes = planos.reduce(
        (s, p) => s + p.acoes.filter((a) => a.status !== 'CONCLUIDA' && a.status !== 'CANCELADA').length,
        0,
      );

      return {
        colaborador: {
          codFun: funcionario.codFun,
          nome: funcionario.nomeFun,
          numCad: funcionario.numCad,
          cargo: funcionario.cargo?.nomeCar ?? null,
          departamento: funcionario.departamento?.descrDep ?? null,
          empresa: funcionario.empresa?.nomeFantasia ?? null,
          dtAdm: funcionario.dtAdm,
          situacao: funcionario.situacao,
        },
        avaliacao: avaliacao
          ? {
              codAval: avaliacao.codAval,
              status: avaliacao.status,
              dhConclusao: avaliacao.dhConclusao,
              avaliador: avaliacao.avaliador?.nomeUsu ?? null,
              notaAtual,
              notaAnterior,
              tendencia,
              competenciasComNota: avaliacao.notas.length,
              totalCompetencias: avaliacao.ciclo.competencias.length,
              ciclo: {
                codCiclo: avaliacao.ciclo.codCiclo,
                nome: avaliacao.ciclo.nome,
                dtInicio: avaliacao.ciclo.dtInicio,
                dtFim: avaliacao.ciclo.dtFim,
                status: avaliacao.ciclo.status,
              },
            }
          : null,
        resumo: {
          planosAtivos: planos.length,
          acoesPendentes,
          feedbacks: feedbacks.length,
          feedbacksSemCiencia,
        },
        aderencia,
      };
    });
  }

  /**
   * Desempenho detalhado do colaborador: classificação, evolução histórica,
   * distribuição por faixa e destaques / pontos de atenção — tudo derivado das
   * avaliações. Alimenta os gráficos da Visão 360 (Fase 4).
   */
  @Get(':codFun/desempenho')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async desempenho(@Req() req: ReqAut, @Param('codFun') codFunParam: string) {
    const codFun = BigInt(codFunParam);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const notaDe = (
        comps: { codComp: bigint; peso: number }[],
        notas: { codComp: bigint; nota: number }[],
      ) => {
        const pesos = new Map(comps.map((c) => [c.codComp.toString(), c.peso]));
        return notaFinal(notas.map((n) => ({ nota: n.nota, peso: pesos.get(n.codComp.toString()) ?? 1 })));
      };

      // Avaliação mais recente (qualquer status) — base de distribuição/destaques.
      const atual = await tx.avaliacaoDesempenho.findFirst({
        where: { codFun },
        orderBy: { codAval: 'desc' },
        select: {
          ciclo: { select: { competencias: { select: { codComp: true, nome: true, peso: true } } } },
          notas: { select: { codComp: true, nota: true } },
        },
      });

      // Evolução: avaliações concluídas em ordem cronológica.
      const concluidas = await tx.avaliacaoDesempenho.findMany({
        where: { codFun, status: 'CONCLUIDA' },
        orderBy: { codAval: 'asc' },
        select: {
          ciclo: { select: { nome: true, dtFim: true, competencias: { select: { codComp: true, peso: true } } } },
          notas: { select: { codComp: true, nota: true } },
        },
      });
      const evolucao = concluidas
        .map((a) => ({ ciclo: a.ciclo.nome, dtFim: a.ciclo.dtFim, nota: notaDe(a.ciclo.competencias, a.notas) }))
        .filter((e) => e.nota !== null);

      const notaAtual = atual ? notaDe(atual.ciclo.competencias, atual.notas) : null;
      const notaAnterior = evolucao.length >= 2 ? evolucao[evolucao.length - 2].nota : null;
      const tendencia =
        notaAtual !== null && notaAnterior !== null ? Math.round((notaAtual - notaAnterior) * 10) / 10 : null;

      // Competências avaliadas da avaliação atual (nome + nota) → distribuição/destaques.
      const notaPorComp = new Map((atual?.notas ?? []).map((n) => [n.codComp.toString(), n.nota]));
      const avaliadas = (atual?.ciclo.competencias ?? [])
        .map((c) => ({ competencia: c.nome, nota: notaPorComp.get(c.codComp.toString()) ?? null }))
        .filter((c): c is { competencia: string; nota: number } => c.nota !== null);

      const ordenadas = [...avaliadas].sort((a, b) => b.nota - a.nota);
      const destaques = ordenadas.slice(0, 3);
      const atencao = [...ordenadas].reverse().slice(0, 3);

      return {
        classificacao: classificacaoDesempenho(notaAtual),
        notaAtual,
        notaAnterior,
        tendencia,
        totalCriterios: atual?.ciclo.competencias.length ?? 0,
        criteriosAvaliados: avaliadas.length,
        evolucao,
        distribuicao: distribuicaoPorFaixa(avaliadas.map((c) => c.nota)),
        destaques,
        atencao,
      };
    });
  }

  /**
   * Próximos passos do gestor (RN-GP-024): ações abertas + **sugestões**
   * derivadas da aderência (recomendação vira tarefa). As sugestões não são
   * persistidas — viram `ProximaAcao` só quando o gestor as adota.
   */
  @Get(':codFun/proximos-passos')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async listarProximos(@Req() req: ReqAut, @Param('codFun') codFunParam: string) {
    const codFun = BigInt(codFunParam);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const [acoes, planos, feedbacks, ultimaConcluida] = await Promise.all([
        tx.proximaAcao.findMany({
          where: { codFun, status: 'ABERTA' },
          orderBy: [{ prioridade: 'asc' }, { codProx: 'desc' }],
          include: { responsavel: { select: { nomeUsu: true } } },
        }),
        tx.planoDesenvolvimento.findMany({
          where: { codFun, status: 'ATIVO' },
          select: { acoes: { select: { status: true, progresso: true, prazo: true } } },
        }),
        tx.feedback.findMany({ where: { codFun }, select: { tipo: true, cienteFun: true } }),
        tx.avaliacaoDesempenho.findFirst({
          where: { codFun, status: 'CONCLUIDA' },
          orderBy: { codAval: 'desc' },
          select: {
            ciclo: { select: { competencias: { select: { codComp: true, peso: true } } } },
            notas: { select: { codComp: true, nota: true } },
          },
        }),
      ]);

      const hoje = new Date();
      const progressos = planos.map((p) => progressoDoPlano(p.acoes));
      const progressoMedio = progressos.length === 0 ? null : Math.round(progressos.reduce((s, n) => s + n, 0) / progressos.length);
      const acoesAtrasadas = planos.reduce(
        (s, p) => s + p.acoes.filter((a) => a.prazo && a.prazo < hoje && a.status !== 'CONCLUIDA' && a.status !== 'CANCELADA').length,
        0,
      );
      const pesos = new Map((ultimaConcluida?.ciclo.competencias ?? []).map((c) => [c.codComp.toString(), c.peso]));
      const ultimaNota = ultimaConcluida
        ? notaFinal(ultimaConcluida.notas.map((n) => ({ nota: n.nota, peso: pesos.get(n.codComp.toString()) ?? 1 })))
        : null;
      const aderencia = calcularAderencia({
        planosAtivos: planos.length,
        progressoMedio,
        acoesAtrasadas,
        feedbacksConstrutivosSemCiencia: feedbacks.filter((f) => f.tipo === 'CONSTRUTIVO' && f.cienteFun !== 'S').length,
        ultimaNotaDesempenho: ultimaNota,
      });

      // Recomendação vira sugestão de tarefa; some quando já existe ação aberta igual.
      const jaAbertas = new Set(acoes.map((a) => a.acao.trim().toLowerCase()));
      const sugestoes = aderencia.recomendacoes
        .filter((r) => !jaAbertas.has(r.trim().toLowerCase()))
        .map((r) => ({
          acao: r,
          origem: 'ADERENCIA' as const,
          prioridade: aderencia.nivel === 'RISCO' ? ('ALTA' as const) : ('MEDIA' as const),
          justificativa: `Sugerido pela aderência (${aderencia.score}/100, ${aderencia.nivel.toLowerCase()}).`,
        }));

      return { acoes, sugestoes };
    });
  }

  @Post(':codFun/proximos-passos')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async criarProxima(@Req() req: ReqAut, @Param('codFun') codFunParam: string, @Body() corpo: unknown) {
    const codFun = BigInt(codFunParam);
    const dados = validar(esquemaProxima, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const func = await tx.funcionario.findFirst({ where: { codFun, ativo: 'S' } });
      if (!func) throw new BadRequestException('Colaborador inexistente neste tenant');
      return tx.proximaAcao.create({
        data: {
          codTen: req.usuario.codTen,
          codFun,
          acao: dados.acao,
          prioridade: dados.prioridade,
          prazo: dados.prazo,
          origem: dados.origem,
          justificativa: dados.justificativa,
          codUsuResp: dados.codUsuResp,
          codUsuInc: req.usuario.codUsu,
        },
      });
    });
  }

  @Patch('proximos-passos/:codProx')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async mudarProxima(@Req() req: ReqAut, @Param('codProx') codProx: string, @Body() corpo: unknown) {
    const dados = validar(esquemaProximaPatch, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const acao = await tx.proximaAcao.findFirst({ where: { codProx: BigInt(codProx) } });
      if (!acao) throw new NotFoundException('Ação inexistente neste tenant');
      await tx.proximaAcao.update({
        where: { codProx: acao.codProx },
        data: { status: dados.status, dhConclusao: dados.status === 'CONCLUIDA' ? new Date() : null },
      });
      return { ok: true };
    });
  }
}
