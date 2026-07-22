import { BadRequestException, Body, Controller, Get, Patch, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../auth/autenticacao.guard';
import { PrismaService } from '../../compartilhado/prisma/prisma.service';

const esquema = z.object({ provedorIa: z.enum(['nuvem', 'local']) });

type ReqAut = Request & { usuario: UsuarioAutenticado };

/**
 * Configuração de IA do tenant.
 *
 * Hoje só a escolha do provedor para análises que carregam dado do candidato.
 * A empresa que exige que nada saia da própria infraestrutura escolhe `local`;
 * a contrapartida é qualidade — o modelo local é bem menor que o de nuvem, e a
 * tela precisa dizer isso antes da escolha.
 *
 * Isso é **preferência**, não política: dado marcado como sensível continua indo
 * para o provedor local mesmo com `nuvem` escolhido (ADR-0003, decidido no
 * gateway, não aqui).
 */
@Controller('configuracoes/ia')
export class ConfiguracoesIaController {
  constructor(private readonly prisma: PrismaService) {}

  /** Sem linha gravada, vale o padrão — não se cria configuração só para ler. */
  @Get()
  @Permissoes('core.empresas.ler')
  async consultar(@Req() req: ReqAut) {
    const cfg = await this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.configuracaoIa.findFirst({ where: { codTen: req.usuario.codTen }, select: { provedorIa: true } }),
    );
    return { provedorIa: cfg?.provedorIa ?? 'nuvem' };
  }

  @Patch()
  @Permissoes('core.empresas.criar')
  async alterar(@Req() req: ReqAut, @Body() corpo: unknown) {
    let dados: z.infer<typeof esquema>;
    try {
      dados = esquema.parse(corpo);
    } catch (erro) {
      if (erro instanceof ZodError) {
        throw new BadRequestException({ mensagem: 'Dados inválidos', detalhes: erro.issues });
      }
      throw erro;
    }
    const atualizado = await this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.configuracaoIa.upsert({
        where: { codTen: req.usuario.codTen },
        create: {
          codTen: req.usuario.codTen,
          provedorIa: dados.provedorIa,
          codUsuInc: req.usuario.codUsu,
        },
        update: { provedorIa: dados.provedorIa, codUsuAlt: req.usuario.codUsu },
        select: { provedorIa: true },
      }),
    );
    return atualizado;
  }
}
