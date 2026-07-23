import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { montarFunil, resumoRecusas, tempoMedioContratacao } from './relatorio-recrutamento';

type ReqAut = Request & { usuario: UsuarioAutenticado };

/**
 * Relatório consolidado de recrutamento (RN-REC-019).
 *
 * Havia KPIs por vaga e por canal, mas nada que respondesse "como vai o
 * recrutamento este mês" — a visão que o gestor precisa e que não existia.
 * Tudo aqui é **leitura** do que já está no banco; nenhuma tabela nova.
 */
@Controller('recrutamento/relatorio')
export class RelatorioController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissoes('recrutamento.candidatos.ler')
  async gerar(@Req() req: ReqAut, @Query('dias') dias?: string) {
    // Janela sobre a DATA DA CANDIDATURA: "candidaturas dos últimos N dias e o
    // que aconteceu com elas". Sem janela padrão longa, o relatório de um tenant
    // novo apareceria vazio sem explicação.
    const janelaDias = Math.min(Math.max(Number(dias) || 90, 1), 365);
    const desde = new Date(Date.now() - janelaDias * 24 * 60 * 60 * 1000);

    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const candidaturas = await tx.candidatura.findMany({
        where: { ativo: 'S', dhInc: { gte: desde } },
        select: { codCdt: true, estagio: true, dhInc: true },
      });
      const codCdts = candidaturas.map((c) => c.codCdt);

      const [eventos, propostas, vagasAbertas, novasVagas] = await Promise.all([
        codCdts.length
          ? tx.candidaturaHistorico.findMany({
              where: { codCdt: { in: codCdts }, tipoEvento: 'mudanca_estagio' },
              select: { codCdt: true, estagioNovo: true, dhInc: true },
            })
          : [],
        codCdts.length
          ? tx.proposta.findMany({
              where: { codCdt: { in: codCdts } },
              select: { status: true, motivoRecusa: true },
            })
          : [],
        tx.vaga.count({ where: { ativo: 'S', status: 'ABERTA' } }),
        tx.vaga.count({ where: { ativo: 'S', dhInc: { gte: desde } } }),
      ]);

      // A timeline nasce sem o evento inicial "applied" (a candidatura já entra
      // nesse estágio), então injetamos um por candidatura para o funil contar a
      // base corretamente.
      const eventosComBase = [
        ...candidaturas.map((c) => ({ codCdt: c.codCdt, estagioNovo: 'applied', dhInc: c.dhInc })),
        ...eventos.map((e) => ({ codCdt: e.codCdt, estagioNovo: e.estagioNovo ?? '', dhInc: e.dhInc })),
      ];

      const funil = montarFunil(candidaturas, eventosComBase);
      const tempoContratacao = tempoMedioContratacao(candidaturas, eventosComBase);
      const recusas = resumoRecusas(propostas);

      return {
        janelaDias,
        totais: {
          candidaturas: candidaturas.length,
          vagasAbertas,
          novasVagas,
          contratacoes: tempoContratacao?.baseContratacoes ?? 0,
        },
        funil,
        tempoContratacao,
        propostas: recusas,
      };
    });
  }
}
