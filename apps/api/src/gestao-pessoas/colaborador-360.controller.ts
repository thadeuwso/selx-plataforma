import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { progressoDoPlano } from './pdi';
import { calcularAderencia } from './aderencia';
import { resumoMetas } from './metas';
import { resumoTreinamentos } from './treinamentos';
import { classificacaoDesempenho, distribuicaoPorFaixa } from './desempenho-360';
import { resolverAvaliacao } from './nota-avaliacao';
import { ROTULO_SITUACAO, situacaoAderenciaCargo } from './aderencia-cargo';

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
          participantes: { select: { peso: true, notas: { select: { codComp: true, nota: true } } } },
        },
      });

      // Ciclo anterior concluído (para a tendência) — o segundo mais recente.
      const [planos, feedbacks, metas, treinos, avaliacoesConcluidas] = await Promise.all([
        tx.planoDesenvolvimento.findMany({
          where: { codFun, status: 'ATIVO' },
          select: { acoes: { select: { status: true, progresso: true, prazo: true } } },
        }),
        tx.feedback.findMany({
          where: { codFun },
          select: { tipo: true, cienteFun: true },
        }),
        tx.meta.findMany({ where: { codFun }, select: { progresso: true, prazo: true, cancelada: true, peso: true } }),
        tx.matriculaTreinamento.findMany({ where: { codFun }, select: { status: true, dtVencimento: true, treinamento: { select: { cargaHoraria: true } } } }),
        tx.avaliacaoDesempenho.findMany({
          where: { codFun, status: 'CONCLUIDA' },
          orderBy: { codAval: 'desc' },
          take: 2,
          select: {
            ciclo: { select: { nome: true, competencias: { select: { codComp: true, peso: true } } } },
            notas: { select: { codComp: true, nota: true } },
            participantes: { select: { peso: true, notas: { select: { codComp: true, nota: true } } } },
          },
        }),
      ]);

      const notaAtual = avaliacao
        ? resolverAvaliacao(avaliacao.ciclo.competencias, avaliacao.notas, avaliacao.participantes).notaFinal
        : null;
      const notas2 = avaliacoesConcluidas.map(
        (a) => resolverAvaliacao(a.ciclo.competencias, a.notas, a.participantes).notaFinal,
      );
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
      const metasResumo = resumoMetas(
        metas.map((m) => ({ progresso: m.progresso, prazo: m.prazo, cancelada: m.cancelada === 'S', peso: m.peso })),
        hoje,
      );
      const treinosResumo = resumoTreinamentos(
        treinos.map((t) => ({ status: t.status, dtVencimento: t.dtVencimento, cargaHoraria: t.treinamento.cargaHoraria })),
        hoje,
      );

      // Auditoria de leitura (§33): quem abriu o painel de quem, e quando. O
      // painel expõe dados sensíveis de pessoas — ver deixa rastro.
      await tx.logAuditoria.create({
        data: { codTen: req.usuario.codTen, nomeTab: 'PAINEL360', codReg: codFun, operacao: 'VISUALIZACAO', origem: 'desempenho.360', codUsuAlt: req.usuario.codUsu },
      });

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
          metasTotal: metasResumo.total,
          metasConcluidas: metasResumo.concluidas,
          metasEmRisco: metasResumo.emRisco + metasResumo.atrasadas,
          metasProgresso: metasResumo.progressoPonderado,
          treinosPendentes: treinosResumo.pendentes + treinosResumo.emAndamento,
          treinosVencidos: treinosResumo.vencidos,
          treinosConcluidos: treinosResumo.concluidos,
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
      const partSel = { select: { peso: true, notas: { select: { codComp: true, nota: true } } } } as const;

      // Avaliação mais recente (qualquer status) — base de distribuição/destaques.
      const atual = await tx.avaliacaoDesempenho.findFirst({
        where: { codFun },
        orderBy: { codAval: 'desc' },
        select: {
          ciclo: { select: { competencias: { select: { codComp: true, nome: true, peso: true } } } },
          notas: { select: { codComp: true, nota: true } },
          participantes: partSel,
        },
      });

      // Evolução: avaliações concluídas em ordem cronológica.
      const concluidas = await tx.avaliacaoDesempenho.findMany({
        where: { codFun, status: 'CONCLUIDA' },
        orderBy: { codAval: 'asc' },
        select: {
          ciclo: { select: { nome: true, dtFim: true, competencias: { select: { codComp: true, peso: true } } } },
          notas: { select: { codComp: true, nota: true } },
          participantes: partSel,
        },
      });
      const evolucao = concluidas
        .map((a) => ({ ciclo: a.ciclo.nome, dtFim: a.ciclo.dtFim, nota: resolverAvaliacao(a.ciclo.competencias, a.notas, a.participantes).notaFinal }))
        .filter((e): e is { ciclo: string; dtFim: Date; nota: number } => e.nota !== null);

      const resolvidaAtual = atual
        ? resolverAvaliacao(atual.ciclo.competencias, atual.notas, atual.participantes)
        : null;
      const notaAtual = resolvidaAtual?.notaFinal ?? null;
      const notaAnterior = evolucao.length >= 2 ? evolucao[evolucao.length - 2].nota : null;
      const tendencia =
        notaAtual !== null && notaAnterior !== null ? Math.round((notaAtual - notaAnterior) * 10) / 10 : null;

      // Competências avaliadas da avaliação atual (nome + nota resolvida) → distribuição/destaques.
      const avaliadas = (atual?.ciclo.competencias ?? [])
        .map((c) => ({ competencia: c.nome, nota: resolvidaAtual?.porCompetencia.get(c.codComp.toString()) ?? null }))
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
            participantes: { select: { peso: true, notas: { select: { codComp: true, nota: true } } } },
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
      const ultimaNota = ultimaConcluida
        ? resolverAvaliacao(ultimaConcluida.ciclo.competencias, ultimaConcluida.notas, ultimaConcluida.participantes).notaFinal
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

  /**
   * Competências da avaliação atual com **comparação entre avaliadores**
   * (performance-360, Fase 5). Por competência: nota consolidada e a nota de
   * cada tipo de avaliador (auto/gestor/par/…), a média e a maior divergência —
   * com alertas neutros. Avaliação de avaliador único devolve uma coluna só.
   */
  @Get(':codFun/competencias')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async competencias(@Req() req: ReqAut, @Param('codFun') codFunParam: string) {
    const codFun = BigInt(codFunParam);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const aval = await tx.avaliacaoDesempenho.findFirst({
        where: { codFun },
        orderBy: { codAval: 'desc' },
        select: {
          ciclo: { select: { nome: true, competencias: { orderBy: [{ ordem: 'asc' }, { codComp: 'asc' }], select: { codComp: true, nome: true, descricao: true, peso: true } } } },
          notas: { select: { codComp: true, nota: true } },
          participantes: { select: { tipo: true, peso: true, notas: { select: { codComp: true, nota: true } } } },
        },
      });
      if (!aval) return { ciclo: null, modo: 'SIMPLES', tipos: [], competencias: [] };

      const resolvida = resolverAvaliacao(aval.ciclo.competencias, aval.notas, aval.participantes);
      const tipos = aval.participantes.map((p) => p.tipo);

      const competencias = aval.ciclo.competencias.map((c) => {
        const chave = c.codComp.toString();
        // Nota por tipo de avaliador (comparação); vazio no modo simples.
        const porTipo = aval.participantes
          .map((p) => ({ tipo: p.tipo, nota: p.notas.find((n) => n.codComp.toString() === chave)?.nota ?? null }))
          .filter((x): x is { tipo: string; nota: number } => x.nota !== null);
        const notas = porTipo.map((x) => x.nota);
        const dispersao = notas.length >= 2 ? Math.round((Math.max(...notas) - Math.min(...notas)) * 10) / 10 : null;
        // Alerta neutro (nunca "percepção errada").
        let alerta: string | null = null;
        if (resolvida.modo === '360') {
          if (porTipo.length === 0) alerta = 'Sem avaliações ainda';
          else if (porTipo.length === 1) alerta = 'Um avaliador só';
          else if (dispersao !== null && dispersao >= 2) alerta = 'Percepções divergentes';
          else if (dispersao !== null && dispersao >= 1) alerta = 'Diferença moderada';
          else alerta = 'Percepções alinhadas';
        }
        return {
          codComp: c.codComp,
          nome: c.nome,
          descricao: c.descricao,
          peso: c.peso,
          notaConsolidada: resolvida.porCompetencia.get(chave) ?? null,
          porTipo,
          dispersao,
          alerta,
        };
      });

      return { ciclo: aval.ciclo.nome, modo: resolvida.modo, tipos, competencias };
    });
  }

  /**
   * Aderência ao cargo (role-fit, RN-GP-026): compara, por nome de competência,
   * a nota atual da pessoa com o nível esperado do cargo. Estar acima do
   * esperado é neutro.
   */
  @Get(':codFun/aderencia-cargo')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async aderenciaCargo(@Req() req: ReqAut, @Param('codFun') codFunParam: string) {
    const codFun = BigInt(codFunParam);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const func = await tx.funcionario.findFirst({
        where: { codFun, ativo: 'S' },
        select: { codCar: true, cargo: { select: { nomeCar: true } } },
      });
      if (!func) throw new BadRequestException('Colaborador inexistente neste tenant');
      if (!func.codCar) return { cargo: null, competencias: [] };

      const [esperadas, aval] = await Promise.all([
        tx.competenciaCargo.findMany({
          where: { codCar: func.codCar, ativo: 'S' },
          orderBy: [{ ordem: 'asc' }, { codCarComp: 'asc' }],
          select: { nome: true, descricao: true, nivelEsperado: true, criticidade: true },
        }),
        tx.avaliacaoDesempenho.findFirst({
          where: { codFun },
          orderBy: { codAval: 'desc' },
          select: {
            ciclo: { select: { competencias: { select: { codComp: true, nome: true, peso: true } } } },
            notas: { select: { codComp: true, nota: true } },
            participantes: { select: { peso: true, notas: { select: { codComp: true, nota: true } } } },
          },
        }),
      ]);

      // Nota atual por NOME de competência (case-insensitive).
      const atualPorNome = new Map<string, number>();
      if (aval) {
        const resolvida = resolverAvaliacao(aval.ciclo.competencias, aval.notas, aval.participantes);
        for (const c of aval.ciclo.competencias) {
          const nota = resolvida.porCompetencia.get(c.codComp.toString());
          if (nota != null) atualPorNome.set(c.nome.trim().toLowerCase(), nota);
        }
      }

      return {
        cargo: func.cargo?.nomeCar ?? null,
        competencias: esperadas.map((e) => {
          const atual = atualPorNome.get(e.nome.trim().toLowerCase()) ?? null;
          const r = situacaoAderenciaCargo(atual, e.nivelEsperado);
          return {
            nome: e.nome,
            descricao: e.descricao,
            criticidade: e.criticidade,
            esperado: e.nivelEsperado,
            atual,
            distancia: r.distancia,
            situacao: r.situacao,
            situacaoRotulo: ROTULO_SITUACAO[r.situacao],
          };
        }),
      };
    });
  }

  /**
   * Detalhe de uma competência da avaliação atual (para a gaveta, Fase 5b):
   * definição, nota consolidada, notas por avaliador (com comentário), esperado
   * do cargo e as ações de desenvolvimento relacionadas (por nome).
   */
  @Get(':codFun/competencias/:codComp')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async detalheCompetencia(@Req() req: ReqAut, @Param('codFun') codFunParam: string, @Param('codComp') codCompParam: string) {
    const codFun = BigInt(codFunParam);
    const codComp = BigInt(codCompParam);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const aval = await tx.avaliacaoDesempenho.findFirst({
        where: { codFun, ciclo: { competencias: { some: { codComp } } } },
        orderBy: { codAval: 'desc' },
        select: {
          codFun: true,
          funcionario: { select: { codCar: true } },
          ciclo: { select: { competencias: { where: { codComp }, select: { codComp: true, nome: true, descricao: true, peso: true } } } },
          notas: { select: { codComp: true, nota: true } },
          participantes: { select: { tipo: true, peso: true, notas: { select: { codComp: true, nota: true, comentario: true } } } },
        },
      });
      if (!aval || aval.ciclo.competencias.length === 0) throw new NotFoundException('Competência inexistente nesta avaliação');
      const comp = aval.ciclo.competencias[0];

      const resolvida = resolverAvaliacao(
        [{ codComp: comp.codComp, peso: comp.peso }],
        aval.notas.filter((n) => n.codComp === codComp),
        aval.participantes.map((p) => ({ peso: p.peso, notas: p.notas.filter((n) => n.codComp === codComp) })),
      );

      const porAvaliador = aval.participantes
        .map((p) => {
          const n = p.notas.find((x) => x.codComp === codComp);
          return n ? { tipo: p.tipo, nota: n.nota, comentario: n.comentario } : null;
        })
        .filter((x): x is { tipo: string; nota: number; comentario: string | null } => x !== null);

      // Esperado do cargo por nome.
      let esperado: { nivel: number; situacaoRotulo: string } | null = null;
      if (aval.funcionario.codCar) {
        const ec = await tx.competenciaCargo.findFirst({
          where: { codCar: aval.funcionario.codCar, ativo: 'S', nome: { equals: comp.nome, mode: 'insensitive' } },
          select: { nivelEsperado: true },
        });
        if (ec) {
          const r = situacaoAderenciaCargo(resolvida.notaFinal, ec.nivelEsperado);
          esperado = { nivel: ec.nivelEsperado, situacaoRotulo: ROTULO_SITUACAO[r.situacao] };
        }
      }

      // Ações de desenvolvimento relacionadas por nome de competência.
      const acoes = await tx.acaoDesenvolvimento.findMany({
        where: { plano: { codFun }, competencia: { equals: comp.nome, mode: 'insensitive' } },
        orderBy: { codAcao: 'desc' },
        take: 10,
        select: { descricao: true, tipo: true, status: true },
      });

      return {
        nome: comp.nome,
        descricao: comp.descricao,
        peso: comp.peso,
        notaConsolidada: resolvida.notaFinal,
        porAvaliador,
        esperado,
        acoesRelacionadas: acoes,
      };
    });
  }

  /**
   * Trilha de auditoria do painel (RN-GP-034): quem viu, gerou IA ou exportou os
   * dados deste colaborador, e quando. Só leitura — o auditor acompanha, não altera.
   */
  @Get(':codFun/auditoria')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async auditoria(@Req() req: ReqAut, @Param('codFun') codFunParam: string) {
    const codFun = BigInt(codFunParam);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const logs = await tx.logAuditoria.findMany({
        where: { nomeTab: 'PAINEL360', codReg: codFun },
        orderBy: { codAud: 'desc' },
        take: 100,
        select: { codAud: true, operacao: true, origem: true, dadosNovos: true, dhAlt: true, codUsuAlt: true },
      });
      // Nomes dos usuários numa consulta só (LogAuditoria não tem relação com Usuario).
      const codUsus = [...new Set(logs.map((l) => l.codUsuAlt).filter((c): c is bigint => c != null))];
      const usuarios = codUsus.length
        ? await tx.usuario.findMany({ where: { codUsu: { in: codUsus } }, select: { codUsu: true, nomeUsu: true } })
        : [];
      const nome = new Map(usuarios.map((u) => [u.codUsu.toString(), u.nomeUsu]));
      return logs.map((l) => ({
        codAud: l.codAud,
        operacao: l.operacao,
        origem: l.origem,
        detalhe: l.dadosNovos,
        dhAlt: l.dhAlt,
        usuario: l.codUsuAlt ? nome.get(l.codUsuAlt.toString()) ?? '—' : 'sistema',
      }));
    });
  }
}
