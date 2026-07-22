import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import type { Prisma } from '@prisma/client';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';

const esquemaTag = z.object({
  nome: z.string().min(1).max(40),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const esquemaAplicar = z.object({
  codCands: z.array(z.coerce.bigint()).min(1).max(500),
  codTag: z.coerce.bigint(),
  acao: z.enum(['adicionar', 'remover']).default('adicionar'),
});

const esquemaFiltro = z.object({
  nome: z.string().min(1).max(60),
  filtros: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
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
 * Ferramentas de triagem em volume (RN-REC-017): etiquetas, favoritos e filtros
 * salvos.
 *
 * Quem tria centenas de currículos por dia precisa marcar o que já olhou,
 * separar o que quer rever e voltar ao mesmo recorte amanhã. Sem isso, a
 * memória do trabalho fica na cabeça de quem triou.
 */
@Controller()
export class TriagemController {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Etiquetas =====

  @Get('tags')
  @Permissoes('recrutamento.candidatos.ler')
  listarTags(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.tag.findMany({
        where: { ativo: 'S' },
        orderBy: { nome: 'asc' },
        include: { _count: { select: { candidatos: { where: { ativo: 'S' } } } } },
      }),
    );
  }

  @Post('tags')
  @Permissoes('recrutamento.candidatos.criar')
  async criarTag(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaTag, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const existente = await tx.tag.findFirst({ where: { nome: dados.nome } });
      // Reativa em vez de recusar: quem recria uma etiqueta que existia quer
      // aquela etiqueta de volta, com o histórico dela.
      if (existente) {
        return tx.tag.update({
          where: { codTag: existente.codTag },
          data: { ativo: 'S', cor: dados.cor ?? existente.cor },
        });
      }
      return tx.tag.create({
        data: { codTen: req.usuario.codTen, nome: dados.nome, cor: dados.cor, codUsuInc: req.usuario.codUsu },
      });
    });
  }

  /** Desativa a etiqueta. As marcações ficam — o histórico não se apaga. */
  @Patch('tags/:codTag/desativar')
  @Permissoes('recrutamento.candidatos.criar')
  async desativarTag(@Req() req: ReqAut, @Param('codTag') codTag: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const alterados = await tx.tag.updateMany({
        where: { codTag: BigInt(codTag), ativo: 'S' },
        data: { ativo: 'N' },
      });
      if (alterados.count === 0) throw new BadRequestException('Etiqueta inexistente neste tenant');
      return { ok: true };
    });
  }

  /** Aplica ou remove uma etiqueta em vários candidatos de uma vez. */
  @Post('candidatos/tags-lote')
  @Permissoes('recrutamento.candidatos.criar')
  async aplicarTagLote(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaAplicar, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const tag = await tx.tag.findFirst({ where: { codTag: dados.codTag, ativo: 'S' } });
      if (!tag) throw new BadRequestException('Etiqueta inexistente neste tenant');

      // Só candidatos deste tenant: a lista vem do cliente e não se confia nela.
      const candidatos = await tx.candidato.findMany({
        where: { codCand: { in: dados.codCands }, ativo: 'S' },
        select: { codCand: true },
      });

      // Sem DELETE em lugar nenhum: o papel da aplicação não tem essa
      // permissão (convenção da plataforma, migration core_v1). Remover é
      // desmarcar, e o histórico de quem marcou o quê fica.
      if (dados.acao === 'remover') {
        const r = await tx.candidatoTag.updateMany({
          where: { codTag: tag.codTag, codCand: { in: candidatos.map((c) => c.codCand) }, ativo: 'S' },
          data: { ativo: 'N' },
        });
        return { afetados: r.count, acao: 'remover' };
      }

      // Reativa quem já teve a etiqueta antes, em vez de tentar inserir de novo.
      const reativados = await tx.candidatoTag.updateMany({
        where: { codTag: tag.codTag, codCand: { in: candidatos.map((c) => c.codCand) }, ativo: 'N' },
        data: { ativo: 'S' },
      });

      // `skipDuplicates` em vez de checar antes: aplicar de novo é operação
      // corriqueira em lote e não pode falhar por já existir.
      const r = await tx.candidatoTag.createMany({
        data: candidatos.map((c) => ({
          codTen: req.usuario.codTen,
          codCand: c.codCand,
          codTag: tag.codTag,
          codUsuInc: req.usuario.codUsu,
        })),
        skipDuplicates: true,
      });
      return { afetados: r.count + reativados.count, acao: 'adicionar' };
    });
  }

  // ===== Favoritos (por usuário) =====

  @Post('candidaturas/:codCdt/favorito')
  @Permissoes('recrutamento.candidatos.ler')
  async favoritar(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cdt = await tx.candidatura.findFirst({ where: { codCdt: BigInt(codCdt), ativo: 'S' } });
      if (!cdt) throw new BadRequestException('Candidatura inexistente neste tenant');
      await tx.candidaturaFavorita.upsert({
        where: { codCdt_codUsu: { codCdt: cdt.codCdt, codUsu: req.usuario.codUsu } },
        create: { codTen: req.usuario.codTen, codCdt: cdt.codCdt, codUsu: req.usuario.codUsu },
        update: { ativo: 'S' },
      });
      return { favorito: true };
    });
  }

  @Delete('candidaturas/:codCdt/favorito')
  @Permissoes('recrutamento.candidatos.ler')
  async desfavoritar(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      await tx.candidaturaFavorita.updateMany({
        where: { codCdt: BigInt(codCdt), codUsu: req.usuario.codUsu },
        data: { ativo: 'N' },
      });
      return { favorito: false };
    });
  }

  // ===== Filtros salvos (por usuário) =====

  @Get('filtros-salvos')
  @Permissoes('recrutamento.candidatos.ler')
  listarFiltros(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.filtroSalvo.findMany({ where: { codUsu: req.usuario.codUsu, ativo: 'S' }, orderBy: { nome: 'asc' } }),
    );
  }

  @Post('filtros-salvos')
  @Permissoes('recrutamento.candidatos.ler')
  async salvarFiltro(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaFiltro, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      // Salvar com o mesmo nome sobrescreve: é o que quem clica "salvar" espera
      // depois de ajustar o recorte.
      tx.filtroSalvo.upsert({
        where: { codTen_codUsu_nome: { codTen: req.usuario.codTen, codUsu: req.usuario.codUsu, nome: dados.nome } },
        create: {
          codTen: req.usuario.codTen,
          codUsu: req.usuario.codUsu,
          nome: dados.nome,
          filtrosJson: dados.filtros as Prisma.InputJsonValue,
        },
        update: { filtrosJson: dados.filtros as Prisma.InputJsonValue, ativo: 'S' },
      }),
    );
  }

  @Delete('filtros-salvos/:codFiltro')
  @Permissoes('recrutamento.candidatos.ler')
  async removerFiltro(@Req() req: ReqAut, @Param('codFiltro') codFiltro: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      // Amarra ao usuário: ninguém apaga o filtro salvo do colega.
      const r = await tx.filtroSalvo.updateMany({
        where: { codFiltro: BigInt(codFiltro), codUsu: req.usuario.codUsu, ativo: 'S' },
        data: { ativo: 'N' },
      });
      if (r.count === 0) throw new BadRequestException('Filtro inexistente');
      return { ok: true };
    });
  }
}
