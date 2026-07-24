import { BadRequestException, Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { resolverAvaliacao } from './nota-avaliacao';
import { calcularAderencia } from './aderencia';
import { resumoMetas } from './metas';
import { resumoTreinamentos } from './treinamentos';
import { progressoDoPlano } from './pdi';
import { avaliarRiscos, SinaisRisco } from './riscos';

type ReqAut = Request & { usuario: UsuarioAutenticado };
type Tx = Parameters<Parameters<PrismaService['executarNoTenant']>[1]>[0];

const esquemaAcao = z.object({ status: z.enum(['EM_REVISAO', 'DESCARTADO', 'RESOLVIDO', 'ABERTO']), motivo: z.string().max(2000).optional() });

function validar<T extends z.ZodTypeAny>(esquema: T, corpo: unknown): z.infer<T> {
  try {
    return esquema.parse(corpo);
  } catch (erro) {
    if (erro instanceof ZodError) throw new BadRequestException({ mensagem: 'Dados inválidos', detalhes: erro.issues });
    throw erro;
  }
}

/**
 * Riscos e alertas (RN-GP-033). Alertas DERIVADOS por regras transparentes; o
 * que se persiste é a decisão humana (revisar/descartar/resolver) por chave.
 */
@Controller('gestao-pessoas/colaboradores/:codFun/riscos')
export class RiscosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async listar(@Req() req: ReqAut, @Param('codFun') codFunParam: string) {
    const codFun = BigInt(codFunParam);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const sinais = await this.coletarSinais(tx, codFun);
      const alertas = avaliarRiscos(sinais);
      const estados = await tx.alerta.findMany({ where: { codFun }, select: { chave: true, status: true, motivo: true } });
      const porChave = new Map(estados.map((e) => [e.chave, e]));

      const itens = alertas
        .map((a) => {
          const e = porChave.get(a.chave);
          return { ...a, status: e?.status ?? 'ABERTO', motivo: e?.motivo ?? null };
        })
        .filter((a) => a.status !== 'DESCARTADO' && a.status !== 'RESOLVIDO');

      const ordem = { ALTO: 0, MEDIO: 1, BAIXO: 2 } as const;
      itens.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
      return { total: itens.length, altos: itens.filter((a) => a.nivel === 'ALTO').length, itens };
    });
  }

  /** Revisar, descartar ou resolver um alerta (por chave da regra). */
  @Patch(':chave')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async agir(@Req() req: ReqAut, @Param('codFun') codFunParam: string, @Param('chave') chave: string, @Body() corpo: unknown) {
    const codFun = BigInt(codFunParam);
    const dados = validar(esquemaAcao, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const func = await tx.funcionario.findFirst({ where: { codFun, ativo: 'S' } });
      if (!func) throw new BadRequestException('Colaborador inexistente neste tenant');
      await tx.alerta.upsert({
        where: { codTen_codFun_chave: { codTen: req.usuario.codTen, codFun, chave } },
        create: { codTen: req.usuario.codTen, codFun, chave, status: dados.status, motivo: dados.motivo, codUsuResp: req.usuario.codUsu },
        update: { status: dados.status, motivo: dados.motivo, codUsuResp: req.usuario.codUsu },
      });
      return { ok: true };
    });
  }

  /** Coleta os sinais determinísticos que as regras leem. */
  private async coletarSinais(tx: Tx, codFun: bigint): Promise<SinaisRisco> {
    const func = await tx.funcionario.findFirst({ where: { codFun, ativo: 'S' }, select: { codFun: true } });
    if (!func) throw new BadRequestException('Colaborador inexistente neste tenant');
    const hoje = new Date();

    const partSel = { select: { tipo: true, peso: true, notas: { select: { codComp: true, nota: true } } } } as const;
    const atual = await tx.avaliacaoDesempenho.findFirst({
      where: { codFun },
      orderBy: { codAval: 'desc' },
      select: {
        status: true,
        ciclo: { select: { status: true, dtFim: true, competencias: { select: { codComp: true, peso: true } } } },
        notas: { select: { codComp: true, nota: true } },
        participantes: partSel,
      },
    });
    const concluidas = await tx.avaliacaoDesempenho.findMany({
      where: { codFun, status: 'CONCLUIDA' },
      orderBy: { codAval: 'desc' },
      take: 2,
      select: { ciclo: { select: { competencias: { select: { codComp: true, peso: true } } } }, notas: { select: { codComp: true, nota: true } }, participantes: partSel },
    });

    const [planos, feedbacks, metas, treinos, catalogoObrig] = await Promise.all([
      tx.planoDesenvolvimento.findMany({ where: { codFun, status: 'ATIVO' }, select: { acoes: { select: { status: true, progresso: true, prazo: true } } } }),
      tx.feedback.findMany({ where: { codFun }, orderBy: { codFeed: 'desc' }, select: { tipo: true, cienteFun: true, dhInc: true } }),
      tx.meta.findMany({ where: { codFun }, select: { progresso: true, prazo: true, cancelada: true, peso: true } }),
      tx.matriculaTreinamento.findMany({ where: { codFun }, select: { status: true, dtVencimento: true, codTreino: true, treinamento: { select: { cargaHoraria: true } } } }),
      tx.treinamento.findMany({ where: { ativo: 'S', obrigatorio: 'S' }, select: { codTreino: true } }),
    ]);

    const resolvidaAtual = atual ? resolverAvaliacao(atual.ciclo.competencias, atual.notas, atual.participantes.map((p) => ({ peso: p.peso, notas: p.notas }))) : null;
    const notaAtual = resolvidaAtual?.notaFinal ?? null;
    const notasConcl = concluidas.map((a) => resolverAvaliacao(a.ciclo.competencias, a.notas, a.participantes.map((p) => ({ peso: p.peso, notas: p.notas }))).notaFinal).filter((n): n is number => n !== null);
    const tendenciaNota = notaAtual !== null && notasConcl.length >= 2 ? Math.round((notaAtual - notasConcl[1]) * 10) / 10 : null;

    // Divergência entre avaliadores: alguma competência com dispersão >= 2 no 360.
    let divergenciaAvaliadores = false;
    if (atual && atual.participantes.length >= 2) {
      for (const c of atual.ciclo.competencias) {
        const notas = atual.participantes.map((p) => p.notas.find((n) => n.codComp === c.codComp)?.nota).filter((n): n is number => n != null);
        if (notas.length >= 2 && Math.max(...notas) - Math.min(...notas) >= 2) { divergenciaAvaliadores = true; break; }
      }
    }

    const avaliacaoAtrasada = !!atual && atual.status !== 'CONCLUIDA' && atual.ciclo.status === 'ABERTO' && !!atual.ciclo.dtFim && atual.ciclo.dtFim < hoje;

    const progressos = planos.map((p) => progressoDoPlano(p.acoes));
    const progressoMedio = progressos.length === 0 ? null : Math.round(progressos.reduce((s, n) => s + n, 0) / progressos.length);
    const pdiAcoesAtrasadas = planos.reduce((s, p) => s + p.acoes.filter((a) => a.prazo && a.prazo < hoje && a.status !== 'CONCLUIDA' && a.status !== 'CANCELADA').length, 0);
    const aderencia = calcularAderencia({
      planosAtivos: planos.length,
      progressoMedio,
      acoesAtrasadas: pdiAcoesAtrasadas,
      feedbacksConstrutivosSemCiencia: feedbacks.filter((f) => f.tipo === 'CONSTRUTIVO' && f.cienteFun !== 'S').length,
      ultimaNotaDesempenho: notasConcl[0] ?? null,
    });
    const rm = resumoMetas(metas.map((m) => ({ progresso: m.progresso, prazo: m.prazo, cancelada: m.cancelada === 'S', peso: m.peso })), hoje);
    const rt = resumoTreinamentos(treinos.map((t) => ({ status: t.status, dtVencimento: t.dtVencimento, cargaHoraria: t.treinamento.cargaHoraria })), hoje);

    const comMatricula = new Set(treinos.filter((t) => t.status !== 'CANCELADO').map((t) => t.codTreino.toString()));
    const treinosObrigatoriosPendentes = catalogoObrig.filter((t) => !comMatricula.has(t.codTreino.toString())).length;

    const ultimoFeedback = feedbacks[0]?.dhInc ?? null;
    const diasSemFeedback = ultimoFeedback ? Math.floor((hoje.getTime() - new Date(ultimoFeedback).getTime()) / 86_400_000) : null;

    return {
      avaliacaoAtrasada,
      tendenciaNota,
      notaAtual,
      metasAtrasadas: rm.atrasadas,
      pdiAcoesAtrasadas,
      semPlanoPdi: planos.length === 0,
      treinosObrigatoriosPendentes,
      treinosVencidos: rt.vencidos,
      diasSemFeedback,
      divergenciaAvaliadores,
      aderenciaScore: aderencia.score,
      aderenciaNivel: aderencia.nivel,
    };
  }
}
