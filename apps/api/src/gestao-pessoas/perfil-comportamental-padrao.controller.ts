import { BadRequestException, Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';

const esquemaFator = z.object({
  sigla: z.enum(['DIR', 'CON', 'SUS', 'PRE']),
  minimo: z.coerce.number().int().min(0).max(100),
  maximo: z.coerce.number().int().min(0).max(100),
  peso: z.coerce.number().min(0).max(10).default(1),
  importancia: z.enum(['BAIXA', 'MEDIA', 'ALTA']).default('MEDIA'),
  eliminatorio: z.enum(['S', 'N']).default('N'),
  justificativa: z.string().optional(),
  tolerancia: z.coerce.number().int().optional(),
});

const esquemaPerfil = z.object({
  fatores: z.array(esquemaFator).min(1),
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
 * Perfil comportamental PADRÃO do tenant (RN-GP-008, extensão 2026-07-21) —
 * usado como fallback quando uma vaga específica não tem perfil próprio.
 * Mesmo padrão de substituição (ATIVO=N, nunca UPDATE parcial) de
 * `perfil-comportamental.controller.ts`, sem vínculo de vaga nem de modelo
 * (a escolha de questionário já tem seu próprio fallback, separado).
 */
@Controller('gestao-pessoas/perfil-comportamental-padrao')
export class PerfilComportamentalPadraoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissoes('gestaopessoas.avaliacoes.ler')
  consultar(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.perfilComportamentalPadrao.findFirst({
        where: { ativo: 'S' },
        include: { fatores: { include: { fator: true } } },
      }),
    );
  }

  @Post()
  @Permissoes('gestaopessoas.avaliacoes.criar')
  configurar(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaPerfil, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const fatores = await tx.fatorComportamental.findMany({
        where: { sigla: { in: dados.fatores.map((f) => f.sigla) } },
      });
      const fatorPorSigla = new Map(fatores.map((f) => [f.sigla, f]));
      for (const f of dados.fatores) {
        if (!fatorPorSigla.has(f.sigla)) throw new BadRequestException(`Fator ${f.sigla} inexistente`);
      }

      const existente = await tx.perfilComportamentalPadrao.findFirst({ where: { ativo: 'S' } });
      if (existente) {
        await tx.perfilComportamentalPadrao.update({ where: { codPerPad: existente.codPerPad }, data: { ativo: 'N' } });
      }

      const perfil = await tx.perfilComportamentalPadrao.create({
        data: { codTen: req.usuario.codTen, codUsuInc: req.usuario.codUsu },
      });
      await tx.perfilComportamentalPadraoFator.createMany({
        data: dados.fatores.map((f) => ({
          codTen: req.usuario.codTen,
          codPerPad: perfil.codPerPad,
          codFat: fatorPorSigla.get(f.sigla)!.codFat,
          minimo: f.minimo,
          maximo: f.maximo,
          peso: f.peso,
          importancia: f.importancia,
          eliminatorio: f.eliminatorio,
          justificativa: f.justificativa,
          tolerancia: f.tolerancia,
        })),
      });
      return { codPerPad: perfil.codPerPad };
    });
  }
}
