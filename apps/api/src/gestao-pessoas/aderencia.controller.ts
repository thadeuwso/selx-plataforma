import { BadRequestException, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { progressoDoPlano } from './pdi';
import { notaFinal } from './avaliacao-desempenho';
import { calcularAderencia, ResultadoAderencia, SinaisAderencia } from './aderencia';

type ReqAut = Request & { usuario: UsuarioAutenticado };

// Tipo mínimo do cliente transacional que basta a este controller.
type Tx = Parameters<Parameters<PrismaService['executarNoTenant']>[1]>[0];

interface SinaisFun {
  codFun: bigint;
  nomeFun: string;
  numCad: bigint | null;
  sinais: SinaisAderencia;
  /** Competências fracas (nota ≤ 2) do último ciclo concluído — semente do plano. */
  lacunas: string[];
  ultimoCiclo: string | null;
}

/**
 * Coleta os sinais de aderência de vários funcionários em POUCAS consultas
 * (sem N+1): planos+ações, feedbacks e última avaliação em lote, rolando o
 * agregado em memória. `filtro` restringe a um funcionário.
 */
async function montarSinais(tx: Tx, filtro?: bigint): Promise<SinaisFun[]> {
  const funcionarios = await tx.funcionario.findMany({
    where: { ativo: 'S', ...(filtro ? { codFun: filtro } : {}) },
    select: { codFun: true, nomeFun: true, numCad: true },
  });
  if (funcionarios.length === 0) return [];
  const codFuns = funcionarios.map((f) => f.codFun);
  const hoje = new Date();

  const planos = await tx.planoDesenvolvimento.findMany({
    where: { codFun: { in: codFuns }, status: 'ATIVO' },
    select: { codFun: true, acoes: { select: { status: true, progresso: true, prazo: true } } },
  });

  const feedbacks = await tx.feedback.groupBy({
    by: ['codFun'],
    where: { codFun: { in: codFuns }, tipo: 'CONSTRUTIVO', NOT: { cienteFun: 'S' } },
    _count: { _all: true },
  });
  const feedPorFun = new Map(feedbacks.map((f) => [f.codFun.toString(), f._count._all]));

  const avaliacoes = await tx.avaliacaoDesempenho.findMany({
    where: { codFun: { in: codFuns }, status: 'CONCLUIDA' },
    orderBy: { codAval: 'desc' },
    select: {
      codFun: true,
      notas: { select: { codComp: true, nota: true } },
      ciclo: { select: { nome: true, competencias: { select: { codComp: true, nome: true, peso: true } } } },
    },
  });
  // A primeira de cada funcionário é a mais recente (orderBy desc).
  const ultimaAvalPorFun = new Map<string, (typeof avaliacoes)[number]>();
  for (const a of avaliacoes) {
    if (!ultimaAvalPorFun.has(a.codFun.toString())) ultimaAvalPorFun.set(a.codFun.toString(), a);
  }

  return funcionarios.map((f) => {
    const chave = f.codFun.toString();
    const planosFun = planos.filter((p) => p.codFun === f.codFun);
    const progressos = planosFun.map((p) => progressoDoPlano(p.acoes));
    const progressoMedio =
      progressos.length === 0 ? null : Math.round(progressos.reduce((s, n) => s + n, 0) / progressos.length);
    const acoesAtrasadas = planosFun.reduce(
      (soma, p) =>
        soma +
        p.acoes.filter((a) => a.prazo && a.prazo < hoje && a.status !== 'CONCLUIDA' && a.status !== 'CANCELADA').length,
      0,
    );

    const aval = ultimaAvalPorFun.get(chave);
    let ultimaNotaDesempenho: number | null = null;
    let lacunas: string[] = [];
    let ultimoCiclo: string | null = null;
    if (aval) {
      const pesos = new Map(aval.ciclo.competencias.map((c) => [c.codComp.toString(), c.peso]));
      const nomes = new Map(aval.ciclo.competencias.map((c) => [c.codComp.toString(), c.nome]));
      ultimaNotaDesempenho = notaFinal(
        aval.notas.map((n) => ({ nota: n.nota, peso: pesos.get(n.codComp.toString()) ?? 1 })),
      );
      lacunas = aval.notas
        .filter((n) => n.nota <= 2)
        .map((n) => nomes.get(n.codComp.toString()) ?? '')
        .filter(Boolean);
      ultimoCiclo = aval.ciclo.nome;
    }

    return {
      codFun: f.codFun,
      nomeFun: f.nomeFun,
      numCad: f.numCad,
      sinais: {
        planosAtivos: planosFun.length,
        progressoMedio,
        acoesAtrasadas,
        feedbacksConstrutivosSemCiencia: feedPorFun.get(chave) ?? 0,
        ultimaNotaDesempenho,
      },
      lacunas,
      ultimoCiclo,
    };
  });
}

/**
 * Aderência ao desenvolvimento (RN-GP-023).
 *
 * Fecha o ciclo da fase 2: mede engajamento/progresso a partir dos sinais que já
 * existem (PDI, feedback, desempenho) e **realimenta novos planos** — o botão
 * que semeia um plano a partir das lacunas do último ciclo.
 */
@Controller('gestao-pessoas/aderencia')
export class AderenciaController {
  constructor(private readonly prisma: PrismaService) {}

  /** Painel: aderência de todos os funcionários ativos, do menor score ao maior. */
  @Get()
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async painel(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const todos = await montarSinais(tx);
      return todos
        .map((f) => ({
          codFun: f.codFun,
          nomeFun: f.nomeFun,
          numCad: f.numCad,
          ...calcularAderencia(f.sinais),
        }))
        .sort((a, b) => a.score - b.score); // quem precisa de atenção primeiro
    });
  }

  /** Detalhe de um funcionário: sinais, score, motivos, recomendações e lacunas. */
  @Get('detalhe')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async detalhe(@Req() req: ReqAut, @Query('codFun') codFun?: string) {
    if (!codFun) throw new BadRequestException('Informe o funcionário (codFun)');
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const [f] = await montarSinais(tx, BigInt(codFun));
      if (!f) throw new BadRequestException('Funcionário inexistente neste tenant');
      const resultado: ResultadoAderencia = calcularAderencia(f.sinais);
      return {
        codFun: f.codFun,
        nomeFun: f.nomeFun,
        sinais: f.sinais,
        lacunas: f.lacunas,
        ultimoCiclo: f.ultimoCiclo,
        ...resultado,
      };
    });
  }

  /**
   * Realimentação: cria um plano de desenvolvimento semeado pelas lacunas do
   * último ciclo (competências fracas viram ações). É o elo que traz o
   * desempenho de volta para o desenvolvimento.
   */
  @Post(':codFun/plano')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async gerarPlano(@Req() req: ReqAut, @Param('codFun') codFun: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const [f] = await montarSinais(tx, BigInt(codFun));
      if (!f) throw new BadRequestException('Funcionário inexistente neste tenant');
      const resultado = calcularAderencia(f.sinais);

      const titulo = f.ultimoCiclo
        ? `Plano a partir de "${f.ultimoCiclo}"`
        : 'Plano de desenvolvimento';
      const plano = await tx.planoDesenvolvimento.create({
        data: {
          codTen: req.usuario.codTen,
          codFun: f.codFun,
          titulo,
          objetivo: resultado.recomendacoes.join(' · ') || null,
          codUsuInc: req.usuario.codUsu,
        },
      });

      // Uma ação por competência fraca do último ciclo. Sem lacunas, o plano
      // nasce vazio de propósito — o gestor preenche a partir das recomendações.
      let ordem = 0;
      for (const comp of f.lacunas) {
        await tx.acaoDesenvolvimento.create({
          data: {
            codTen: req.usuario.codTen,
            codPdi: plano.codPdi,
            descricao: `Desenvolver: ${comp}`,
            tipo: 'TREINAMENTO',
            competencia: comp,
            ordem: ordem++,
          },
        });
      }

      return { codPdi: plano.codPdi, acoesCriadas: f.lacunas.length };
    });
  }
}
