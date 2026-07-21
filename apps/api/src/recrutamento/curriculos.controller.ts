import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { diretorioUploads, salvarCurriculo } from './armazenamento-curriculo';
import { detectarContatoNoTexto, extrairTextoCurriculo, tipoArquivoAceito } from './curriculo-extracao';

const MIME_POR_EXTENSAO: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
};

const TAMANHO_MAX_BYTES = 8 * 1024 * 1024; // 8MB
type ReqAut = Request & { usuario: UsuarioAutenticado };

@Controller('candidatos/:codCand/curriculo')
export class CurriculosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissoes('recrutamento.candidatos.ler')
  listar(@Req() req: ReqAut, @Param('codCand') codCand: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.candidatoCurriculo.findMany({
        where: { codCand: BigInt(codCand) },
        orderBy: { codCandCv: 'desc' },
        select: { codCandCv: true, arquivo: true, dhInc: true, textoExtraido: true },
      }),
    );
  }

  /** Serve o arquivo original armazenado (v1 nunca teve download — só upload + texto extraído). */
  @Get(':codCandCv/arquivo')
  @Permissoes('recrutamento.candidatos.ler')
  async baixarArquivo(
    @Req() req: ReqAut,
    @Param('codCand') codCand: string,
    @Param('codCandCv') codCandCv: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const registro = await this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.candidatoCurriculo.findFirst({
        where: { codCandCv: BigInt(codCandCv), codCand: BigInt(codCand) },
      }),
    );
    if (!registro) throw new BadRequestException('Currículo inexistente neste tenant');

    const caminhoCompleto = path.join(diretorioUploads(), registro.arquivo);
    const extensao = path.extname(registro.arquivo).toLowerCase();
    res.set({
      'Content-Type': MIME_POR_EXTENSAO[extensao] ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename="curriculo${extensao}"`,
    });
    return new StreamableFile(createReadStream(caminhoCompleto));
  }

  /** Upload + extração de texto (PDF/DOCX/TXT). Nunca via IA — extração é mecânica. */
  @Post()
  @Permissoes('recrutamento.candidatos.criar')
  @UseInterceptors(FileInterceptor('arquivo'))
  async enviar(
    @Req() req: ReqAut,
    @Param('codCand') codCand: string,
    @UploadedFile() arquivo?: Express.Multer.File,
  ) {
    if (!arquivo) throw new BadRequestException('Envie um arquivo no campo "arquivo"');
    if (arquivo.size > TAMANHO_MAX_BYTES) {
      throw new BadRequestException('Arquivo maior que 8MB');
    }
    const tipo = tipoArquivoAceito(arquivo.originalname, arquivo.mimetype);
    if (!tipo) throw new BadRequestException('Formato não suportado — use PDF, DOCX ou TXT');

    const codTen = req.usuario.codTen;
    return this.prisma.executarNoTenant(codTen, async (tx) => {
      const candidato = await tx.candidato.findFirst({ where: { codCand: BigInt(codCand), ativo: 'S' } });
      if (!candidato) throw new BadRequestException('Candidato inexistente neste tenant');

      const extraido = await extrairTextoCurriculo({
        nomeArquivo: arquivo.originalname,
        mimetype: arquivo.mimetype,
        buffer: arquivo.buffer,
      });
      const caminhoRelativo = await salvarCurriculo(codTen, tipo, arquivo.buffer);

      const registro = await tx.candidatoCurriculo.create({
        data: {
          codTen,
          codCand: candidato.codCand,
          arquivo: caminhoRelativo,
          textoExtraido: extraido.texto || null,
        },
      });

      // Prefill leve de contato quando o cadastro estiver incompleto (heurística, sem IA)
      if (extraido.status === 'ok' && (!candidato.fone || !candidato.email)) {
        const contato = detectarContatoNoTexto(extraido.texto);
        if (contato.fone && !candidato.fone) {
          await tx.candidato.update({ where: { codCand: candidato.codCand }, data: { fone: contato.fone } });
        }
      }

      return {
        codCandCv: registro.codCandCv,
        statusExtracao: extraido.status,
        caracteresExtraidos: extraido.caracteres,
        mensagemErro: extraido.mensagemErro,
      };
    });
  }
}
