import { BadRequestException, Controller, Get, Param, Post, Req, ServiceUnavailableException } from '@nestjs/common';
import type { Request } from 'express';
import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { resolverAvaliacao } from './nota-avaliacao';
import { classificacaoDesempenho } from './desempenho-360';
import { calcularAderencia } from './aderencia';
import { resumoMetas } from './metas';
import { resumoTreinamentos } from './treinamentos';
import { progressoDoPlano } from './pdi';
import {
  DossieDesempenho,
  EsquemaResumo,
  EsquemaRoteiro,
  PROMPT_SISTEMA,
  VERSAO_RESUMO,
  VERSAO_ROTEIRO,
  montarDossieTexto,
  montarPromptResumo,
  montarPromptRoteiro,
  normalizarResumo,
  normalizarRoteiro,
} from './ia-desempenho';

type ReqAut = Request & { usuario: UsuarioAutenticado };
type Tx = Parameters<Parameters<PrismaService['executarNoTenant']>[1]>[0];
type Tipo = 'RESUMO_EXEC' | 'ROTEIRO_FEEDBACK';

const CONFIG: Record<Tipo, { purpose: string; esquema: object; prompt: (d: DossieDesempenho) => string; orcamento: number }> = {
  RESUMO_EXEC: { purpose: VERSAO_RESUMO, esquema: EsquemaResumo, prompt: montarPromptResumo, orcamento: 1400 },
  ROTEIRO_FEEDBACK: { purpose: VERSAO_ROTEIRO, esquema: EsquemaRoteiro, prompt: montarPromptRoteiro, orcamento: 1400 },
};

/**
 * IA de desempenho (RN-GP-032): resumo executivo e roteiro de feedback pelo
 * gateway (ADR-0003). A IA explica, não decide. Cache por hash do dossiê —
 * mudou o dado, avisa que envelheceu em vez de reprocessar (chamada é paga).
 */
@Controller('gestao-pessoas/colaboradores/:codFun/ia')
export class IADesempenhoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('resumo')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  consultarResumo(@Req() req: ReqAut, @Param('codFun') codFun: string) {
    return this.consultar(req, codFun, 'RESUMO_EXEC');
  }

  @Post('resumo')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  gerarResumo(@Req() req: ReqAut, @Param('codFun') codFun: string) {
    return this.gerar(req, codFun, 'RESUMO_EXEC');
  }

  @Get('roteiro')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  consultarRoteiro(@Req() req: ReqAut, @Param('codFun') codFun: string) {
    return this.consultar(req, codFun, 'ROTEIRO_FEEDBACK');
  }

  @Post('roteiro')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  gerarRoteiro(@Req() req: ReqAut, @Param('codFun') codFun: string) {
    return this.gerar(req, codFun, 'ROTEIRO_FEEDBACK');
  }

  // ---- interno ----

  private async consultar(req: ReqAut, codFunParam: string, tipo: Tipo) {
    const codFun = BigInt(codFunParam);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const { hash } = await this.reunirDossie(tx, codFun);
      const insight = await tx.iADesempenhoInsight.findFirst({
        where: { codFun, tipo, status: 'OK' },
        orderBy: { codIaIns: 'desc' },
      });
      if (!insight) return null;
      return { ...insight, desatualizado: insight.hashEntrada !== hash };
    });
  }

  private async gerar(req: ReqAut, codFunParam: string, tipo: Tipo) {
    const codTen = req.usuario.codTen;
    const codFun = BigInt(codFunParam);

    const { dossie, hash, provedorIa } = await this.prisma.executarNoTenant(codTen, (tx) => this.reunirDossie(tx, codFun));

    // Reaproveita quando o dossiê não mudou (chamada paga não se repete à toa).
    const existente = await this.prisma.executarNoTenant(codTen, (tx) =>
      tx.iADesempenhoInsight.findFirst({ where: { codFun, tipo, hashEntrada: hash, status: 'OK' }, orderBy: { codIaIns: 'desc' } }),
    );
    if (existente) return { ...existente, desatualizado: false, reaproveitado: true };

    // Fora de transação: LLM leva dezenas de segundos e estoura o timeout do Prisma.
    const cfg = CONFIG[tipo];
    const resultado = await this.chamarGateway(codTen, provedorIa, cfg, dossie);
    // Tolerante ao ler, rígido ao gravar: coage listas antes de persistir.
    const conteudo = tipo === 'RESUMO_EXEC' ? normalizarResumo(resultado.conteudo) : normalizarRoteiro(resultado.conteudo);

    const salvo = await this.prisma.executarNoTenant(codTen, async (tx) => {
      const s = await tx.iADesempenhoInsight.create({
        data: {
          codTen,
          codFun,
          tipo,
          conteudoJson: conteudo as Prisma.InputJsonValue,
          hashEntrada: hash,
          provedor: resultado.provedor,
          modeloUsado: resultado.modelo,
          versaoPrompt: cfg.purpose,
          duracaoMs: resultado.duracaoMs,
          codUsuInc: req.usuario.codUsu,
        },
      });
      // Auditoria da geração (§33) — chaveada pelo colaborador (PAINEL360) para a
      // trilha do painel juntar visualização, exportação e IA num só lugar.
      await tx.logAuditoria.create({
        data: {
          codTen,
          nomeTab: 'PAINEL360',
          codReg: codFun,
          operacao: tipo === 'RESUMO_EXEC' ? 'IA_RESUMO' : 'IA_ROTEIRO',
          origem: `desempenho.ia.${tipo.toLowerCase()}`,
          dadosNovos: { insight: s.codIaIns.toString(), provedor: resultado.provedor, modelo: resultado.modelo } as Prisma.InputJsonValue,
          codUsuAlt: req.usuario.codUsu,
        },
      });
      return s;
    });
    return { ...salvo, desatualizado: false, reaproveitado: false };
  }

  /** Reúne o dossiê determinístico (na mesma ordem sempre — o hash depende disso). */
  private async reunirDossie(tx: Tx, codFun: bigint): Promise<{ dossie: DossieDesempenho; hash: string; provedorIa: string }> {
    const notaDe = (comps: { codComp: bigint; peso: number }[], notas: { codComp: bigint; nota: number }[], parts: { peso: number; notas: { codComp: bigint; nota: number }[] }[]) =>
      resolverAvaliacao(comps, notas, parts);

    const func = await tx.funcionario.findFirst({ where: { codFun, ativo: 'S' }, select: { nomeFun: true, cargo: { select: { nomeCar: true } } } });
    if (!func) throw new BadRequestException('Colaborador inexistente neste tenant');

    const partSel = { select: { peso: true, notas: { select: { codComp: true, nota: true } } } } as const;
    const atual = await tx.avaliacaoDesempenho.findFirst({
      where: { codFun },
      orderBy: { codAval: 'desc' },
      select: {
        ciclo: { select: { nome: true, competencias: { select: { codComp: true, nome: true, peso: true } } } },
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

    const [planos, feedbacks, metas, treinos] = await Promise.all([
      tx.planoDesenvolvimento.findMany({ where: { codFun, status: 'ATIVO' }, select: { acoes: { select: { status: true, progresso: true, prazo: true } } } }),
      tx.feedback.findMany({ where: { codFun }, orderBy: { codFeed: 'desc' }, take: 4, select: { tipo: true, mensagem: true, cienteFun: true } }),
      tx.meta.findMany({ where: { codFun }, select: { progresso: true, prazo: true, cancelada: true, peso: true } }),
      tx.matriculaTreinamento.findMany({ where: { codFun }, select: { status: true, dtVencimento: true, treinamento: { select: { cargaHoraria: true } } } }),
    ]);

    const hoje = new Date();
    const resolvidaAtual = atual ? notaDe(atual.ciclo.competencias, atual.notas, atual.participantes) : null;
    const notaAtual = resolvidaAtual?.notaFinal ?? null;
    const notasConcl = concluidas.map((a) => notaDe(a.ciclo.competencias, a.notas, a.participantes).notaFinal).filter((n): n is number => n !== null);
    const notaAnterior = notasConcl.length >= 2 ? notasConcl[1] : null;

    const avaliadas = (atual?.ciclo.competencias ?? [])
      .map((c) => ({ competencia: c.nome, nota: resolvidaAtual?.porCompetencia.get(c.codComp.toString()) ?? null }))
      .filter((c): c is { competencia: string; nota: number } => c.nota !== null)
      .sort((a, b) => b.nota - a.nota);

    const progressos = planos.map((p) => progressoDoPlano(p.acoes));
    const progressoMedio = progressos.length === 0 ? null : Math.round(progressos.reduce((s, n) => s + n, 0) / progressos.length);
    const acoesAtrasadas = planos.reduce((s, p) => s + p.acoes.filter((a) => a.prazo && a.prazo < hoje && a.status !== 'CONCLUIDA' && a.status !== 'CANCELADA').length, 0);
    const pdiAcoesPendentes = planos.reduce((s, p) => s + p.acoes.filter((a) => a.status !== 'CONCLUIDA' && a.status !== 'CANCELADA').length, 0);
    const aderencia = calcularAderencia({
      planosAtivos: planos.length,
      progressoMedio,
      acoesAtrasadas,
      feedbacksConstrutivosSemCiencia: feedbacks.filter((f) => f.tipo === 'CONSTRUTIVO' && f.cienteFun !== 'S').length,
      ultimaNotaDesempenho: notasConcl[0] ?? null,
    });
    const rm = resumoMetas(metas.map((m) => ({ progresso: m.progresso, prazo: m.prazo, cancelada: m.cancelada === 'S', peso: m.peso })), hoje);
    const rt = resumoTreinamentos(treinos.map((t) => ({ status: t.status, dtVencimento: t.dtVencimento, cargaHoraria: t.treinamento.cargaHoraria })), hoje);

    const dossie: DossieDesempenho = {
      nome: func.nomeFun,
      cargo: func.cargo?.nomeCar ?? null,
      ciclo: atual?.ciclo.nome ?? null,
      notaAtual,
      notaAnterior,
      classificacao: classificacaoDesempenho(notaAtual)?.rotulo ?? null,
      destaques: avaliadas.slice(0, 3),
      atencao: [...avaliadas].reverse().slice(0, 3),
      aderencia: { score: aderencia.score, nivel: aderencia.nivel, motivos: aderencia.motivos },
      metas: { total: rm.total, concluidas: rm.concluidas, atrasadas: rm.atrasadas, progresso: rm.progressoPonderado },
      feedbacksRecentes: feedbacks.map((f) => ({ tipo: f.tipo, mensagem: f.mensagem })),
      pdiAcoesPendentes,
      treinos: { concluidos: rt.concluidos, pendentes: rt.pendentes + rt.emAndamento, vencidos: rt.vencidos },
    };

    // A RLS já escopa o tx ao tenant — a config de IA vem direto.
    const cfgIa = await tx.configuracaoIa.findFirst({ select: { provedorIa: true } });
    const hash = createHash('sha256').update(montarDossieTexto(dossie)).digest('hex');
    return { dossie, hash, provedorIa: cfgIa?.provedorIa ?? 'nuvem' };
  }

  private async chamarGateway(codTen: bigint, provedorIa: string, cfg: (typeof CONFIG)[Tipo], dossie: DossieDesempenho) {
    const baseUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';
    const inicio = Date.now();
    let resp: Response;
    try {
      resp = await fetch(`${baseUrl}/v1/ia/gerar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          purpose: cfg.purpose,
          cod_ten: Number(codTen),
          mensagens: [
            { papel: 'system', conteudo: PROMPT_SISTEMA },
            { papel: 'user', conteudo: cfg.prompt(dossie) },
          ],
          orcamento_tokens: cfg.orcamento,
          provedor_preferido: provedorIa === 'local' ? 'local' : 'nuvem',
          esquema_saida: cfg.esquema,
        }),
        signal: AbortSignal.timeout(180_000),
      });
    } catch {
      throw new ServiceUnavailableException({ codigo: 'IA_INDISPONIVEL', mensagem: 'Serviço de IA não respondeu.' });
    }
    const duracaoMs = Date.now() - inicio;
    const json = (await resp.json().catch(() => null)) as { detail?: unknown; conteudo?: unknown; modelo?: string; provedor?: string } | null;
    if (!resp.ok) throw new ServiceUnavailableException(json?.detail ?? { codigo: 'IA_ERRO', mensagem: 'Falha ao gerar.' });
    return { conteudo: json?.conteudo, modelo: json?.modelo ?? null, provedor: json?.provedor ?? null, duracaoMs };
  }
}
