import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { randomBytes } from 'node:crypto';
import { ZodError, z } from 'zod';
import { Permissoes, Publico, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { EmailService } from '../compartilhado/email/email.service';

const esquemaProposta = z.object({
  vlrSalario: z.coerce.number().positive().max(9999999),
  dtInicio: z.coerce.date().optional(),
  tipoContrato: z.string().max(60).optional(),
  beneficios: z.string().max(2000).optional(),
  observacoes: z.string().max(2000).optional(),
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
 * Proposta ao candidato (RN-REC-018).
 *
 * A etapa "Proposta" existia no pipeline e não fazia nada — o recrutador
 * arrastava o card e o sistema parava de ajudar exatamente onde a contratação
 * acontece. Agora a proposta tem valor, data de início, envio e resposta do
 * candidato, que aceita ou recusa pelo portal.
 *
 * **O aviso de encerramento nunca sai sozinho.** Reprovar é ação corriqueira
 * (inclusive em lote) e mandar recusa por acidente é irreversível — não dá para
 * "despedir" um e-mail. Avisar é uma ação separada, explícita, com confirmação.
 */
@Controller()
export class PropostasController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /** Propostas da candidatura, da mais recente para a mais antiga. */
  @Get('candidaturas/:codCdt/propostas')
  @Permissoes('recrutamento.candidatos.ler')
  listar(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.proposta.findMany({ where: { codCdt: BigInt(codCdt) }, orderBy: { codProp: 'desc' } }),
    );
  }

  /** Cria e envia a proposta — o candidato recebe o link para responder. */
  @Post('candidaturas/:codCdt/propostas')
  @Permissoes('recrutamento.candidatos.criar')
  async criar(@Req() req: ReqAut, @Param('codCdt') codCdt: string, @Body() corpo: unknown) {
    const dados = validar(esquemaProposta, corpo);
    const resultado = await this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cdt = await tx.candidatura.findFirst({
        where: { codCdt: BigInt(codCdt), ativo: 'S' },
        include: {
          candidato: { select: { nomeCand: true, email: true } },
          vaga: { select: { titulo: true, empresa: { select: { nomeFantasia: true } } } },
        },
      });
      if (!cdt) throw new BadRequestException('Candidatura inexistente neste tenant');

      const pendente = await tx.proposta.findFirst({
        where: { codCdt: cdt.codCdt, status: 'ENVIADA' },
      });
      // Duas propostas abertas ao mesmo tempo deixariam o candidato sem saber
      // qual vale. Para renegociar, cancela-se a anterior primeiro.
      if (pendente) {
        throw new BadRequestException('Já existe uma proposta aguardando resposta. Cancele-a antes de enviar outra.');
      }

      const proposta = await tx.proposta.create({
        data: {
          codTen: req.usuario.codTen,
          codCdt: cdt.codCdt,
          ...dados,
          status: 'ENVIADA',
          tokenPub: randomBytes(24).toString('hex'),
          dhEnvio: new Date(),
          codUsuInc: req.usuario.codUsu,
        },
      });

      if (cdt.estagio !== 'offer') {
        await tx.candidatura.update({ where: { codCdt: cdt.codCdt }, data: { estagio: 'offer' } });
        await tx.candidaturaHistorico.create({
          data: {
            codTen: req.usuario.codTen,
            codCdt: cdt.codCdt,
            tipoEvento: 'mudanca_estagio',
            estagioAnt: cdt.estagio,
            estagioNovo: 'offer',
            rotuloPub: 'Proposta enviada',
            tipoAtor: 'usuario',
            codUsuInc: req.usuario.codUsu,
          },
        });
      }
      return { proposta, cdt };
    });

    const base = process.env.APP_URL ?? 'http://localhost:3002';
    await this.email.enfileirar({
      codTen: req.usuario.codTen,
      destinatario: resultado.cdt.candidato.email,
      template: 'proposta-recebida',
      chaveIdem: `proposta:${resultado.proposta.codProp}`,
      codUsuInc: req.usuario.codUsu,
      dados: {
        nomeCandidato: resultado.cdt.candidato.nomeCand,
        nomeEmpresa: resultado.cdt.vaga.empresa.nomeFantasia,
        tituloVaga: resultado.cdt.vaga.titulo,
        url: `${base}/proposta/${resultado.proposta.tokenPub}`,
        vlrSalario: Number(resultado.proposta.vlrSalario),
        dtInicio: resultado.proposta.dtInicio ?? undefined,
        tipoContrato: resultado.proposta.tipoContrato ?? undefined,
      },
    });
    return resultado.proposta;
  }

  @Patch('propostas/:codProp/cancelar')
  @Permissoes('recrutamento.candidatos.criar')
  async cancelar(@Req() req: ReqAut, @Param('codProp') codProp: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      // Só cancela o que ainda está aberto: proposta respondida é histórico.
      const r = await tx.proposta.updateMany({
        where: { codProp: BigInt(codProp), status: 'ENVIADA' },
        data: { status: 'CANCELADA', codUsuAlt: req.usuario.codUsu },
      });
      if (r.count === 0) throw new BadRequestException('Proposta inexistente ou já respondida');
      return { ok: true };
    });
  }

  /**
   * Avisa o candidato de que o processo dele terminou.
   *
   * Ação explícita, nunca automática — e por isso não vive junto do "mover para
   * reprovado". Idempotente por candidatura: reprovar duas vezes não manda dois
   * e-mails.
   */
  @Post('candidaturas/:codCdt/avisar-encerramento')
  @Permissoes('recrutamento.candidatos.criar')
  async avisarEncerramento(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    const cdt = await this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const c = await tx.candidatura.findFirst({
        where: { codCdt: BigInt(codCdt), ativo: 'S' },
        include: {
          candidato: { select: { nomeCand: true, email: true } },
          vaga: { select: { titulo: true, empresa: { select: { nomeFantasia: true } } } },
        },
      });
      if (!c) throw new BadRequestException('Candidatura inexistente neste tenant');
      return c;
    });

    const encerrados = ['not_selected', 'rejected', 'knockout', 'archived'];
    if (!encerrados.includes(cdt.estagio)) {
      throw new BadRequestException(
        'A candidatura ainda está em andamento. Mova para uma etapa de encerramento antes de avisar.',
      );
    }

    const base = process.env.APP_URL ?? 'http://localhost:3002';
    const envio = await this.email.enfileirar({
      codTen: req.usuario.codTen,
      destinatario: cdt.candidato.email,
      template: 'processo-encerrado',
      chaveIdem: `encerramento:${cdt.codCdt}`,
      codUsuInc: req.usuario.codUsu,
      dados: {
        nomeCandidato: cdt.candidato.nomeCand,
        nomeEmpresa: cdt.vaga.empresa.nomeFantasia,
        tituloVaga: cdt.vaga.titulo,
        url: cdt.tokenPub ? `${base}/acompanhar/${cdt.tokenPub}` : base,
      },
    });
    return { enfileirado: !envio.jaExistia, jaAvisado: envio.jaExistia };
  }

  // ===== Portal do candidato: ver e responder a proposta =====

  @Publico()
  @Get('proposta/publico/:token')
  async consultarPublica(@Param('token') token: string) {
    const proposta = await this.prisma.admin.proposta.findUnique({
      where: { tokenPub: token },
      select: {
        vlrSalario: true,
        dtInicio: true,
        tipoContrato: true,
        beneficios: true,
        observacoes: true,
        status: true,
        dhEnvio: true,
        // `motivoRecusa` fica de fora do que o candidato lê de volta: é anotação
        // do processo, e devolvê-la não ajuda ninguém.
        candidatura: {
          select: {
            candidato: { select: { nomeCand: true } },
            vaga: { select: { titulo: true, local: true, empresa: { select: { nomeFantasia: true } } } },
          },
        },
      },
    });
    if (!proposta) throw new BadRequestException('Link inválido ou expirado');
    return proposta;
  }

  @Publico()
  @Post('proposta/publico/:token/responder')
  async responder(@Param('token') token: string, @Body() corpo: unknown) {
    const dados = validar(
      z.object({ resposta: z.enum(['ACEITA', 'RECUSADA']), motivo: z.string().max(2000).optional() }),
      corpo,
    );
    const proposta = await this.prisma.admin.proposta.findUnique({
      where: { tokenPub: token },
      select: { codProp: true, codTen: true, codCdt: true, status: true },
    });
    if (!proposta) throw new BadRequestException('Link inválido ou expirado');
    if (proposta.status !== 'ENVIADA') {
      throw new BadRequestException('Esta proposta já foi respondida ou não está mais válida');
    }

    // Atualização condicional: dois cliques simultâneos não geram duas respostas.
    const alterados = await this.prisma.admin.proposta.updateMany({
      where: { codProp: proposta.codProp, status: 'ENVIADA' },
      data: { status: dados.resposta, dhResposta: new Date(), motivoRecusa: dados.motivo },
    });
    if (alterados.count === 0) throw new BadRequestException('Esta proposta já foi respondida');

    // Aceitar leva a "aprovado", não a "contratado": iniciar a admissão é uma
    // decisão do DP, e pular direto atropelaria a conferência de documentos.
    const estagio = dados.resposta === 'ACEITA' ? 'approved' : 'not_selected';
    const cdt = await this.prisma.admin.candidatura.findUnique({
      where: { codCdt: proposta.codCdt },
      select: { estagio: true },
    });
    await this.prisma.admin.candidatura.update({
      where: { codCdt: proposta.codCdt },
      data: { estagio },
    });
    await this.prisma.admin.candidaturaHistorico.create({
      data: {
        codTen: proposta.codTen,
        codCdt: proposta.codCdt,
        tipoEvento: 'mudanca_estagio',
        estagioAnt: cdt?.estagio ?? null,
        estagioNovo: estagio,
        rotuloPub: dados.resposta === 'ACEITA' ? 'Proposta aceita' : 'Proposta recusada',
        notaInterna: dados.resposta === 'RECUSADA' && dados.motivo ? `Motivo informado: ${dados.motivo}` : null,
        tipoAtor: 'candidato',
      },
    });
    return { status: dados.resposta };
  }
}
