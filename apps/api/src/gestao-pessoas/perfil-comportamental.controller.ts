import { BadRequestException, Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
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

/** Perfil comportamental desejado da vaga (RN-GP-008) — faixa por fator, nunca um perfil "universal". */
@Controller('vagas/:codVag/perfil-comportamental')
export class PerfilComportamentalController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissoes('gestaopessoas.avaliacoes.ler')
  consultar(@Req() req: ReqAut, @Param('codVag') codVag: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.perfilComportamentalVaga.findFirst({
        where: { codVag: BigInt(codVag), ativo: 'S' },
        include: {
          modelo: { select: { codMod: true, nome: true, versao: true } },
          fatores: { include: { fator: true } },
        },
      }),
    );
  }

  /** Substitui o perfil ativo por um novo (histórico preservado via ATIVO=N, nunca UPDATE parcial). */
  @Post()
  @Permissoes('gestaopessoas.avaliacoes.criar')
  configurar(@Req() req: ReqAut, @Param('codVag') codVag: string, @Body() corpo: unknown) {
    const dados = validar(esquemaPerfil, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const vaga = await tx.vaga.findFirst({ where: { codVag: BigInt(codVag), ativo: 'S' } });
      if (!vaga) throw new BadRequestException('Vaga inexistente neste tenant');

      const modeloPadrao = await tx.modeloAvaliacaoComportamental.findFirst({
        where: { status: 'PUBLICADO' },
        orderBy: { versao: 'desc' },
      });
      if (!modeloPadrao) throw new BadRequestException('Nenhum modelo de avaliação comportamental publicado');

      const fatores = await tx.fatorComportamental.findMany({
        where: { sigla: { in: dados.fatores.map((f) => f.sigla) } },
      });
      const fatorPorSigla = new Map(fatores.map((f) => [f.sigla, f]));
      for (const f of dados.fatores) {
        if (!fatorPorSigla.has(f.sigla)) throw new BadRequestException(`Fator ${f.sigla} inexistente`);
      }

      const existente = await tx.perfilComportamentalVaga.findFirst({
        where: { codVag: vaga.codVag, ativo: 'S' },
      });
      if (existente) {
        await tx.perfilComportamentalVaga.update({ where: { codPerVag: existente.codPerVag }, data: { ativo: 'N' } });
      }

      const perfil = await tx.perfilComportamentalVaga.create({
        data: { codTen: req.usuario.codTen, codVag: vaga.codVag, codMod: modeloPadrao.codMod, codUsuInc: req.usuario.codUsu },
      });
      await tx.perfilComportamentalVagaFator.createMany({
        data: dados.fatores.map((f) => ({
          codTen: req.usuario.codTen,
          codPerVag: perfil.codPerVag,
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
      return { codPerVag: perfil.codPerVag };
    });
  }
}
