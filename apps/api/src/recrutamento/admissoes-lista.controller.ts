import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';

type ReqAut = Request & { usuario: UsuarioAutenticado };

/** Listagem de processos de admissão do tenant (para o dashboard e a tela de Admissão). */
@Controller('admissoes')
export class AdmissoesListaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissoes('recrutamento.candidatos.ler')
  listar(@Req() req: ReqAut, @Query('status') status?: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.processoAdmissao.findMany({
        where: { ...(status ? { status } : {}) },
        orderBy: { dhInicio: 'desc' },
        select: {
          codAdmProc: true,
          codCdt: true,
          status: true,
          dhInicio: true,
          dhAprovacao: true,
          candidatura: {
            select: {
              candidato: { select: { nomeCand: true } },
              vaga: { select: { titulo: true } },
            },
          },
        },
      }),
    );
  }
}
