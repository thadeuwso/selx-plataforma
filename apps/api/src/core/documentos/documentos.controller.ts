import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../auth/autenticacao.guard';
import { PrismaService } from '../../compartilhado/prisma/prisma.service';
import { DocumentosService } from './documentos.service';
import { AvisoAssinaturaService } from './aviso-assinatura.service';

const esquemaModelo = z.object({
  nomeDoc: z.string().min(3),
  conteudoModelo: z.string().min(10),
});

const esquemaEnvio = z.object({ codDoc: z.coerce.bigint() });

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

@Controller()
export class DocumentosController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentosService: DocumentosService,
    private readonly avisoAssinatura: AvisoAssinaturaService,
  ) {}

  // ===== Modelos de documento =====
  @Get('documentos-modelo')
  @Permissoes('core.documentos.ler')
  listarModelos(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.documentoModelo.findMany({ where: { ativo: 'S' }, orderBy: { codDoc: 'asc' } }),
    );
  }

  /** Modelo com placeholders {{nomeFun}}, {{cgc}}, {{nomeEmpresa}}, {{nomeCargo}}, {{nomeDepartamento}}, {{dtAdm}}, {{vlrSal}}, {{tipoContrato}}. */
  @Post('documentos-modelo')
  @Permissoes('core.documentos.editar')
  criarModelo(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaModelo, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.documentoModelo.create({
        data: { codTen: req.usuario.codTen, ...dados, codUsuInc: req.usuario.codUsu },
      }),
    );
  }

  // ===== Envio para assinatura =====
  /** Listagem de todas as assinaturas do tenant (dashboard e telas de acompanhamento). */
  @Get('assinaturas')
  @Permissoes('core.documentos.ler')
  listarTodasAssinaturas(@Req() req: ReqAut, @Query('status') status?: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.assinatura.findMany({
        where: { ...(status ? { status } : {}) },
        orderBy: { codAssin: 'desc' },
        select: {
          codAssin: true,
          status: true,
          dhEnvio: true,
          dhAssinatura: true,
          documento: { select: { nomeDoc: true } },
          funcionario: { select: { nomeFun: true } },
        },
      }),
    );
  }

  @Get('funcionarios/:codFun/assinaturas')
  @Permissoes('core.documentos.ler')
  listarAssinaturas(@Req() req: ReqAut, @Param('codFun') codFun: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.assinatura.findMany({
        where: { codFun: BigInt(codFun) },
        orderBy: { codAssin: 'desc' },
        select: {
          codAssin: true,
          status: true,
          dhEnvio: true,
          dhAssinatura: true,
          tokenPub: true,
          documento: { select: { nomeDoc: true } },
        },
      }),
    );
  }

  /** Renderiza o modelo com os dados do funcionário e gera link público de assinatura (token opaco — ADR-0004 §5). */
  @Post('funcionarios/:codFun/assinaturas')
  @Permissoes('core.documentos.criar')
  async enviarParaAssinatura(@Req() req: ReqAut, @Param('codFun') codFun: string, @Body() corpo: unknown) {
    const dados = validar(esquemaEnvio, corpo);
    const assinatura = await this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      this.documentosService.enviarParaAssinatura(
        tx,
        req.usuario.codTen,
        req.usuario.codUsu,
        BigInt(codFun),
        dados.codDoc,
      ),
    );
    const aviso = await this.avisoAssinatura.enfileirar(req.usuario.codTen, req.usuario.codUsu, [assinatura]);
    return { ...assinatura, emailEnfileirado: aviso.enfileirados > 0, funcionarioSemEmail: aviso.semEmail > 0 };
  }
}
