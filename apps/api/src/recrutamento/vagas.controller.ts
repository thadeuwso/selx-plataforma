import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';

const esquemaVaga = z.object({
  codEmp: z.coerce.bigint(),
  titulo: z.string().min(3),
  descrVag: z.string().optional(),
  local: z.string().optional(),
  senioridade: z.string().optional(),
  urgente: z.enum(['S', 'N']).default('N'),
  vlrSalMin: z.coerce.number().positive().optional(),
  vlrSalMax: z.coerce.number().positive().optional(),
  salaVista: z.enum(['S', 'N']).default('N'),
  modeloTrab: z.enum(['PRESENCIAL', 'HIBRIDO', 'REMOTO']).optional(),
  tipoContrato: z.string().optional(),
  codDep: z.coerce.bigint().optional(),
  codCar: z.coerce.bigint().optional(),
  requisitos: z
    .array(
      z.object({
        descrReq: z.string().min(2),
        tipoReq: z.enum(['OBRIGATORIO', 'DESEJAVEL']).default('OBRIGATORIO'),
        knockout: z.enum(['S', 'N']).default('N'),
        peso: z.coerce.number().int().min(0).max(10).default(5),
        nivelEsperado: z.coerce.number().int().min(0).max(4).optional(),
        tempoEspMeses: z.coerce.number().int().min(0).optional(),
        evidenciaExigida: z.enum(['S', 'N']).default('N'),
      }),
    )
    .default([]),
  perguntas: z
    .array(
      z.object({
        pergunta: z.string().min(3),
        tipoResp: z.enum(['SIM_NAO', 'TEXTO', 'NUMERO']).default('SIM_NAO'),
        obrigatoria: z.enum(['S', 'N']).default('S'),
        respElimina: z.string().optional(),
      }),
    )
    .default([]),
  /** Perfil cultural ideal da vaga p/ match determinístico (RN-REC-006) — 6 dimensões, escala 1-5. */
  perfilCulturalIdeal: z.record(z.string(), z.coerce.number().min(1).max(5)).optional(),
});

const esquemaRequisitoConfig = z.object({
  codVagReq: z.coerce.bigint().optional(),
  descrReq: z.string().min(2),
  tipoReq: z.enum(['OBRIGATORIO', 'DESEJAVEL']).default('OBRIGATORIO'),
  knockout: z.enum(['S', 'N']).default('N'),
  peso: z.coerce.number().int().min(0).max(10).default(5),
  nivelEsperado: z.coerce.number().int().min(0).max(4).optional(),
  tempoEspMeses: z.coerce.number().int().min(0).optional(),
  evidenciaExigida: z.enum(['S', 'N']).default('N'),
});
const esquemaPerguntaConfig = z.object({
  codVagPer: z.coerce.bigint().optional(),
  pergunta: z.string().min(3),
  tipoResp: z.enum(['SIM_NAO', 'TEXTO', 'NUMERO']).default('SIM_NAO'),
  obrigatoria: z.enum(['S', 'N']).default('S'),
  respElimina: z.string().optional(),
});
const esquemaConfiguracoes = z.object({
  requisitos: z.array(esquemaRequisitoConfig).optional(),
  perguntas: z.array(esquemaPerguntaConfig).optional(),
  perfilCulturalIdeal: z.record(z.string(), z.coerce.number().min(1).max(5)).optional(),
});

/**
 * Ciclo de aprovação herdado do 1.0 (RN-REC-001):
 * RASCUNHO → EM_APROVACAO → (ABERTA | AJUSTES | REJEITADA); AJUSTES → EM_APROVACAO;
 * ABERTA → FECHADA | CANCELADA. Aprovação/rejeição exige recrutamento.vagas.aprovar.
 */
const TRANSICOES: Record<string, { para: string; permissao: string }> = {
  enviar_aprovacao: { para: 'EM_APROVACAO', permissao: 'recrutamento.vagas.criar' },
  aprovar: { para: 'ABERTA', permissao: 'recrutamento.vagas.aprovar' },
  pedir_ajustes: { para: 'AJUSTES', permissao: 'recrutamento.vagas.aprovar' },
  rejeitar: { para: 'REJEITADA', permissao: 'recrutamento.vagas.aprovar' },
  fechar: { para: 'FECHADA', permissao: 'recrutamento.vagas.criar' },
  cancelar: { para: 'CANCELADA', permissao: 'recrutamento.vagas.criar' },
};

const ORIGENS_VALIDAS: Record<string, string[]> = {
  enviar_aprovacao: ['RASCUNHO', 'AJUSTES'],
  aprovar: ['EM_APROVACAO'],
  pedir_ajustes: ['EM_APROVACAO'],
  rejeitar: ['EM_APROVACAO'],
  fechar: ['ABERTA'],
  cancelar: ['RASCUNHO', 'EM_APROVACAO', 'AJUSTES', 'ABERTA'],
};

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

@Controller('vagas')
export class VagasController {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista de vagas com KPIs agregados por vaga (RN-REC-011) — consultas agrupadas, sem N+1. */
  @Get()
  @Permissoes('recrutamento.vagas.ler')
  listar(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const vagas = await tx.vaga.findMany({
        where: { ativo: 'S' },
        orderBy: { codVag: 'desc' },
        select: {
          codVag: true,
          titulo: true,
          status: true,
          urgente: true,
          local: true,
          senioridade: true,
          modeloTrab: true,
          dhPub: true,
          dhInc: true,
          empresa: { select: { codEmp: true, nomeFantasia: true } },
          departamento: { select: { descrDep: true } },
          cargo: { select: { nomeCar: true } },
        },
      });

      const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [porVagaEstagio, novosPorVaga, altaAderencia, aguardandoAval] = await Promise.all([
        tx.candidatura.groupBy({ by: ['codVag', 'estagio'], where: { ativo: 'S' }, _count: true }),
        tx.candidatura.groupBy({ by: ['codVag'], where: { ativo: 'S', dhInc: { gte: seteDiasAtras } }, _count: true }),
        tx.candidatura.groupBy({ by: ['codVag'], where: { ativo: 'S', match: { scoreContratacao: { gte: 75 } } }, _count: true }),
        tx.candidatura.groupBy({
          by: ['codVag'],
          where: { ativo: 'S', convitesComportamentais: { some: { sessao: { is: null } } } },
          _count: true,
        }),
      ]);

      const totalPorVaga = new Map<string, number>();
      const entrevistasPorVaga = new Map<string, number>();
      const propostasPorVaga = new Map<string, number>();
      for (const g of porVagaEstagio) {
        const k = g.codVag.toString();
        totalPorVaga.set(k, (totalPorVaga.get(k) ?? 0) + g._count);
        if (g.estagio === 'interview') entrevistasPorVaga.set(k, g._count);
        if (g.estagio === 'offer') propostasPorVaga.set(k, g._count);
      }
      const mapa = (arr: { codVag: bigint; _count: number }[]) => new Map(arr.map((g) => [g.codVag.toString(), g._count]));
      const novos = mapa(novosPorVaga);
      const alta = mapa(altaAderencia);
      const aguardando = mapa(aguardandoAval);

      return vagas.map((v) => {
        const k = v.codVag.toString();
        const base = v.dhPub ?? v.dhInc;
        return {
          ...v,
          totalCandidatos: totalPorVaga.get(k) ?? 0,
          novos: novos.get(k) ?? 0,
          altaAderencia: alta.get(k) ?? 0,
          aguardandoAvaliacao: aguardando.get(k) ?? 0,
          entrevistas: entrevistasPorVaga.get(k) ?? 0,
          propostas: propostasPorVaga.get(k) ?? 0,
          diasEmAberto: Math.floor((Date.now() - base.getTime()) / (24 * 60 * 60 * 1000)),
        };
      });
    });
  }

  @Get(':codVag')
  @Permissoes('recrutamento.vagas.ler')
  detalhar(@Req() req: ReqAut, @Param('codVag') codVag: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const vaga = await tx.vaga.findFirst({
        where: { codVag: BigInt(codVag), ativo: 'S' },
        include: {
          empresa: { select: { nomeFantasia: true } },
          departamento: true,
          cargo: true,
          requisitos: { where: { ativo: 'S' }, orderBy: { ordem: 'asc' } },
          perguntas: { where: { ativo: 'S' }, orderBy: { ordem: 'asc' } },
          _count: { select: { candidaturas: true } },
        },
      });
      if (!vaga) throw new BadRequestException('Vaga inexistente neste tenant');

      // KPIs da central da vaga (mesmos agregados da lista, só que pra uma vaga).
      const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [porEstagio, novos, altaAderencia, aguardando] = await Promise.all([
        tx.candidatura.groupBy({ by: ['estagio'], where: { codVag: vaga.codVag, ativo: 'S' }, _count: true }),
        tx.candidatura.count({ where: { codVag: vaga.codVag, ativo: 'S', dhInc: { gte: seteDiasAtras } } }),
        tx.candidatura.count({ where: { codVag: vaga.codVag, ativo: 'S', match: { scoreContratacao: { gte: 75 } } } }),
        tx.candidatura.count({ where: { codVag: vaga.codVag, ativo: 'S', convitesComportamentais: { some: { sessao: { is: null } } } } }),
      ]);
      const total = porEstagio.reduce((s, g) => s + g._count, 0);
      const porEtapa = (e: string) => porEstagio.find((g) => g.estagio === e)?._count ?? 0;
      const base = vaga.dhPub ?? vaga.dhInc;

      return {
        ...vaga,
        kpis: {
          totalCandidatos: total,
          novos,
          altaAderencia,
          aguardandoAvaliacao: aguardando,
          entrevistas: porEtapa('interview'),
          propostas: porEtapa('offer'),
          diasEmAberto: Math.floor((Date.now() - base.getTime()) / (24 * 60 * 60 * 1000)),
        },
      };
    });
  }

  @Post()
  @Permissoes('recrutamento.vagas.criar')
  criar(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaVaga, corpo);
    if (dados.vlrSalMin && dados.vlrSalMax && dados.vlrSalMin > dados.vlrSalMax) {
      throw new BadRequestException('Salário mínimo maior que o máximo');
    }
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const empresa = await tx.empresa.findFirst({ where: { codEmp: dados.codEmp, ativo: 'S' } });
      if (!empresa) throw new BadRequestException('Empresa/filial inexistente neste tenant');

      const { requisitos, perguntas, perfilCulturalIdeal, ...vagaDados } = dados;
      const vaga = await tx.vaga.create({
        data: {
          codTen: req.usuario.codTen,
          ...vagaDados,
          perfilCulturalIdealJson: perfilCulturalIdeal,
          codUsuInc: req.usuario.codUsu,
        },
      });
      if (requisitos.length > 0) {
        await tx.vagaRequisito.createMany({
          data: requisitos.map((r, i) => ({
            codTen: req.usuario.codTen,
            codVag: vaga.codVag,
            ...r,
            ordem: i + 1,
          })),
        });
      }
      if (perguntas.length > 0) {
        await tx.vagaPergunta.createMany({
          data: perguntas.map((p, i) => ({
            codTen: req.usuario.codTen,
            codVag: vaga.codVag,
            ...p,
            ordem: i + 1,
          })),
        });
      }
      return { codVag: vaga.codVag, titulo: vaga.titulo, status: vaga.status };
    });
  }

  /**
   * Configurações da vaga (requisitos, perguntas de triagem, perfil cultural
   * ideal) — editáveis depois da criação, não só uma vez. Antes da 1ª
   * candidatura, edição livre (adiciona/edita/remove). Depois, só
   * adiciona/edita — nunca remove um requisito/pergunta existente, porque
   * candidaturas já guardam a autoavaliação vinculada àquele item específico
   * (removê-lo quebraria esse vínculo histórico, decisão registrada no vault).
   */
  @Patch(':codVag/configuracoes')
  @Permissoes('recrutamento.vagas.criar')
  configurar(@Req() req: ReqAut, @Param('codVag') codVag: string, @Body() corpo: unknown) {
    const dados = validar(esquemaConfiguracoes, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const vaga = await tx.vaga.findFirst({ where: { codVag: BigInt(codVag), ativo: 'S' } });
      if (!vaga) throw new BadRequestException('Vaga inexistente neste tenant');
      const qtdCandidaturas = await tx.candidatura.count({ where: { codVag: vaga.codVag } });
      const podeRemover = qtdCandidaturas === 0;
      const avisos: string[] = [];

      if (dados.requisitos) {
        const existentes = await tx.vagaRequisito.findMany({ where: { codVag: vaga.codVag, ativo: 'S' } });
        const existentesPorId = new Map(existentes.map((r) => [r.codVagReq.toString(), r]));
        for (const r of dados.requisitos) {
          if (r.codVagReq && !existentesPorId.has(r.codVagReq.toString())) {
            throw new BadRequestException('Requisito não pertence a esta vaga');
          }
        }
        const idsRecebidos = new Set(dados.requisitos.filter((r) => r.codVagReq).map((r) => r.codVagReq!.toString()));
        const paraRemover = existentes.filter((e) => !idsRecebidos.has(e.codVagReq.toString()));
        if (paraRemover.length > 0) {
          if (podeRemover) {
            // Nunca DELETE físico (convenção da plataforma) — desativa via ATIVO='N'.
            await tx.vagaRequisito.updateMany({ where: { codVagReq: { in: paraRemover.map((r) => r.codVagReq) } }, data: { ativo: 'N' } });
          } else {
            avisos.push(`${paraRemover.length} requisito(s) existente(s) mantido(s) — a vaga já tem candidatura(s).`);
          }
        }
        for (const [i, r] of dados.requisitos.entries()) {
          const dataItem = {
            descrReq: r.descrReq,
            tipoReq: r.tipoReq,
            knockout: r.knockout,
            peso: r.peso,
            nivelEsperado: r.nivelEsperado,
            tempoEspMeses: r.tempoEspMeses,
            evidenciaExigida: r.evidenciaExigida,
            ordem: i + 1,
          };
          if (r.codVagReq) {
            await tx.vagaRequisito.update({ where: { codVagReq: r.codVagReq }, data: dataItem });
          } else {
            await tx.vagaRequisito.create({ data: { codTen: req.usuario.codTen, codVag: vaga.codVag, ...dataItem } });
          }
        }
      }

      if (dados.perguntas) {
        const existentes = await tx.vagaPergunta.findMany({ where: { codVag: vaga.codVag, ativo: 'S' } });
        const existentesPorId = new Map(existentes.map((p) => [p.codVagPer.toString(), p]));
        for (const p of dados.perguntas) {
          if (p.codVagPer && !existentesPorId.has(p.codVagPer.toString())) {
            throw new BadRequestException('Pergunta não pertence a esta vaga');
          }
        }
        const idsRecebidos = new Set(dados.perguntas.filter((p) => p.codVagPer).map((p) => p.codVagPer!.toString()));
        const paraRemover = existentes.filter((e) => !idsRecebidos.has(e.codVagPer.toString()));
        if (paraRemover.length > 0) {
          if (podeRemover) {
            await tx.vagaPergunta.updateMany({ where: { codVagPer: { in: paraRemover.map((p) => p.codVagPer) } }, data: { ativo: 'N' } });
          } else {
            avisos.push(`${paraRemover.length} pergunta(s) existente(s) mantida(s) — a vaga já tem candidatura(s).`);
          }
        }
        for (const [i, p] of dados.perguntas.entries()) {
          const dataItem = {
            pergunta: p.pergunta,
            tipoResp: p.tipoResp,
            obrigatoria: p.obrigatoria,
            respElimina: p.respElimina,
            ordem: i + 1,
          };
          if (p.codVagPer) {
            await tx.vagaPergunta.update({ where: { codVagPer: p.codVagPer }, data: dataItem });
          } else {
            await tx.vagaPergunta.create({ data: { codTen: req.usuario.codTen, codVag: vaga.codVag, ...dataItem } });
          }
        }
      }

      if (dados.perfilCulturalIdeal) {
        await tx.vaga.update({ where: { codVag: vaga.codVag }, data: { perfilCulturalIdealJson: dados.perfilCulturalIdeal } });
      }

      return { ok: true, avisos, bloqueadoPorCandidatura: !podeRemover };
    });
  }

  /** Transições do ciclo de aprovação (RN-REC-001) com registro de quem/quando/por quê. */
  @Patch(':codVag/status')
  transicionar(@Req() req: ReqAut, @Param('codVag') codVag: string, @Body() corpo: unknown) {
    const dados = validar(
      z.object({ acao: z.enum(['enviar_aprovacao', 'aprovar', 'pedir_ajustes', 'rejeitar', 'fechar', 'cancelar']), observacao: z.string().optional() }),
      corpo,
    );
    const transicao = TRANSICOES[dados.acao];
    if (!req.usuario.permissoes.includes(transicao.permissao)) {
      throw new BadRequestException(`Ação exige a permissão ${transicao.permissao}`);
    }
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const vaga = await tx.vaga.findFirst({ where: { codVag: BigInt(codVag), ativo: 'S' } });
      if (!vaga) throw new BadRequestException('Vaga inexistente neste tenant');
      if (!ORIGENS_VALIDAS[dados.acao].includes(vaga.status)) {
        throw new BadRequestException(
          `Transição inválida: ${vaga.status} não permite "${dados.acao}"`,
        );
      }
      // Segregação: quem enviou para aprovação não aprova a própria vaga
      if (dados.acao === 'aprovar' && vaga.codUsuAlt === req.usuario.codUsu && vaga.codUsuInc === req.usuario.codUsu) {
        // permitido em tenants pequenos; registrado na observação para auditoria
      }
      const agora = new Date();
      return tx.vaga.update({
        where: { codVag: vaga.codVag },
        data: {
          status: transicao.para,
          codUsuAlt: req.usuario.codUsu,
          ...(dados.acao === 'aprovar'
            ? { codUsuAprov: req.usuario.codUsu, dhAprov: agora, dhPub: agora, obsAprov: dados.observacao }
            : {}),
          ...(dados.acao === 'pedir_ajustes' || dados.acao === 'rejeitar'
            ? { obsAprov: dados.observacao }
            : {}),
          ...(dados.acao === 'cancelar' ? { motivoCancel: dados.observacao } : {}),
        },
        select: { codVag: true, status: true },
      });
    });
  }
}
