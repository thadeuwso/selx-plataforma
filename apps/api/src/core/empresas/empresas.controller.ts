import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../auth/autenticacao.guard';
import { PrismaService } from '../../compartilhado/prisma/prisma.service';

const esquemaNovaEmpresa = z.object({
  nomeFantasia: z.string().min(2),
  razaoSocial: z.string().min(2),
  cgc: z.string().optional(),
  codEmpMatriz: z.coerce.bigint().optional(),
});

const esquemaEditarEmpresa = z.object({
  nomeFantasia: z.string().min(2).optional(),
  razaoSocial: z.string().min(2).optional(),
  cgc: z.string().nullish(),
  situacao: z.enum(['ATIVA', 'INATIVA']).optional(),
});

type ReqAutenticada = Request & { usuario: UsuarioAutenticado };

@Controller('empresas')
export class EmpresasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissoes('core.empresas.ler')
  listar(@Req() req: ReqAutenticada) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.empresa.findMany({
        where: { ativo: 'S' },
        orderBy: { codEmp: 'asc' },
        select: {
          codEmp: true,
          nomeFantasia: true,
          razaoSocial: true,
          cgc: true,
          codEmpMatriz: true,
          situacao: true,
        },
      }),
    );
  }

  /** Cria empresa/filial no tenant do usuário. RLS garante o CODTEN correto. */
  @Post()
  @Permissoes('core.empresas.criar')
  async criar(@Req() req: ReqAutenticada, @Body() corpo: unknown) {
    let dados: z.infer<typeof esquemaNovaEmpresa>;
    try {
      dados = esquemaNovaEmpresa.parse(corpo);
    } catch (erro) {
      if (erro instanceof ZodError) {
        throw new BadRequestException({ mensagem: 'Dados inválidos', detalhes: erro.issues });
      }
      throw erro;
    }

    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      if (dados.codEmpMatriz) {
        const matriz = await tx.empresa.findFirst({
          where: { codEmp: dados.codEmpMatriz, codEmpMatriz: null, ativo: 'S' },
        });
        if (!matriz) {
          throw new BadRequestException('Matriz inexistente (ou é uma filial)');
        }
      }
      return tx.empresa.create({
        data: {
          codTen: req.usuario.codTen,
          nomeFantasia: dados.nomeFantasia,
          razaoSocial: dados.razaoSocial,
          cgc: dados.cgc,
          codEmpMatriz: dados.codEmpMatriz,
          codUsuInc: req.usuario.codUsu,
        },
        select: { codEmp: true, nomeFantasia: true, razaoSocial: true, codEmpMatriz: true },
      });
    });
  }

  /** Edita empresa/filial. */
  @Patch(':codEmp')
  @Permissoes('core.empresas.editar')
  async editar(@Req() req: ReqAutenticada, @Param('codEmp') codEmp: string, @Body() corpo: unknown) {
    let dados: z.infer<typeof esquemaEditarEmpresa>;
    try {
      dados = esquemaEditarEmpresa.parse(corpo);
    } catch (erro) {
      if (erro instanceof ZodError) throw new BadRequestException({ mensagem: 'Dados inválidos', detalhes: erro.issues });
      throw erro;
    }
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const emp = await tx.empresa.findFirst({ where: { codEmp: BigInt(codEmp), ativo: 'S' } });
      if (!emp) throw new NotFoundException('Empresa inexistente neste tenant');
      await tx.empresa.update({
        where: { codEmp: emp.codEmp },
        data: {
          nomeFantasia: dados.nomeFantasia,
          razaoSocial: dados.razaoSocial,
          cgc: dados.cgc,
          situacao: dados.situacao,
          codUsuAlt: req.usuario.codUsu,
        },
      });
      return { ok: true };
    });
  }
}
