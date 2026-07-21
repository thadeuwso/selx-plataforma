import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
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

export const ESTAGIOS = [
  'applied', 'screening', 'analysis', 'knockout', 'shortlist', 'interview',
  'offer', 'approved', 'not_selected', 'rejected', 'hired', 'archived',
] as const;

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
    return {
      candidato: await tx.candidato.update({
        where: { codCand: existente.codCand },
        data: {
          nomeCand: dados.nomeCand,
          fone: dados.fone ?? existente.fone,
          cgc: dados.cgc ?? existente.cgc,
          linkedin: dados.linkedin ?? existente.linkedin,
          cidade: dados.cidade ?? existente.cidade,
          perfilCulturalJson: (perfilCultural as Prisma.InputJsonValue) ?? existente.perfilCulturalJson ?? undefined,
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
  ) {}

  // ===== Canais de captação =====
  @Get('canais')
  @Permissoes('recrutamento.candidatos.ler')
  listarCanais(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.canal.findMany({ where: { ativo: 'S' }, orderBy: { codCanal: 'asc' } }),
    );
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
  @Get('candidatos')
  @Permissoes('recrutamento.candidatos.ler')
  listarCandidatos(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.candidato.findMany({
        where: { ativo: 'S' },
        orderBy: { codCand: 'desc' },
        select: {
          codCand: true,
          nomeCand: true,
          email: true,
          fone: true,
          cidade: true,
          dhInc: true,
          _count: { select: { candidaturas: true } },
        },
      }),
    );
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
        include: { perguntas: true, requisitos: true },
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
      const perfilIdeal = (vaga.perfilCulturalIdealJson as PerfilCultural | null) ?? null;
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

  @Get('vagas/:codVag/candidaturas')
  @Permissoes('recrutamento.candidatos.ler')
  listarCandidaturas(@Req() req: ReqAut, @Param('codVag') codVag: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.candidatura.findMany({
        where: { codVag: BigInt(codVag), ativo: 'S' },
        orderBy: { codCdt: 'asc' },
        select: {
          codCdt: true,
          estagio: true,
          dhInc: true,
          codFun: true,
          knockoutJson: true,
          candidato: { select: { codCand: true, nomeCand: true, email: true, cidade: true } },
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
    );
  }

  /** Detalhe completo de uma candidatura — alimenta o painel de detalhe do candidato no pipeline. */
  @Get('candidaturas/:codCdt')
  @Permissoes('recrutamento.candidatos.ler')
  detalheCandidatura(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cdt = await tx.candidatura.findFirst({
        where: { codCdt: BigInt(codCdt), ativo: 'S' },
        include: {
          candidato: true,
          canal: { select: { nomeCanal: true } },
          vaga: { select: { codVag: true, titulo: true, perfilCulturalIdealJson: true, requisitos: true } },
          match: true,
          processoAdmissao: { select: { status: true } },
        },
      });
      if (!cdt) throw new BadRequestException('Candidatura inexistente neste tenant');

      const autoavaliacoes = (cdt.autoavaliacaoJson as Record<string, AutoavaliacaoResp> | null) ?? {};
      const requisitosAvaliados = cdt.vaga.requisitos.map((r) => {
        const resp = autoavaliacoes[r.codVagReq.toString()];
        return {
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

      return { ...cdt, requisitosAvaliados };
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
}
