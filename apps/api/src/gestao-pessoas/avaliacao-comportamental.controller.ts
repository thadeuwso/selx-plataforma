import { BadRequestException, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { randomBytes } from 'node:crypto';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { calcularAderenciaVaga, calcularResultadoPorFaceta, type PerfilVagaFator, type RespostaFaceta } from './calcular-resultado';

type ReqAut = Request & { usuario: UsuarioAutenticado };

const STATUS_REUTILIZAVEL = ['REVOGADO', 'EXPIRADO'];

/** Convite e acompanhamento da Avaliação Comportamental por candidatura (RH). */
@Controller('candidaturas/:codCdt/avaliacao-comportamental')
export class AvaliacaoComportamentalController {
  constructor(private readonly prisma: PrismaService) {}

  /** Gera o link público (token opaco, ADR-0004 §5) — usa o modelo do perfil da vaga, ou o padrão se a vaga não tiver perfil configurado. */
  @Post('convidar')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  convidar(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const cdt = await tx.candidatura.findFirst({
        where: { codCdt: BigInt(codCdt), ativo: 'S' },
        include: { vaga: { include: { perfisComportamentais: { where: { ativo: 'S' } } } } },
      });
      if (!cdt) throw new BadRequestException('Candidatura inexistente neste tenant');

      const existente = await tx.conviteComportamental.findFirst({
        where: { codCdt: cdt.codCdt },
        orderBy: { codConv: 'desc' },
      });
      if (existente && !STATUS_REUTILIZAVEL.includes(existente.status)) {
        return { codConv: existente.codConv, tokenPub: existente.tokenPub, status: existente.status };
      }

      const perfilVaga = cdt.vaga.perfisComportamentais[0];
      const codMod =
        perfilVaga?.codMod ??
        (await tx.modeloAvaliacaoComportamental.findFirst({ where: { status: 'PUBLICADO' }, orderBy: { versao: 'desc' } }))?.codMod;
      if (!codMod) throw new BadRequestException('Nenhum modelo de avaliação comportamental disponível');

      const dhExpiracao = new Date();
      dhExpiracao.setDate(dhExpiracao.getDate() + 7);

      const convite = await tx.conviteComportamental.create({
        data: {
          codTen: req.usuario.codTen,
          codCdt: cdt.codCdt,
          codMod,
          tokenPub: randomBytes(24).toString('hex'),
          dhExpiracao,
          codUsuInc: req.usuario.codUsu,
        },
      });
      return { codConv: convite.codConv, tokenPub: convite.tokenPub, status: convite.status };
    });
  }

  /** Status, respostas e resultado (com aderência à vaga, se houver perfil configurado). */
  @Get()
  @Permissoes('gestaopessoas.avaliacoes.ler')
  detalhe(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const convite = await tx.conviteComportamental.findFirst({
        where: { codCdt: BigInt(codCdt) },
        orderBy: { codConv: 'desc' },
        include: {
          sessao: {
            include: {
              resultado: {
                include: {
                  fatores: { include: { fator: true } },
                  aderencias: { include: { fatores: { include: { fator: true } } } },
                  iaResumos: { where: { status: 'OK' }, orderBy: { codIaResumo: 'desc' } },
                },
              },
            },
          },
        },
      });
      if (!convite) throw new BadRequestException('Nenhum convite de avaliação comportamental para esta candidatura');
      if (!convite.sessao?.resultado) return { ...convite, facetas: [] };

      const respostas = await tx.respostaComportamental.findMany({
        where: { codSes: convite.sessao.codSes },
        include: { pergunta: { include: { fator: true } }, escala: true },
      });
      const respostasFaceta: RespostaFaceta[] = respostas.map((r) => ({
        codFat: r.pergunta.fator.sigla,
        faceta: r.pergunta.categoria ?? 'Geral',
        tipo: r.pergunta.tipo as 'DIRETA' | 'REVERSA',
        peso: Number(r.pergunta.peso),
        valor: r.escala.valor,
      }));
      const facetas = calcularResultadoPorFaceta(respostasFaceta);

      // Fallback de aderência (RN-GP-009): se a vaga não tem perfil próprio configurado
      // (aderencias vazio), calcula ao vivo contra o padrão do tenant — nunca persiste,
      // mesmo padrão de "facetas" acima (só a aderência vaga-específica é persistida em TGPADERVAG).
      let aderenciaPadrao = null;
      if (convite.sessao.resultado.aderencias.length === 0) {
        const padrao = await tx.perfilComportamentalPadrao.findFirst({
          where: { ativo: 'S' },
          include: { fatores: { include: { fator: true } } },
        });
        if (padrao && padrao.fatores.length > 0) {
          const perfilFatores: PerfilVagaFator[] = padrao.fatores.map((pf) => ({
            codFat: pf.fator.sigla,
            minimo: pf.minimo,
            maximo: pf.maximo,
            peso: Number(pf.peso),
            eliminatorio: pf.eliminatorio === 'S',
          }));
          const resultadoFatores = convite.sessao.resultado.fatores.map((rf) => ({
            codFat: rf.fator.sigla,
            pontuacaoBruta: Number(rf.pontuacaoBruta),
            minimoPossivel: Number(rf.minimoPossivel),
            maximoPossivel: Number(rf.maximoPossivel),
            percentualNormalizado: Number(rf.percentualNormalizado),
            media: Number(rf.media),
            desvio: Number(rf.desvio),
            faixaInterpretativa: rf.faixaInterpretativa,
          }));
          const aderencia = calcularAderenciaVaga(resultadoFatores, perfilFatores);
          aderenciaPadrao = {
            aderenciaGeral: aderencia.aderenciaGeral,
            fatores: aderencia.fatores.map((af) => ({
              fator: { sigla: af.codFat, nome: padrao.fatores.find((pf) => pf.fator.sigla === af.codFat)!.fator.nome },
              distanciaFaixa: af.distanciaFaixa,
              aderenciaDimensao: af.aderenciaDimensao,
              dentroDaFaixa: af.dentroDaFaixa ? 'S' : 'N',
            })),
          };
        }
      }

      return { ...convite, facetas, aderenciaPadrao };
    });
  }
}
