import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { Publico } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { salvarArquivo } from './armazenamento-curriculo';

const TAMANHO_MAX_BYTES = 8 * 1024 * 1024; // 8MB
const EXTENSAO_POR_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

const STATUS_EDITAVEIS = ['AGUARDANDO_CANDIDATO', 'AJUSTES_SOLICITADOS'];

async function buscarProcesso(prisma: PrismaService, token: string) {
  const processo = await prisma.admin.processoAdmissao.findUnique({ where: { tokenPub: token } });
  if (!processo) throw new BadRequestException('Link inválido ou expirado');
  return processo;
}

/**
 * Preenchimento de dados e anexos pelo candidato, sem login — token opaco
 * (ADR-0004 §5), mesmo padrão de assinaturas-publicas.controller.ts. Usa
 * prisma.admin porque o token já identifica o processo sem contexto de tenant.
 */
@Controller('admissao/publico')
export class AdmissaoPublicoController {
  constructor(private readonly prisma: PrismaService) {}

  @Publico()
  @Get(':token')
  async consultar(@Param('token') token: string) {
    const processo = await this.prisma.admin.processoAdmissao.findUnique({
      where: { tokenPub: token },
      select: {
        status: true,
        obsAjuste: true,
        dadosComplementaresJson: true,
        dhEnvioCandidato: true,
        candidatura: { select: { candidato: { select: { nomeCand: true, email: true } } } },
        anexos: { select: { codAdmAnexo: true, categoria: true, nomeOriginal: true, dhInc: true } },
      },
    });
    if (!processo) throw new BadRequestException('Link inválido ou expirado');
    return processo;
  }

  @Publico()
  @Post(':token/dados')
  async preencherDados(@Param('token') token: string, @Body() corpo: unknown) {
    const dados = z.record(z.string(), z.unknown()).parse(corpo ?? {});
    const processo = await buscarProcesso(this.prisma, token);
    if (!STATUS_EDITAVEIS.includes(processo.status)) {
      throw new BadRequestException(`Status ${processo.status} não permite editar dados`);
    }
    const anterior = (processo.dadosComplementaresJson as Record<string, unknown> | null) ?? {};
    const atualizado = await this.prisma.admin.processoAdmissao.update({
      where: { codAdmProc: processo.codAdmProc },
      data: { dadosComplementaresJson: { ...anterior, ...dados } as Prisma.InputJsonValue },
      select: { dadosComplementaresJson: true },
    });
    return atualizado;
  }

  @Publico()
  @Post(':token/anexos')
  @UseInterceptors(FileInterceptor('arquivo'))
  async anexarDocumento(
    @Param('token') token: string,
    @Body('categoria') categoria: string | undefined,
    @UploadedFile() arquivo?: Express.Multer.File,
  ) {
    if (!arquivo) throw new BadRequestException('Envie um arquivo no campo "arquivo"');
    if (!categoria || categoria.trim().length < 2) throw new BadRequestException('Informe a categoria do documento');
    if (arquivo.size > TAMANHO_MAX_BYTES) throw new BadRequestException('Arquivo maior que 8MB');
    const extensao = EXTENSAO_POR_MIME[arquivo.mimetype];
    if (!extensao) throw new BadRequestException('Formato não suportado — use PDF, JPG ou PNG');

    const processo = await buscarProcesso(this.prisma, token);
    if (!STATUS_EDITAVEIS.includes(processo.status)) {
      throw new BadRequestException(`Status ${processo.status} não permite anexar documentos`);
    }

    const caminhoRelativo = await salvarArquivo('admissao-anexos', processo.codTen, extensao, arquivo.buffer);
    return this.prisma.admin.admissaoAnexo.create({
      data: {
        codTen: processo.codTen,
        codAdmProc: processo.codAdmProc,
        categoria: categoria.trim(),
        arquivo: caminhoRelativo,
        nomeOriginal: arquivo.originalname,
      },
      select: { codAdmAnexo: true, categoria: true, nomeOriginal: true },
    });
  }

  @Publico()
  @Post(':token/enviar')
  async enviar(@Param('token') token: string) {
    const processo = await buscarProcesso(this.prisma, token);
    if (!STATUS_EDITAVEIS.includes(processo.status)) {
      throw new BadRequestException(`Status ${processo.status} não permite enviar`);
    }
    return this.prisma.admin.processoAdmissao.update({
      where: { codAdmProc: processo.codAdmProc },
      data: { status: 'AGUARDANDO_APROVACAO_DP', dhEnvioCandidato: new Date(), obsAjuste: null },
      select: { status: true, dhEnvioCandidato: true },
    });
  }
}
