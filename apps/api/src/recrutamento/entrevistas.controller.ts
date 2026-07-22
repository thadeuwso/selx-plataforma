import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { EmailService } from '../compartilhado/email/email.service';

const TIPOS = ['VIDEO', 'PRESENCIAL', 'TELEFONE'] as const;
const STATUS_ENTREVISTA = ['AGENDADA', 'REALIZADA', 'CANCELADA', 'NAO_COMPARECEU'] as const;

const esquemaHorarios = z.object({
  horarios: z
    .array(
      z.object({
        dhInicio: z.coerce.date(),
        duracaoMin: z.coerce.number().int().min(5).max(480).default(45),
        tipo: z.enum(TIPOS).default('VIDEO'),
        local: z.string().max(200).optional(),
        linkReuniao: z.string().max(500).optional(),
        codUsuEntrev: z.coerce.bigint().optional(),
      }),
    )
    .min(1)
    .max(100),
});

const esquemaAgendar = z.object({
  dhInicio: z.coerce.date(),
  duracaoMin: z.coerce.number().int().min(5).max(480).default(45),
  tipo: z.enum(TIPOS).default('VIDEO'),
  local: z.string().max(200).optional(),
  linkReuniao: z.string().max(500).optional(),
  codUsuEntrev: z.coerce.bigint().optional(),
});

const esquemaAtualizar = z.object({
  status: z.enum(STATUS_ENTREVISTA).optional(),
  parecer: z.string().max(4000).optional(),
  dhInicio: z.coerce.date().optional(),
  linkReuniao: z.string().max(500).optional(),
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
 * Entrevistas (RN-REC-015).
 *
 * O pipeline tinha uma etapa "Entrevista" que não levava a lugar nenhum: a aba
 * da vaga era só a lista de quem estava naquele estágio, sem horário,
 * entrevistador, link ou confirmação. Porte do `Interview`/`InterviewSlot` do
 * SelX 1.0.
 *
 * Dois caminhos, de propósito:
 * - **Agendamento direto**: o recrutador já sabe o horário e marca.
 * - **Grade de horários**: o recrutador abre opções e o candidato escolhe pelo
 *   portal — mata a negociação por e-mail ("pode terça às 14h?"), que é onde o
 *   tempo do recrutador se perde.
 */
@Controller()
export class EntrevistasController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /** Agenda da vaga: entrevistas marcadas e horários ainda livres. */
  @Get('vagas/:codVag/entrevistas')
  @Permissoes('recrutamento.candidatos.ler')
  agenda(@Req() req: ReqAut, @Param('codVag') codVag: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const [entrevistas, horarios] = await Promise.all([
        tx.entrevista.findMany({
          where: { candidatura: { codVag: BigInt(codVag) } },
          orderBy: { dhInicio: 'asc' },
          include: {
            candidatura: { select: { codCdt: true, estagio: true, candidato: { select: { nomeCand: true, email: true } } } },
            entrevistador: { select: { codUsu: true, nomeUsu: true } },
          },
        }),
        tx.entrevistaHorario.findMany({
          where: { codVag: BigInt(codVag), status: 'LIVRE' },
          orderBy: { dhInicio: 'asc' },
        }),
      ]);
      return { entrevistas, horariosLivres: horarios };
    });
  }

  /** Abre horários na grade da vaga. */
  @Post('vagas/:codVag/entrevistas/horarios')
  @Permissoes('recrutamento.candidatos.criar')
  async abrirHorarios(@Req() req: ReqAut, @Param('codVag') codVag: string, @Body() corpo: unknown) {
    const dados = validar(esquemaHorarios, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const vaga = await tx.vaga.findFirst({ where: { codVag: BigInt(codVag), ativo: 'S' } });
      if (!vaga) throw new BadRequestException('Vaga inexistente neste tenant');
      await tx.entrevistaHorario.createMany({
        data: dados.horarios.map((h) => ({
          codTen: req.usuario.codTen,
          codVag: vaga.codVag,
          dhInicio: h.dhInicio,
          duracaoMin: h.duracaoMin,
          tipo: h.tipo,
          local: h.local,
          linkReuniao: h.linkReuniao,
          codUsuEntrev: h.codUsuEntrev,
          codUsuInc: req.usuario.codUsu,
        })),
      });
      return { abertos: dados.horarios.length };
    });
  }

  /** Cancela um horário livre (não mexe em horário já reservado). */
  @Patch('entrevistas/horarios/:codHor/cancelar')
  @Permissoes('recrutamento.candidatos.criar')
  async cancelarHorario(@Req() req: ReqAut, @Param('codHor') codHor: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const alterados = await tx.entrevistaHorario.updateMany({
        where: { codHor: BigInt(codHor), status: 'LIVRE' },
        data: { status: 'CANCELADO' },
      });
      if (alterados.count === 0) {
        throw new BadRequestException('Horário inexistente ou já reservado por um candidato');
      }
      return { ok: true };
    });
  }

  /** Marca a entrevista direto, quando o recrutador já sabe o horário. */
  @Post('candidaturas/:codCdt/entrevistas')
  @Permissoes('recrutamento.candidatos.criar')
  async agendar(@Req() req: ReqAut, @Param('codCdt') codCdt: string, @Body() corpo: unknown) {
    const dados = validar(esquemaAgendar, corpo);
    const resultado = await this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cdt = await tx.candidatura.findFirst({
        where: { codCdt: BigInt(codCdt), ativo: 'S' },
        include: {
          candidato: { select: { nomeCand: true, email: true } },
          vaga: { select: { titulo: true, empresa: { select: { nomeFantasia: true } } } },
        },
      });
      if (!cdt) throw new BadRequestException('Candidatura inexistente neste tenant');

      const entrevista = await tx.entrevista.create({
        data: {
          codTen: req.usuario.codTen,
          codCdt: cdt.codCdt,
          dhInicio: dados.dhInicio,
          duracaoMin: dados.duracaoMin,
          tipo: dados.tipo,
          local: dados.local,
          linkReuniao: dados.linkReuniao,
          codUsuEntrev: dados.codUsuEntrev,
          codUsuInc: req.usuario.codUsu,
        },
      });

      // A entrevista marcada move a candidatura para a etapa — o contrário
      // (mover a etapa criar entrevista) seria adivinhar quando e com quem.
      if (cdt.estagio !== 'interview') {
        await tx.candidatura.update({ where: { codCdt: cdt.codCdt }, data: { estagio: 'interview' } });
        await tx.candidaturaHistorico.create({
          data: {
            codTen: req.usuario.codTen,
            codCdt: cdt.codCdt,
            tipoEvento: 'mudanca_estagio',
            estagioAnt: cdt.estagio,
            estagioNovo: 'interview',
            rotuloPub: 'Entrevista agendada',
            tipoAtor: 'usuario',
            codUsuInc: req.usuario.codUsu,
          },
        });
      }
      return { entrevista, contexto: { cdt } };
    });

    await this.avisarCandidato(req, resultado.entrevista, resultado.contexto.cdt);
    return resultado.entrevista;
  }

  /** Reagenda, cancela ou registra o desfecho e o parecer. */
  @Patch('entrevistas/:codEntrev')
  @Permissoes('recrutamento.candidatos.criar')
  async atualizar(@Req() req: ReqAut, @Param('codEntrev') codEntrev: string, @Body() corpo: unknown) {
    const dados = validar(esquemaAtualizar, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const existente = await tx.entrevista.findFirst({ where: { codEntrev: BigInt(codEntrev) } });
      if (!existente) throw new BadRequestException('Entrevista inexistente neste tenant');

      // Cancelar devolve o horário para a grade: se o candidato tinha escolhido
      // um slot, ele volta a ser oferecido a outra pessoa.
      if (dados.status === 'CANCELADA' && existente.codHor) {
        await tx.entrevistaHorario.updateMany({
          where: { codHor: existente.codHor, status: 'RESERVADO' },
          data: { status: 'LIVRE' },
        });
      }
      return tx.entrevista.update({
        where: { codEntrev: existente.codEntrev },
        data: { ...dados, codUsuAlt: req.usuario.codUsu },
      });
    });
  }

  /** Convida o candidato a escolher um horário da grade. */
  @Post('candidaturas/:codCdt/entrevistas/convite')
  @Permissoes('recrutamento.candidatos.criar')
  async convidarParaEscolher(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    const contexto = await this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cdt = await tx.candidatura.findFirst({
        where: { codCdt: BigInt(codCdt), ativo: 'S' },
        include: {
          candidato: { select: { nomeCand: true, email: true } },
          vaga: { select: { codVag: true, titulo: true, empresa: { select: { nomeFantasia: true } } } },
        },
      });
      if (!cdt) throw new BadRequestException('Candidatura inexistente neste tenant');

      const livres = await tx.entrevistaHorario.count({
        where: { codVag: cdt.vaga.codVag, status: 'LIVRE', dhInicio: { gte: new Date() } },
      });
      if (livres === 0) {
        throw new BadRequestException('Não há horários livres nesta vaga — abra a grade antes de convidar');
      }

      // Convidar exige o token do portal: é por lá que o candidato escolhe.
      let token = cdt.tokenPub;
      if (!token) {
        const { randomBytes } = await import('node:crypto');
        token = randomBytes(24).toString('hex');
        await tx.candidatura.update({ where: { codCdt: cdt.codCdt }, data: { tokenPub: token } });
      }
      return { cdt, token, livres };
    });

    const base = process.env.APP_URL ?? 'http://localhost:3002';
    const envio = await this.email.enfileirar({
      codTen: req.usuario.codTen,
      destinatario: contexto.cdt.candidato.email,
      template: 'entrevista-escolher-horario',
      // Regrava por candidatura: reabrir a grade e reconvidar manda de novo,
      // porque as opções mudaram — diferente de um convite único.
      chaveIdem: `entrevista-convite:${contexto.cdt.codCdt}:${contexto.livres}`,
      codUsuInc: req.usuario.codUsu,
      dados: {
        nomeCandidato: contexto.cdt.candidato.nomeCand,
        nomeEmpresa: contexto.cdt.vaga.empresa.nomeFantasia,
        tituloVaga: contexto.cdt.vaga.titulo,
        url: `${base}/acompanhar/${contexto.token}`,
        totalPerguntas: contexto.livres,
      },
    });
    return { horariosLivres: contexto.livres, emailEnfileirado: !envio.jaExistia };
  }

  /** Avisa o candidato do horário marcado. Falha aqui não desfaz a entrevista. */
  private async avisarCandidato(
    req: ReqAut,
    entrevista: { codEntrev: bigint; dhInicio: Date; tipo: string; local: string | null; linkReuniao: string | null },
    cdt: {
      candidato: { nomeCand: string; email: string };
      vaga: { titulo: string; empresa: { nomeFantasia: string } };
    },
  ) {
    const base = process.env.APP_URL ?? 'http://localhost:3002';
    await this.email.enfileirar({
      codTen: req.usuario.codTen,
      destinatario: cdt.candidato.email,
      template: 'entrevista-confirmada',
      chaveIdem: `entrevista:${entrevista.codEntrev}`,
      codUsuInc: req.usuario.codUsu,
      dados: {
        nomeCandidato: cdt.candidato.nomeCand,
        nomeEmpresa: cdt.vaga.empresa.nomeFantasia,
        tituloVaga: cdt.vaga.titulo,
        url: entrevista.linkReuniao || base,
        dhEntrevista: entrevista.dhInicio,
        tipoEntrevista: entrevista.tipo,
        localEntrevista: entrevista.local ?? undefined,
      },
    });
  }
}
