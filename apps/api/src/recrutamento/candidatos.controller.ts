import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { randomBytes } from 'node:crypto';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { FuncionariosService } from '../core/funcionarios/funcionarios.service';
import {
  calcularHashEntrada,
  calcularMatch,
  calcularScoreRequisito,
  type AutoavaliacaoResp,
  type PerfilCultural,
} from './calcular-match';
import { montarEvidencias } from './analise-candidato';
import { NIVEIS_FORMACAO, ordemNivel, rotuloDisponibilidade, TIPOS_DISPONIBILIDADE } from './campos-estruturados';
import { EmailService } from '../compartilhado/email/email.service';

export const ESTAGIOS = [
  'applied', 'screening', 'analysis', 'knockout', 'shortlist', 'interview',
  'offer', 'approved', 'not_selected', 'rejected', 'hired', 'archived',
] as const;

const ORDENACOES = ['prioridade', 'aderencia_desc', 'aderencia_asc', 'recentes', 'antigos', 'nome', 'etapa'] as const;

/**
 * Etapas de avanço, em ordem, para o funil por canal (RN-REC-010). Só progresso:
 * os estágios terminais (knockout, rejected, not_selected, archived) são desfecho,
 * não um degrau a mais — entrariam no funil inflando a etapa em que pararam.
 */
const ETAPAS_FUNIL = ['applied', 'screening', 'analysis', 'shortlist', 'interview', 'offer', 'hired'] as const;

/** Lista do banco de talentos — busca em nome/e-mail/cidade, paginada no servidor. */
const esquemaListaCandidatos = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  tamanhoPagina: z.coerce.number().int().min(1).max(200).default(50),
  busca: z.string().optional(),
});

const arredondar = (n: number) => Math.round(n * 10) / 10;
const percentual = (parte: number, total: number) => (total === 0 ? null : arredondar((parte * 100) / total));

const esquemaListaCandidaturas = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  tamanhoPagina: z.coerce.number().int().min(1).max(200).default(50),
  ordenar: z.enum(ORDENACOES).default('prioridade'),
  estagio: z.string().optional(),
  busca: z.string().optional(),
  aderenciaMin: z.coerce.number().min(0).max(100).optional(),
  aderenciaMax: z.coerce.number().min(0).max(100).optional(),
  // RN-REC-016: os campos estruturados só valem a pena se filtram.
  pretensaoMax: z.coerce.number().min(0).optional(),
  dispTipo: z.enum(TIPOS_DISPONIBILIDADE).optional(),
  formacaoMin: z.enum(NIVEIS_FORMACAO).optional(),
  // RN-REC-017: triagem em volume.
  tags: z.string().optional(),
  favoritos: z.enum(['S']).optional(),
});

function ordenarPorParaOrderBy(ordenar: (typeof ORDENACOES)[number]): Prisma.CandidaturaOrderByWithRelationInput {
  switch (ordenar) {
    case 'prioridade': return { match: { scoreContratacao: 'desc' } };
    case 'aderencia_desc': return { match: { scoreGeral: 'desc' } };
    case 'aderencia_asc': return { match: { scoreGeral: 'asc' } };
    case 'recentes': return { dhInc: 'desc' };
    case 'antigos': return { dhInc: 'asc' };
    case 'nome': return { candidato: { nomeCand: 'asc' } };
    case 'etapa': return { estagio: 'asc' };
  }
}

const esquemaCanal = z.object({
  nomeCanal: z.string().min(2),
  tipoCanal: z.enum(['conector', 'importacao', 'manual']).default('manual'),
  vlrCustoMes: z.coerce.number().min(0).optional(),
});

const esquemaCandidato = z.object({
  nomeCand: z.string().min(2),
  email: z.string().email(),
  fone: z.string().optional(),
  cgc: z.string().optional(),
  linkedin: z.string().optional(),
  cidade: z.string().optional(),
  cargoAtual: z.string().optional(),
  /** Perfil cultural autoavaliado p/ match determinístico (RN-REC-006) — 6 dimensões, escala 1-5. */
  perfilCultural: z.record(z.string(), z.coerce.number().min(1).max(5)).optional(),
});

const esquemaAutoavaliacaoResp = z.object({
  nivel: z.coerce.number().int().min(0).max(4).optional(),
  tempoMeses: z.coerce.number().int().min(0).optional(),
  evidenciaTexto: z.string().optional(),
});

const esquemaCandidatura = z.object({
  candidato: esquemaCandidato,
  codCanal: z.coerce.bigint(),
  idExterno: z.string().optional(),
  respostas: z.record(z.string(), z.unknown()).optional(),
  /** Autoavaliação por requisito (RN-REC-006), mapa codVagReq -> resposta. */
  autoavaliacao: z.record(z.string(), esquemaAutoavaliacaoResp).optional(),
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
type Tx = Parameters<Parameters<PrismaService['executarNoTenant']>[1]>[0];

interface SinalKnockout {
  codVagPer: string;
  pergunta: string;
  respostaCandidato: unknown;
  respElimina: string;
}

/**
 * RN-REC-004: sinalização automática de resposta eliminatória — não move a
 * candidatura de estágio (porte fiel do 1.0: lá também é só sinal pro
 * recrutador decidir, o estágio "knockout" nunca foi movido sozinho).
 * Qualquer pergunta reprovada já sinaliza (mesma regra do 1.0: falha em
 * qualquer uma sinaliza, não precisa reprovar em todas).
 */
function avaliarSinalizacaoKnockout(
  perguntas: { codVagPer: bigint; pergunta: string; tipoResp: string; obrigatoria: string; respElimina: string | null }[],
  respostas: Record<string, unknown>,
): SinalKnockout | null {
  for (const p of perguntas) {
    if (!p.respElimina) continue;
    const resposta = respostas[p.codVagPer.toString()];

    if (resposta === undefined || resposta === null) {
      if (p.obrigatoria === 'S') {
        return { codVagPer: p.codVagPer.toString(), pergunta: p.pergunta, respostaCandidato: null, respElimina: p.respElimina };
      }
      continue;
    }

    const bateu =
      p.tipoResp === 'TEXTO'
        ? String(resposta).toLowerCase().includes(p.respElimina.toLowerCase())
        : String(resposta).trim().toLowerCase() === p.respElimina.trim().toLowerCase();

    if (bateu) {
      return { codVagPer: p.codVagPer.toString(), pergunta: p.pergunta, respostaCandidato: resposta, respElimina: p.respElimina };
    }
  }
  return null;
}

/** Dedup de candidato por e-mail (e CPF quando houver) no tenant — RN-REC-009. */
async function upsertCandidato(
  tx: Tx,
  codTen: bigint,
  codUsu: bigint,
  dados: z.infer<typeof esquemaCandidato>,
) {
  const { perfilCultural, ...dadosBasicos } = dados;
  const email = dados.email.toLowerCase();
  const existente = await tx.candidato.findFirst({
    where: {
      OR: [{ email }, ...(dados.cgc ? [{ cgc: dados.cgc }] : [])],
      ativo: 'S',
    },
  });
  if (existente) {
    // Perfil respondido pelo próprio candidato NÃO é sobrescrito por um valor
    // digitado no cadastro (RN-REC-014): um é medido, o outro é estimativa, e
    // deixar a estimativa vencer apagaria o dado melhor sem ninguém perceber.
    const manterPerfilDoCandidato = existente.perfilCulturalOrigem === 'CANDIDATO';
    const trocaPerfil = !!perfilCultural && !manterPerfilDoCandidato;
    return {
      candidato: await tx.candidato.update({
        where: { codCand: existente.codCand },
        data: {
          nomeCand: dados.nomeCand,
          fone: dados.fone ?? existente.fone,
          cgc: dados.cgc ?? existente.cgc,
          linkedin: dados.linkedin ?? existente.linkedin,
          cidade: dados.cidade ?? existente.cidade,
          cargoAtual: dados.cargoAtual ?? existente.cargoAtual,
          ...(trocaPerfil
            ? {
                perfilCulturalJson: perfilCultural as Prisma.InputJsonValue,
                perfilCulturalOrigem: 'RECRUTADOR',
                perfilCulturalDh: new Date(),
              }
            : {}),
          codUsuAlt: codUsu,
        },
      }),
      deduplicado: true,
    };
  }
  return {
    candidato: await tx.candidato.create({
      data: {
        codTen,
        ...dadosBasicos,
        email,
        perfilCulturalJson: perfilCultural as Prisma.InputJsonValue | undefined,
        ...(perfilCultural ? { perfilCulturalOrigem: 'RECRUTADOR', perfilCulturalDh: new Date() } : {}),
        codUsuInc: codUsu,
      },
    }),
    deduplicado: false,
  };
}

const esquemaConfirmarAdmissao = z.object({
  numCad: z.coerce.bigint(),
  dtAdm: z.coerce.date(),
  vlrSal: z.coerce.number().positive().optional(),
  cgc: z.string().optional(),
  codCar: z.coerce.bigint().optional(),
  codDep: z.coerce.bigint().optional(),
  codCencus: z.coerce.bigint().optional(),
  tipoContrato: z.string().default('CLT'),
});

@Controller()
export class CandidatosController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly funcionariosService: FuncionariosService,
    private readonly email: EmailService,
  ) {}

  // ===== Canais de captação =====
  @Get('canais')
  @Permissoes('recrutamento.candidatos.ler')
  listarCanais(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.canal.findMany({ where: { ativo: 'S' }, orderBy: { codCanal: 'asc' } }),
    );
  }

  /**
   * Funil, qualidade e custo por canal (RN-REC-010).
   *
   * O funil é "chegou ao menos até X", reconstruído da timeline — não do estágio
   * atual. Contando o estágio atual, um canal cujos candidatos foram todos
   * entrevistados e recusados apareceria com zero entrevistas, justamente onde a
   * métrica decide investimento.
   */
  @Get('canais/kpis')
  @Permissoes('recrutamento.candidatos.ler')
  async kpisPorCanal(@Req() req: ReqAut, @Query('dias') dias?: string) {
    const janelaDias = Math.min(Math.max(Number(dias) || 90, 1), 365);
    const desde = new Date(Date.now() - janelaDias * 24 * 60 * 60 * 1000);

    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const canais = await tx.canal.findMany({ where: { ativo: 'S' }, orderBy: { codCanal: 'asc' } });
      const candidaturas = await tx.candidatura.findMany({
        where: { ativo: 'S', dhInc: { gte: desde } },
        select: { codCdt: true, codCanal: true, estagio: true, dhInc: true, knockoutJson: true },
      });

      const codCdts = candidaturas.map((c) => c.codCdt);
      // Duas consultas fixas, não uma por candidatura — a agregação acontece em
      // memória, limitada pela janela (padrão 90 dias).
      const [eventos, matches] = await Promise.all([
        codCdts.length
          ? tx.candidaturaHistorico.findMany({
              where: { codCdt: { in: codCdts }, tipoEvento: 'mudanca_estagio' },
              select: { codCdt: true, estagioNovo: true, dhInc: true },
            })
          : [],
        codCdts.length
          ? tx.matchResumo.findMany({
              where: { codCdt: { in: codCdts } },
              select: { codCdt: true, scoreContratacao: true, scoreGeral: true },
            })
          : [],
      ]);

      // Só as etapas de avanço entram no funil; terminais (rejected, archived...)
      // não são "progresso", são desfecho.
      const ordem = new Map<string, number>(ETAPAS_FUNIL.map((e, i) => [e, i]));
      const alcanceMax = new Map<string, number>();
      const dhContratacao = new Map<string, Date>();
      for (const cdt of candidaturas) {
        alcanceMax.set(cdt.codCdt.toString(), ordem.get(cdt.estagio) ?? -1);
      }
      for (const ev of eventos) {
        const chave = ev.codCdt.toString();
        const pos = ordem.get(ev.estagioNovo ?? '') ?? -1;
        if (pos > (alcanceMax.get(chave) ?? -1)) alcanceMax.set(chave, pos);
        if (ev.estagioNovo === 'hired' && !dhContratacao.has(chave)) dhContratacao.set(chave, ev.dhInc);
      }
      const scorePorCdt = new Map(
        matches.map((m) => [m.codCdt.toString(), m.scoreContratacao ?? m.scoreGeral]),
      );

      return canais.map((canal) => {
        const doCanal = candidaturas.filter((c) => c.codCanal === canal.codCanal);
        const alcancou = (etapa: string) => {
          const alvo = ordem.get(etapa)!;
          return doCanal.filter((c) => (alcanceMax.get(c.codCdt.toString()) ?? -1) >= alvo).length;
        };

        const contratacoes = alcancou('hired');
        const scores = doCanal
          .map((c) => scorePorCdt.get(c.codCdt.toString()))
          .filter((s): s is number => s != null);
        const diasAteContratar = doCanal
          .map((c) => {
            const dh = dhContratacao.get(c.codCdt.toString());
            return dh ? (dh.getTime() - c.dhInc.getTime()) / (24 * 60 * 60 * 1000) : null;
          })
          .filter((d): d is number => d != null);

        // Custo mensal rateado pela janela — sem histórico de custo, o valor de
        // hoje é a melhor estimativa que temos; não inventamos série temporal.
        const custoMes = canal.vlrCustoMes ? Number(canal.vlrCustoMes) : null;
        const custoPeriodo = custoMes == null ? null : arredondar((custoMes * janelaDias) / 30);

        return {
          codCanal: canal.codCanal,
          nomeCanal: canal.nomeCanal,
          tipoCanal: canal.tipoCanal,
          custoMes,
          custoPeriodo,
          candidaturas: doCanal.length,
          triagem: alcancou('screening'),
          entrevistas: alcancou('interview'),
          propostas: alcancou('offer'),
          contratacoes,
          eliminadosTriagem: doCanal.filter((c) => c.estagio === 'knockout' || c.knockoutJson != null).length,
          taxaEntrevista: percentual(alcancou('interview'), doCanal.length),
          taxaContratacao: percentual(contratacoes, doCanal.length),
          qualidadeMedia: scores.length ? arredondar(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
          altaAderencia: scores.filter((s) => s >= 75).length,
          tempoMedioContratacaoDias: diasAteContratar.length
            ? arredondar(diasAteContratar.reduce((a, b) => a + b, 0) / diasAteContratar.length)
            : null,
          custoPorCandidatura: custoPeriodo != null && doCanal.length ? arredondar(custoPeriodo / doCanal.length) : null,
          custoPorContratacao: custoPeriodo != null && contratacoes ? arredondar(custoPeriodo / contratacoes) : null,
        };
      });
    });
  }

  @Post('canais')
  @Permissoes('recrutamento.candidatos.criar')
  criarCanal(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaCanal, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.canal.create({
        data: { codTen: req.usuario.codTen, ...dados, codUsuInc: req.usuario.codUsu },
      }),
    );
  }

  // ===== Banco de talentos =====
  /**
   * Banco de talentos, paginado e buscado no servidor.
   *
   * Antes devolvia a tabela inteira e o filtro era feito no navegador: o mesmo
   * problema de escala já corrigido na lista de candidaturas da vaga, que aqui
   * tinha passado batido. Com alguns milhares de talentos a tela travava e a
   * resposta carregava, junto, todas as candidaturas de cada um.
   *
   * Resposta em `{itens, total, pagina, tamanhoPagina}` — mesmo formato de
   * `GET /vagas/:codVag/candidaturas`, para haver um só contrato de lista.
   */
  @Get('candidatos')
  @Permissoes('recrutamento.candidatos.ler')
  async listarCandidatos(@Req() req: ReqAut, @Query() consulta: unknown) {
    const { pagina, tamanhoPagina, busca } = validar(esquemaListaCandidatos, consulta);
    const termo = busca?.trim();

    const where: Prisma.CandidatoWhereInput = {
      ativo: 'S',
      ...(termo
        ? {
            OR: [
              { nomeCand: { contains: termo, mode: 'insensitive' as const } },
              { email: { contains: termo, mode: 'insensitive' as const } },
              { cidade: { contains: termo, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const [total, itens] = await Promise.all([
        tx.candidato.count({ where }),
        tx.candidato.findMany({
          where,
          orderBy: { codCand: 'desc' },
          skip: (pagina - 1) * tamanhoPagina,
          take: tamanhoPagina,
          select: {
            codCand: true,
            nomeCand: true,
            email: true,
            fone: true,
            cidade: true,
            cargoAtual: true,
            dhInc: true,
            candidaturas: {
              where: { ativo: 'S' },
              orderBy: { codCdt: 'desc' },
              select: { codCdt: true, estagio: true, vaga: { select: { codVag: true, titulo: true } } },
            },
          },
        }),
      ]);
      return { itens, total, pagina, tamanhoPagina };
    });
  }

  /** Cadastro rápido com dedup por e-mail/CPF (RN-REC-009). */
  @Post('candidatos')
  @Permissoes('recrutamento.candidatos.criar')
  criarCandidato(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaCandidato, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const { candidato, deduplicado } = await upsertCandidato(
        tx, req.usuario.codTen, req.usuario.codUsu, dados,
      );
      return { codCand: candidato.codCand, nomeCand: candidato.nomeCand, deduplicado };
    });
  }

  // ===== Candidaturas =====
  /** Registra candidatura: dedup de candidato + única por vaga+candidato + idempotência por canal+idExterno. */
  @Post('vagas/:codVag/candidaturas')
  @Permissoes('recrutamento.candidatos.criar')
  candidatar(@Req() req: ReqAut, @Param('codVag') codVag: string, @Body() corpo: unknown) {
    const dados = validar(esquemaCandidatura, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const vaga = await tx.vaga.findFirst({
        where: { codVag: BigInt(codVag), ativo: 'S' },
        include: { perguntas: { where: { ativo: 'S' } }, requisitos: { where: { ativo: 'S' } } },
      });
      if (!vaga) throw new BadRequestException('Vaga inexistente neste tenant');
      if (vaga.status !== 'ABERTA') {
        throw new BadRequestException(`Vaga ${vaga.status} não recebe candidaturas`);
      }
      const canal = await tx.canal.findFirst({ where: { codCanal: dados.codCanal, ativo: 'S' } });
      if (!canal) throw new BadRequestException('Canal de captação inexistente');

      // Idempotência por (canal, idExterno) — RN-REC-009
      if (dados.idExterno) {
        const repetida = await tx.candidatura.findFirst({
          where: { codCanal: dados.codCanal, idExterno: dados.idExterno },
        });
        if (repetida) return { codCdt: repetida.codCdt, estagio: repetida.estagio, idempotente: true };
      }

      const { candidato } = await upsertCandidato(
        tx, req.usuario.codTen, req.usuario.codUsu, dados.candidato,
      );

      // Única por vaga+candidato — reentrada atualiza origem (RN-REC-003)
      const existente = await tx.candidatura.findUnique({
        where: { codVag_codCand: { codVag: vaga.codVag, codCand: candidato.codCand } },
      });
      if (existente) {
        await tx.candidaturaHistorico.create({
          data: {
            codTen: req.usuario.codTen,
            codCdt: existente.codCdt,
            tipoEvento: 'reentrada_canal',
            metadadosJson: { codCanal: dados.codCanal.toString(), idExterno: dados.idExterno ?? null },
            tipoAtor: 'usuario',
            codUsuInc: req.usuario.codUsu,
          },
        });
        return { codCdt: existente.codCdt, estagio: existente.estagio, reentrada: true };
      }

      const respostas = (dados.respostas as Record<string, unknown>) ?? {};
      const sinal = avaliarSinalizacaoKnockout(vaga.perguntas, respostas);

      const candidatura = await tx.candidatura.create({
        data: {
          codTen: req.usuario.codTen,
          codVag: vaga.codVag,
          codCand: candidato.codCand,
          codCanal: dados.codCanal,
          idExterno: dados.idExterno,
          respostasJson: (dados.respostas as Prisma.InputJsonValue) ?? undefined,
          knockoutJson: (sinal as unknown as Prisma.InputJsonValue) ?? undefined,
          autoavaliacaoJson: (dados.autoavaliacao as Prisma.InputJsonValue) ?? undefined,
          codUsuInc: req.usuario.codUsu,
        },
      });

      // RN-REC-006: match determinístico — calculado uma vez, na criação, sem IA.
      const autoavaliacoes = (dados.autoavaliacao ?? {}) as Record<string, AutoavaliacaoResp>;
      // Vaga sem cultura própria herda a da empresa (RN-REC-014) — mesmo
      // fallback do Padrão Comportamental. Sem isso, cadastrar a cultura da
      // empresa não mudaria nada até alguém preencher vaga por vaga.
      const culturaEmpresa = await tx.culturaPadraoEmpresa.findFirst({
        where: { codTen: req.usuario.codTen },
        select: { perfilJson: true },
      });
      const perfilIdeal =
        (vaga.perfilCulturalIdealJson as PerfilCultural | null) ??
        ((culturaEmpresa?.perfilJson as PerfilCultural | null) ?? null);
      const perfilCandidato = (candidato.perfilCulturalJson as PerfilCultural | null) ?? null;
      const requisitosScoring = vaga.requisitos.map((r) => ({
        codVagReq: r.codVagReq.toString(),
        descrReq: r.descrReq,
        tipoReq: r.tipoReq as 'OBRIGATORIO' | 'DESEJAVEL',
        peso: r.peso,
        nivelEsperado: r.nivelEsperado,
        tempoEspMeses: r.tempoEspMeses,
      }));
      const resultadoMatch = calcularMatch({
        requisitos: requisitosScoring,
        autoavaliacoes,
        perfilIdeal,
        perfilCandidato,
      });
      if (resultadoMatch) {
        const versaoMatch = 'v1';
        await tx.matchResumo.create({
          data: {
            codTen: req.usuario.codTen,
            codCdt: candidatura.codCdt,
            versaoMatch,
            ...resultadoMatch,
            hashEntrada: calcularHashEntrada({
              requisitos: requisitosScoring,
              autoavaliacoes,
              perfilIdeal,
              perfilCandidato,
              versaoMatch,
            }),
          },
        });
      }
      await tx.candidaturaHistorico.create({
        data: {
          codTen: req.usuario.codTen,
          codCdt: candidatura.codCdt,
          tipoEvento: 'candidatura_recebida',
          estagioNovo: 'applied',
          rotuloPub: 'Candidatura recebida',
          tipoAtor: 'usuario',
          metadadosJson: { canal: canal.nomeCanal },
          codUsuInc: req.usuario.codUsu,
        },
      });
      if (sinal) {
        await tx.candidaturaHistorico.create({
          data: {
            codTen: req.usuario.codTen,
            codCdt: candidatura.codCdt,
            tipoEvento: 'sinalizacao_knockout',
            notaInterna: `Resposta eliminatória em "${sinal.pergunta}" — sinalização automática, decisão final é do recrutador.`,
            tipoAtor: 'sistema',
            metadadosJson: sinal as unknown as Prisma.InputJsonValue,
          },
        });
      }
      return { codCdt: candidatura.codCdt, codCand: candidato.codCand, estagio: 'applied', sinalizadoKnockout: !!sinal };
    });
  }

  /**
   * Lista paginada/ordenada/filtrada no servidor (RN-REC-011) — antes trazia
   * tudo de uma vez, o que não escala pra vagas com centenas de candidaturas.
   * Usada tanto pela lista principal (página inteira) quanto pelo Kanban
   * (uma chamada por coluna, filtrando por `estagio`).
   */
  @Get('vagas/:codVag/candidaturas')
  @Permissoes('recrutamento.candidatos.ler')
  async listarCandidaturas(@Req() req: ReqAut, @Param('codVag') codVag: string, @Query() query: unknown) {
    const dados = validar(esquemaListaCandidaturas, query);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const where: Prisma.CandidaturaWhereInput = { codVag: BigInt(codVag), ativo: 'S' };
      if (dados.estagio) {
        const estagios = dados.estagio.split(',').map((e) => e.trim());
        where.estagio = estagios.length === 1 ? estagios[0] : { in: estagios };
      }
      if (dados.busca) {
        where.candidato = {
          OR: [
            { nomeCand: { contains: dados.busca, mode: 'insensitive' } },
            { email: { contains: dados.busca, mode: 'insensitive' } },
          ],
        };
      }
      if (dados.aderenciaMin != null || dados.aderenciaMax != null) {
        where.match = {
          scoreContratacao: {
            ...(dados.aderenciaMin != null ? { gte: dados.aderenciaMin } : {}),
            ...(dados.aderenciaMax != null ? { lte: dados.aderenciaMax } : {}),
          },
        };
      }

      // RN-REC-016: filtros pelos campos estruturados. Acumulam no mesmo
      // `where.candidato` para conviverem com a busca textual acima.
      const filtroCandidato: Prisma.CandidatoWhereInput = (where.candidato as Prisma.CandidatoWhereInput) ?? {};
      if (dados.pretensaoMax != null) {
        // Quem não informou pretensão **não** é excluído: ausência de dado não
        // é motivo para sumir da lista — o recrutador precisa vê-lo para pedir.
        filtroCandidato.AND = [
          ...((filtroCandidato.AND as Prisma.CandidatoWhereInput[]) ?? []),
          { OR: [{ pretensaoSalarial: { lte: dados.pretensaoMax } }, { pretensaoSalarial: null }] },
        ];
      }
      if (dados.dispTipo) filtroCandidato.dispTipo = dados.dispTipo;
      if (dados.formacaoMin) {
        // Só formação CONCLUÍDA conta, no nível pedido ou acima.
        const aceitos = NIVEIS_FORMACAO.filter((n) => ordemNivel(n) >= ordemNivel(dados.formacaoMin!));
        filtroCandidato.formacoes = { some: { situacao: 'CONCLUIDO', nivel: { in: [...aceitos] } } };
      }
      if (dados.tags) {
        // Todas as etiquetas pedidas, não qualquer uma: filtrar por "inglês" e
        // "sênior" e receber quem tem só uma delas não é o que se pediu.
        const codTags = dados.tags.split(',').map((t) => BigInt(t.trim())).filter(Boolean);
        filtroCandidato.AND = [
          ...((filtroCandidato.AND as Prisma.CandidatoWhereInput[]) ?? []),
          ...codTags.map((codTag) => ({ tags: { some: { codTag, ativo: 'S' } } })),
        ];
      }
      if (Object.keys(filtroCandidato).length > 0) where.candidato = filtroCandidato;
      // Favorito é por usuário: o filtro só enxerga os do próprio recrutador.
      if (dados.favoritos === 'S') {
        where.favoritas = { some: { codUsu: req.usuario.codUsu, ativo: 'S' } };
      }

      const [itens, total] = await Promise.all([
        tx.candidatura.findMany({
          where,
          orderBy: ordenarPorParaOrderBy(dados.ordenar),
          skip: (dados.pagina - 1) * dados.tamanhoPagina,
          take: dados.tamanhoPagina,
          select: {
            codCdt: true,
            estagio: true,
            dhInc: true,
            codFun: true,
            knockoutJson: true,
            candidato: {
              select: {
                codCand: true, nomeCand: true, email: true, cidade: true, cargoAtual: true,
                tags: { where: { ativo: 'S' }, select: { tag: { select: { codTag: true, nome: true, cor: true } } } },
              },
            },
            // Só o favorito de quem está olhando: favorito é marca pessoal.
            favoritas: { where: { codUsu: req.usuario.codUsu, ativo: 'S' }, select: { codFav: true } },
            canal: { select: { nomeCanal: true } },
            match: {
              select: { scoreGeral: true, scoreContratacao: true, scoreCultura: true, driverPrincipal: true, qtdGapsCrit: true },
            },
            processoAdmissao: { select: { status: true } },
            convitesComportamentais: {
              orderBy: { codConv: 'desc' },
              take: 1,
              select: {
                tokenPub: true,
                status: true,
                sessao: {
                  select: {
                    dhConclusao: true,
                    resultado: {
                      select: {
                        indicadorConsistencia: true,
                        aderencias: { select: { aderenciaGeral: true }, take: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        tx.candidatura.count({ where }),
      ]);

      return { itens, total, pagina: dados.pagina, tamanhoPagina: dados.tamanhoPagina };
    });
  }

  /** Detalhe completo de uma candidatura — alimenta o painel de detalhe do candidato no pipeline. */
  @Get('candidaturas/:codCdt')
  @Permissoes('recrutamento.candidatos.ler')
  detalheCandidatura(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cdt = await tx.candidatura.findFirst({
        where: { codCdt: BigInt(codCdt), ativo: 'S' },
        include: {
          candidato: {
            include: {
              curriculos: { orderBy: { codCandCv: 'desc' }, take: 1, select: { textoExtraido: true, dhInc: true } },
              formacoes: { orderBy: { codFor: 'asc' } },
            },
          },
          canal: { select: { nomeCanal: true } },
          vaga: { select: { codVag: true, titulo: true, perfilCulturalIdealJson: true, requisitos: true } },
          match: true,
          processoAdmissao: { select: { status: true } },
        },
      });
      if (!cdt) throw new BadRequestException('Candidatura inexistente neste tenant');

      // Situação consolidada: o Resumo precisa responder "em que pé está isto"
      // sem obrigar o recrutador a abrir quatro abas para descobrir.
      const [convite, analise, ultimaMudanca, culturaEmpresa] = await Promise.all([
        tx.conviteComportamental.findFirst({
          where: { codCdt: cdt.codCdt },
          orderBy: { codConv: 'desc' },
          select: { status: true, sessao: { select: { dhConclusao: true, resultado: { select: { codResult: true } } } } },
        }),
        tx.iAAnaliseCandidatura.findFirst({
          where: { codCdt: cdt.codCdt, status: 'OK' },
          orderBy: { codIaAnalise: 'desc' },
          select: { dhInc: true },
        }),
        tx.candidaturaHistorico.findFirst({
          where: { codCdt: cdt.codCdt, tipoEvento: 'mudanca_estagio' },
          orderBy: { codCdtHis: 'desc' },
          select: { dhInc: true },
        }),
        tx.culturaPadraoEmpresa.findFirst({ where: { codTen: req.usuario.codTen }, select: { perfilJson: true } }),
      ]);

      // Qual perfil ideal vale para esta vaga, e de onde veio. Sem dizer a
      // origem, o recrutador não sabe se está olhando a cultura desta vaga ou
      // a da empresa inteira.
      const culturaEfetiva = cdt.vaga.perfilCulturalIdealJson
        ? { perfil: cdt.vaga.perfilCulturalIdealJson, origem: 'VAGA' as const }
        : culturaEmpresa
          ? { perfil: culturaEmpresa.perfilJson, origem: 'EMPRESA' as const }
          : { perfil: null, origem: null };

      const curriculo = cdt.candidato.curriculos[0] ?? null;
      const desde = ultimaMudanca?.dhInc ?? cdt.dhInc;
      const situacao = {
        diasNaEtapa: Math.floor((Date.now() - desde.getTime()) / (24 * 60 * 60 * 1000)),
        dhNaEtapaDesde: desde,
        curriculo: curriculo ? { dhInc: curriculo.dhInc, temTexto: !!curriculo.textoExtraido } : null,
        comportamental: convite
          ? {
              status: convite.status,
              concluida: !!convite.sessao?.resultado,
              dhConclusao: convite.sessao?.dhConclusao ?? null,
            }
          : null,
        analise: analise ? { dhInc: analise.dhInc } : null,
      };

      const autoavaliacoes = (cdt.autoavaliacaoJson as Record<string, AutoavaliacaoResp> | null) ?? {};

      // Mesma função que monta o dossiê da IA (RN-REC-013): aqui ela serve o
      // Resumo sem IA nenhuma — é busca de texto no currículo, determinística e
      // conferível pelo recrutador.
      const evidencias = montarEvidencias(
        cdt.vaga.requisitos.map((r) => ({ descrReq: r.descrReq, tipoReq: r.tipoReq })),
        curriculo?.textoExtraido ?? null,
      );
      const requisitosAvaliados = cdt.vaga.requisitos.map((r, i) => {
        const resp = autoavaliacoes[r.codVagReq.toString()];
        return {
          // Onde o currículo sustenta (ou não) este requisito.
          evidenciaCurriculo: evidencias[i]?.trecho ?? null,
          codVagReq: r.codVagReq,
          descrReq: r.descrReq,
          tipoReq: r.tipoReq,
          peso: r.peso,
          nivelEsperado: r.nivelEsperado,
          tempoEspMeses: r.tempoEspMeses,
          nivelInformado: resp?.nivel ?? null,
          tempoInformado: resp?.tempoMeses ?? null,
          evidenciaTexto: resp?.evidenciaTexto ?? null,
          scorePct: Math.round(
            calcularScoreRequisito(
              {
                codVagReq: r.codVagReq.toString(),
                descrReq: r.descrReq,
                tipoReq: r.tipoReq as 'OBRIGATORIO' | 'DESEJAVEL',
                peso: r.peso,
                nivelEsperado: r.nivelEsperado,
                tempoEspMeses: r.tempoEspMeses,
              },
              resp,
            ) * 100,
          ),
        };
      });

      // Rótulo pronto: a regra de como ler disponibilidade mora no backend,
      // para a tela não reimplementá-la de outro jeito.
      return {
        ...cdt,
        requisitosAvaliados,
        situacao,
        culturaEfetiva,
        disponibilidadeRotulo: rotuloDisponibilidade(cdt.candidato),
      };
    });
  }

  /** Move a candidatura de estágio, gravando a timeline (RN-REC-005). Transições são humanas. */
  @Patch('candidaturas/:codCdt/estagio')
  @Permissoes('recrutamento.candidatos.criar')
  moverEstagio(@Req() req: ReqAut, @Param('codCdt') codCdt: string, @Body() corpo: unknown) {
    const dados = validar(
      z.object({ estagio: z.enum(ESTAGIOS), nota: z.string().optional() }),
      corpo,
    );
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cdt = await tx.candidatura.findFirst({ where: { codCdt: BigInt(codCdt), ativo: 'S' } });
      if (!cdt) throw new BadRequestException('Candidatura inexistente neste tenant');
      if (cdt.estagio === dados.estagio) return { codCdt: cdt.codCdt, estagio: cdt.estagio };

      const atualizada = await tx.candidatura.update({
        where: { codCdt: cdt.codCdt },
        data: { estagio: dados.estagio, codUsuAlt: req.usuario.codUsu },
        select: { codCdt: true, estagio: true },
      });
      await tx.candidaturaHistorico.create({
        data: {
          codTen: req.usuario.codTen,
          codCdt: cdt.codCdt,
          tipoEvento: 'mudanca_estagio',
          estagioAnt: cdt.estagio,
          estagioNovo: dados.estagio,
          notaInterna: dados.nota,
          tipoAtor: 'usuario',
          codUsuInc: req.usuario.codUsu,
        },
      });
      return atualizada;
    });
  }

  /**
   * Gera (ou devolve) o link do portal de acompanhamento do candidato.
   * Sob demanda, para não criar token em candidatura que ninguém vai acompanhar.
   */
  @Post('candidaturas/:codCdt/link-acompanhamento')
  @Permissoes('recrutamento.candidatos.ler')
  linkAcompanhamento(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cdt = await tx.candidatura.findFirst({ where: { codCdt: BigInt(codCdt), ativo: 'S' } });
      if (!cdt) throw new BadRequestException('Candidatura inexistente neste tenant');
      if (cdt.tokenPub) return { tokenPub: cdt.tokenPub };

      const atualizada = await tx.candidatura.update({
        where: { codCdt: cdt.codCdt },
        data: { tokenPub: randomBytes(24).toString('hex') },
        select: { tokenPub: true },
      });
      return { tokenPub: atualizada.tokenPub };
    });
  }

  /**
   * Envia o link do portal por e-mail (RN-SX-001), em uma candidatura ou em lote.
   *
   * É o que faltava para o portal existir de verdade: até aqui o recrutador
   * copiava o link de um alerta e colava à mão, um por um.
   */
  @Post('candidaturas/enviar-portal')
  @Permissoes('recrutamento.candidatos.criar')
  async enviarPortal(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(z.object({ codCdts: z.array(z.coerce.bigint()).min(1).max(200) }), corpo);
    const codTen = req.usuario.codTen;

    const candidaturas = await this.prisma.executarNoTenant(codTen, async (tx) => {
      const lista = await tx.candidatura.findMany({
        where: { codCdt: { in: dados.codCdts }, ativo: 'S' },
        include: {
          candidato: { select: { nomeCand: true, email: true } },
          vaga: { select: { titulo: true, empresa: { select: { nomeFantasia: true } } } },
        },
      });
      // Gera o token de quem ainda não tem: enviar exige link, e o link é o token.
      for (const c of lista.filter((x) => !x.tokenPub)) {
        const token = randomBytes(24).toString('hex');
        await tx.candidatura.update({ where: { codCdt: c.codCdt }, data: { tokenPub: token } });
        c.tokenPub = token;
      }
      return lista;
    });

    const base = process.env.APP_URL ?? 'http://localhost:3002';
    let enfileirados = 0;
    let repetidos = 0;
    for (const c of candidaturas) {
      const r = await this.email.enfileirar({
        codTen,
        destinatario: c.candidato.email,
        template: 'portal-candidato',
        // Uma mensagem de portal por candidatura: reenviar não duplica.
        chaveIdem: `portal:${c.codCdt}`,
        codUsuInc: req.usuario.codUsu,
        drenarAgora: false,
        dados: {
          nomeCandidato: c.candidato.nomeCand,
          nomeEmpresa: c.vaga.empresa.nomeFantasia,
          tituloVaga: c.vaga.titulo,
          url: `${base}/acompanhar/${c.tokenPub}`,
        },
      });
      if (r.jaExistia) repetidos++;
      else enfileirados++;
    }
    // Um dreno só, depois de enfileirar tudo.
    void this.email.drenar();
    return {
      enfileirados,
      repetidos,
      naoEncontrados: dados.codCdts.length - candidaturas.length,
      smtpConfigurado: this.email.configurado(),
    };
  }

  /** Ações em massa (mover etapa/reprovar/arquivar são a mesma rota, só muda o estágio-alvo). */
  @Patch('vagas/:codVag/candidaturas/mover-estagio-lote')
  @Permissoes('recrutamento.candidatos.criar')
  moverEstagioLote(@Req() req: ReqAut, @Param('codVag') codVag: string, @Body() corpo: unknown) {
    const dados = validar(
      z.object({ codCdts: z.array(z.coerce.bigint()).min(1).max(500), estagio: z.enum(ESTAGIOS), nota: z.string().optional() }),
      corpo,
    );
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const candidaturas = await tx.candidatura.findMany({
        where: { codCdt: { in: dados.codCdts }, codVag: BigInt(codVag), ativo: 'S' },
      });
      let movidas = 0;
      for (const cdt of candidaturas) {
        if (cdt.estagio === dados.estagio) continue;
        await tx.candidatura.update({
          where: { codCdt: cdt.codCdt },
          data: { estagio: dados.estagio, codUsuAlt: req.usuario.codUsu },
        });
        await tx.candidaturaHistorico.create({
          data: {
            codTen: req.usuario.codTen,
            codCdt: cdt.codCdt,
            tipoEvento: 'mudanca_estagio',
            estagioAnt: cdt.estagio,
            estagioNovo: dados.estagio,
            notaInterna: dados.nota,
            tipoAtor: 'usuario',
            codUsuInc: req.usuario.codUsu,
          },
        });
        movidas++;
      }
      return { encontradas: candidaturas.length, movidas };
    });
  }

  /**
   * RN-REC-007: rascunho de admissão pré-preenchido com dados do candidato e da
   * vaga — o RH revisa e confirma em `POST .../confirmar-admissao`. Nunca cria
   * o funcionário sozinho; Recrutamento não duplica a lógica do Core (ver
   * "09 - Módulos/README.md" — fronteiras entre módulos), só chama o serviço.
   */
  @Get('candidaturas/:codCdt/proposta-admissao')
  @Permissoes('recrutamento.candidatos.ler')
  propostaAdmissao(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cdt = await tx.candidatura.findFirst({
        where: { codCdt: BigInt(codCdt), ativo: 'S' },
        include: { candidato: true, vaga: true },
      });
      if (!cdt) throw new BadRequestException('Candidatura inexistente neste tenant');
      if (cdt.estagio !== 'hired') {
        throw new BadRequestException('Candidatura precisa estar no estágio "hired" para propor admissão');
      }
      if (cdt.codFun) throw new BadRequestException(`Já admitido (CODFUN ${cdt.codFun})`);

      return {
        codCdt: cdt.codCdt,
        nomeFun: cdt.candidato.nomeCand,
        // O funcionário herda o e-mail do candidato: é o único endereço que a
        // plataforma conhece, e sem ele não há como mandar documento para assinar.
        email: cdt.candidato.email,
        cgc: cdt.candidato.cgc,
        codEmp: cdt.vaga.codEmp,
        codCar: cdt.vaga.codCar,
        codDep: cdt.vaga.codDep,
        tipoContrato: cdt.vaga.tipoContrato ?? 'CLT',
        vlrSalSugerido: cdt.vaga.vlrSalMin && cdt.vaga.vlrSalMax
          ? (Number(cdt.vaga.vlrSalMin) + Number(cdt.vaga.vlrSalMax)) / 2
          : cdt.vaga.vlrSalMin ?? cdt.vaga.vlrSalMax ?? null,
      };
    });
  }

  /** Confirma a admissão: cria o funcionário no Core (via FuncionariosService) e vincula a candidatura. */
  @Post('candidaturas/:codCdt/confirmar-admissao')
  @Permissoes('core.funcionarios.criar')
  confirmarAdmissao(@Req() req: ReqAut, @Param('codCdt') codCdt: string, @Body() corpo: unknown) {
    const dados = validar(esquemaConfirmarAdmissao, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cdt = await tx.candidatura.findFirst({
        where: { codCdt: BigInt(codCdt), ativo: 'S' },
        include: { candidato: true, vaga: true },
      });
      if (!cdt) throw new BadRequestException('Candidatura inexistente neste tenant');
      if (cdt.estagio !== 'hired') {
        throw new BadRequestException('Candidatura precisa estar no estágio "hired" para confirmar admissão');
      }
      if (cdt.codFun) throw new BadRequestException(`Já admitido (CODFUN ${cdt.codFun})`);

      const funcionario = await this.funcionariosService.admitir(tx, req.usuario.codTen, req.usuario.codUsu, {
        codEmp: cdt.vaga.codEmp,
        numCad: dados.numCad,
        nomeFun: cdt.candidato.nomeCand,
        cgc: dados.cgc ?? cdt.candidato.cgc ?? undefined,
        dtAdm: dados.dtAdm,
        codCar: dados.codCar ?? cdt.vaga.codCar ?? undefined,
        codDep: dados.codDep ?? cdt.vaga.codDep ?? undefined,
        codCencus: dados.codCencus,
        tipoContrato: dados.tipoContrato,
        vlrSal: dados.vlrSal,
      });

      await tx.candidatura.update({
        where: { codCdt: cdt.codCdt },
        data: { codFun: funcionario.codFun, codUsuAlt: req.usuario.codUsu },
      });
      await tx.candidaturaHistorico.create({
        data: {
          codTen: req.usuario.codTen,
          codCdt: cdt.codCdt,
          tipoEvento: 'admissao_confirmada',
          rotuloPub: 'Admissão confirmada',
          tipoAtor: 'usuario',
          metadadosJson: { codFun: funcionario.codFun.toString(), numCad: dados.numCad.toString() },
          codUsuInc: req.usuario.codUsu,
        },
      });

      return { codCdt: cdt.codCdt, codFun: funcionario.codFun, numCad: funcionario.numCad };
    });
  }

  @Get('candidaturas/:codCdt/timeline')
  @Permissoes('recrutamento.candidatos.ler')
  timeline(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.candidaturaHistorico.findMany({
        where: { codCdt: BigInt(codCdt) },
        orderBy: { codCdtHis: 'asc' },
      }),
    );
  }

  /** Anotações do recrutador — sem tabela nova, é a mesma timeline com tipoEvento='anotacao'. */
  @Get('candidaturas/:codCdt/anotacoes')
  @Permissoes('recrutamento.candidatos.ler')
  listarAnotacoes(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.candidaturaHistorico.findMany({
        where: { codCdt: BigInt(codCdt), tipoEvento: 'anotacao' },
        orderBy: { codCdtHis: 'desc' },
      }),
    );
  }

  @Post('candidaturas/:codCdt/anotacoes')
  @Permissoes('recrutamento.candidatos.criar')
  criarAnotacao(@Req() req: ReqAut, @Param('codCdt') codCdt: string, @Body() corpo: unknown) {
    const dados = validar(z.object({ nota: z.string().min(1) }), corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cdt = await tx.candidatura.findFirst({ where: { codCdt: BigInt(codCdt), ativo: 'S' } });
      if (!cdt) throw new BadRequestException('Candidatura inexistente neste tenant');
      return tx.candidaturaHistorico.create({
        data: {
          codTen: req.usuario.codTen,
          codCdt: cdt.codCdt,
          tipoEvento: 'anotacao',
          notaInterna: dados.nota,
          tipoAtor: 'usuario',
          codUsuInc: req.usuario.codUsu,
        },
      });
    });
  }
}
