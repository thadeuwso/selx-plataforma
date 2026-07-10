import { BadRequestException, Body, Controller, Get, Post, Req } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../auth/autenticacao.guard';
import { PrismaService } from '../prisma/prisma.service';

const esquemaNovoUsuario = z.object({
  nomeUsu: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(8),
  papeis: z.array(z.coerce.bigint()).min(1),
  codEmp: z.coerce.bigint().optional(), // escopo ABAC opcional dos papéis
});

const esquemaNovoPapel = z.object({
  nomePap: z.string().min(2),
  descrPap: z.string().optional(),
  permissoes: z.array(z.string().min(3)).min(1), // chaves do catálogo (TSXPERM)
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

@Controller()
export class UsuariosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('usuarios')
  @Permissoes('core.usuarios.ler')
  listarUsuarios(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.usuario.findMany({
        where: { ativo: 'S' },
        orderBy: { codUsu: 'asc' },
        select: {
          codUsu: true,
          nomeUsu: true,
          email: true,
          situacao: true,
          dhUltAcesso: true,
          papeis: {
            where: { ativo: 'S' },
            select: { codEmp: true, papel: { select: { codPap: true, nomePap: true } } },
          },
        },
      }),
    );
  }

  /** Cria usuário no tenant com papéis (escopo por empresa opcional). */
  @Post('usuarios')
  @Permissoes('core.usuarios.criar')
  async criarUsuario(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaNovoUsuario, corpo);
    const senhaHash = await bcrypt.hash(dados.senha, 10);

    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const papeis = await tx.papel.findMany({
        where: { codPap: { in: dados.papeis }, ativo: 'S' },
      });
      if (papeis.length !== dados.papeis.length) {
        throw new BadRequestException('Papel inexistente neste tenant');
      }
      const usuario = await tx.usuario.create({
        data: {
          codTen: req.usuario.codTen,
          nomeUsu: dados.nomeUsu,
          email: dados.email.toLowerCase(),
          senha: senhaHash,
          codUsuInc: req.usuario.codUsu,
        },
        select: { codUsu: true, nomeUsu: true, email: true },
      });
      await tx.usuarioPapel.createMany({
        data: dados.papeis.map((codPap) => ({
          codTen: req.usuario.codTen,
          codUsu: usuario.codUsu,
          codPap,
          codEmp: dados.codEmp,
          codUsuInc: req.usuario.codUsu,
        })),
      });
      return usuario;
    });
  }

  @Get('papeis')
  @Permissoes('core.usuarios.ler')
  listarPapeis(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.papel.findMany({
        where: { ativo: 'S' },
        orderBy: { codPap: 'asc' },
        select: {
          codPap: true,
          nomePap: true,
          descrPap: true,
          permissoes: { select: { permissao: { select: { chavePerm: true } } } },
        },
      }),
    );
  }

  /** Cria papel com permissões do catálogo global (por chave). */
  @Post('papeis')
  @Permissoes('core.usuarios.editar')
  async criarPapel(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaNovoPapel, corpo);

    const permissoes = await this.prisma.admin.permissao.findMany({
      where: { chavePerm: { in: dados.permissoes } },
    });
    if (permissoes.length !== dados.permissoes.length) {
      throw new BadRequestException('Permissão inexistente no catálogo');
    }

    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const papel = await tx.papel.create({
        data: {
          codTen: req.usuario.codTen,
          nomePap: dados.nomePap,
          descrPap: dados.descrPap,
          codUsuInc: req.usuario.codUsu,
        },
      });
      await tx.papelPermissao.createMany({
        data: permissoes.map((p) => ({
          codTen: req.usuario.codTen,
          codPap: papel.codPap,
          codPerm: p.codPerm,
          codUsuInc: req.usuario.codUsu,
        })),
      });
      return { codPap: papel.codPap, nomePap: papel.nomePap, permissoes: dados.permissoes };
    });
  }
}
