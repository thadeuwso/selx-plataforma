import { BadRequestException, Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { randomBytes } from 'node:crypto';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { DocumentosService } from '../core/documentos/documentos.service';
import { FuncionariosService } from '../core/funcionarios/funcionarios.service';
import { EmailService } from '../compartilhado/email/email.service';
import { AvisoAssinaturaService } from '../core/documentos/aviso-assinatura.service';
import { PrismaService } from '../compartilhado/prisma/prisma.service';

const esquemaAprovar = z.object({
  numCad: z.coerce.bigint(),
  dtAdm: z.coerce.date(),
  vlrSal: z.coerce.number().positive().optional(),
  cgc: z.string().optional(),
  codCar: z.coerce.bigint().optional(),
  codDep: z.coerce.bigint().optional(),
  codCencus: z.coerce.bigint().optional(),
  tipoContrato: z.string().default('CLT'),
  codDocContrato: z.coerce.bigint(),
  codKit: z.coerce.bigint().optional(),
});

const esquemaSolicitarAjustes = z.object({ obsAjuste: z.string().min(3) });

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
 * Processo de Admissão (fluxo real observado no vlow — ver
 * "09 - Módulos/Recrutamento e Seleção/04 - Processo de Admissão"): o
 * funcionário só é criado depois que o DP aprova dados/documentos que o
 * próprio candidato preencheu no link público (ver admissao-publico.controller.ts).
 */
@Controller('candidaturas/:codCdt/admissao')
export class AdmissaoProcessoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly funcionariosService: FuncionariosService,
    private readonly documentosService: DocumentosService,
    private readonly email: EmailService,
    private readonly avisoAssinatura: AvisoAssinaturaService,
  ) {}

  @Post('iniciar')
  @Permissoes('recrutamento.candidatos.criar')
  async iniciar(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    const resultado = await this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cdt = await tx.candidatura.findFirst({
        where: { codCdt: BigInt(codCdt), ativo: 'S' },
        include: {
          candidato: { select: { nomeCand: true, email: true } },
          vaga: { select: { titulo: true, empresa: { select: { nomeFantasia: true } } } },
        },
      });
      if (!cdt) throw new BadRequestException('Candidatura inexistente neste tenant');
      if (cdt.estagio !== 'hired') {
        throw new BadRequestException('Candidatura precisa estar no estágio "hired" para iniciar admissão');
      }
      if (cdt.codFun) throw new BadRequestException(`Já admitido (CODFUN ${cdt.codFun})`);

      const existente = await tx.processoAdmissao.findUnique({ where: { codCdt: cdt.codCdt } });
      const contexto = {
        email: cdt.candidato.email,
        nomeCand: cdt.candidato.nomeCand,
        tituloVaga: cdt.vaga.titulo,
        nomeEmpresa: cdt.vaga.empresa.nomeFantasia,
      };
      if (existente) {
        return { codAdmProc: existente.codAdmProc, tokenPub: existente.tokenPub, status: existente.status, contexto };
      }

      const processo = await tx.processoAdmissao.create({
        data: {
          codTen: req.usuario.codTen,
          codCdt: cdt.codCdt,
          tokenPub: randomBytes(24).toString('hex'),
          codUsuInc: req.usuario.codUsu,
        },
      });
      await tx.candidaturaHistorico.create({
        data: {
          codTen: req.usuario.codTen,
          codCdt: cdt.codCdt,
          tipoEvento: 'admissao_iniciada',
          rotuloPub: 'Processo de admissão iniciado',
          tipoAtor: 'usuario',
          codUsuInc: req.usuario.codUsu,
        },
      });
      return { codAdmProc: processo.codAdmProc, tokenPub: processo.tokenPub, status: processo.status, contexto };
    });

    // Fora da transação (RN-SX-001): a fila não pode segurar o commit do
    // processo nem derrubá-lo se o SMTP estiver fora.
    const { contexto, ...processo } = resultado;
    const base = process.env.APP_URL ?? 'http://localhost:3002';
    const envio = await this.email.enfileirar({
      codTen: req.usuario.codTen,
      destinatario: contexto.email,
      template: 'processo-admissao',
      chaveIdem: `admissao:${processo.codAdmProc}`,
      codUsuInc: req.usuario.codUsu,
      dados: {
        nomeCandidato: contexto.nomeCand,
        nomeEmpresa: contexto.nomeEmpresa,
        tituloVaga: contexto.tituloVaga,
        url: `${base}/admissao/${processo.tokenPub}`,
      },
    });
    return { ...processo, emailEnfileirado: !envio.jaExistia, smtpConfigurado: this.email.configurado() };
  }

  @Get()
  @Permissoes('recrutamento.candidatos.ler')
  detalhe(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const processo = await tx.processoAdmissao.findFirst({
        where: { codCdt: BigInt(codCdt) },
        include: {
          anexos: { orderBy: { dhInc: 'asc' } },
          candidatura: { include: { candidato: true, vaga: true } },
        },
      });
      if (!processo) throw new BadRequestException('Processo de admissão inexistente para esta candidatura');
      return processo;
    });
  }

  /** Devolve para o candidato ajustar dados/anexos (RN: só a partir de AGUARDANDO_APROVACAO_DP). */
  @Post('solicitar-ajustes')
  @Permissoes('recrutamento.candidatos.criar')
  solicitarAjustes(@Req() req: ReqAut, @Param('codCdt') codCdt: string, @Body() corpo: unknown) {
    const dados = validar(esquemaSolicitarAjustes, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const processo = await tx.processoAdmissao.findFirst({ where: { codCdt: BigInt(codCdt) } });
      if (!processo) throw new BadRequestException('Processo de admissão inexistente para esta candidatura');
      if (processo.status !== 'AGUARDANDO_APROVACAO_DP') {
        throw new BadRequestException(`Status ${processo.status} não permite solicitar ajustes`);
      }
      return tx.processoAdmissao.update({
        where: { codAdmProc: processo.codAdmProc },
        data: { status: 'AJUSTES_SOLICITADOS', obsAjuste: dados.obsAjuste },
        select: { codAdmProc: true, status: true, obsAjuste: true },
      });
    });
  }

  /**
   * Aprova: cria o Funcionario no Core (reaproveita FuncionariosService.admitir,
   * mesmo padrão de confirmarAdmissao em candidatos.controller.ts) e dispara
   * automaticamente o contrato + o kit admissional para assinatura.
   */
  @Post('aprovar')
  @Permissoes('core.funcionarios.criar')
  async aprovar(@Req() req: ReqAut, @Param('codCdt') codCdt: string, @Body() corpo: unknown) {
    const dados = validar(esquemaAprovar, corpo);
    const resultado = await this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const processo = await tx.processoAdmissao.findFirst({
        where: { codCdt: BigInt(codCdt) },
        include: { candidatura: { include: { candidato: true, vaga: true } } },
      });
      if (!processo) throw new BadRequestException('Processo de admissão inexistente para esta candidatura');
      if (processo.status !== 'AGUARDANDO_APROVACAO_DP') {
        throw new BadRequestException(`Status ${processo.status} não permite aprovar`);
      }
      const cdt = processo.candidatura;
      if (cdt.codFun) throw new BadRequestException(`Já admitido (CODFUN ${cdt.codFun})`);

      const funcionario = await this.funcionariosService.admitir(tx, req.usuario.codTen, req.usuario.codUsu, {
        codEmp: cdt.vaga.codEmp,
        numCad: dados.numCad,
        nomeFun: cdt.candidato.nomeCand,
        // O funcionário herda o e-mail do candidato: é o único endereço que a
        // plataforma conhece, e sem ele não há como mandar documento para assinar.
        email: cdt.candidato.email,
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
      await tx.processoAdmissao.update({
        where: { codAdmProc: processo.codAdmProc },
        data: { status: 'APROVADO', dhAprovacao: new Date(), codUsuAprov: req.usuario.codUsu },
      });
      await tx.candidaturaHistorico.create({
        data: {
          codTen: req.usuario.codTen,
          codCdt: cdt.codCdt,
          tipoEvento: 'admissao_aprovada',
          rotuloPub: 'Admissão aprovada pelo DP',
          tipoAtor: 'usuario',
          metadadosJson: { codFun: funcionario.codFun.toString(), numCad: dados.numCad.toString() },
          codUsuInc: req.usuario.codUsu,
        },
      });

      const assinaturas = await this.documentosService.enviarPacoteAdmissao(
        tx,
        req.usuario.codTen,
        req.usuario.codUsu,
        funcionario.codFun,
        dados.codDocContrato,
        dados.codKit,
      );

      return { codCdt: cdt.codCdt, codFun: funcionario.codFun, numCad: funcionario.numCad, assinaturas };
    });

    // Depois do commit: o candidato aprovado recebe os documentos para assinar
    // sem ninguém precisar copiar link nenhum (RN-SX-001).
    const aviso = await this.avisoAssinatura.enfileirar(req.usuario.codTen, req.usuario.codUsu, resultado.assinaturas);
    return { ...resultado, emailsEnfileirados: aviso.enfileirados, semEmail: aviso.semEmail };
  }
}
