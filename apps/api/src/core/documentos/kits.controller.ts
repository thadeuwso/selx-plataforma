import { BadRequestException, Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../auth/autenticacao.guard';
import { PrismaService } from '../../compartilhado/prisma/prisma.service';

const esquemaKit = z.object({ nomeKit: z.string().min(3), codDocumentos: z.array(z.coerce.bigint()).min(1) });

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

/** Kit admissional: conjunto nomeado de modelos de documento enviados juntos ao aprovar uma admissão. */
@Controller('kits-admissionais')
export class KitsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissoes('core.documentos.ler')
  listar(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.kitAdmissional.findMany({
        where: { ativo: 'S' },
        orderBy: { codKit: 'asc' },
        include: { itens: { select: { documento: { select: { codDoc: true, nomeDoc: true } } }, orderBy: { ordem: 'asc' } } },
      }),
    );
  }

  @Post()
  @Permissoes('core.documentos.editar')
  criar(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaKit, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const documentos = await tx.documentoModelo.findMany({
        where: { codDoc: { in: dados.codDocumentos }, ativo: 'S' },
      });
      if (documentos.length !== dados.codDocumentos.length) {
        throw new BadRequestException('Algum documento informado não existe neste tenant');
      }
      const kit = await tx.kitAdmissional.create({
        data: { codTen: req.usuario.codTen, nomeKit: dados.nomeKit, codUsuInc: req.usuario.codUsu },
      });
      await tx.kitAdmissionalDocumento.createMany({
        data: dados.codDocumentos.map((codDoc, i) => ({
          codTen: req.usuario.codTen,
          codKit: kit.codKit,
          codDoc,
          ordem: i + 1,
        })),
      });
      return kit;
    });
  }
}
