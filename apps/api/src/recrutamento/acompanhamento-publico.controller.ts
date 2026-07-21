import { BadRequestException, Controller, Get, Param } from '@nestjs/common';
import { Publico } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';

/**
 * Portal de acompanhamento do candidato — sem login, por token opaco
 * (ADR-0004 §5). Reúne num só lugar tudo que o candidato precisa: em que pé
 * está o processo e o que está pendente da parte dele.
 *
 * Regra central: **nada de dado interno vaza aqui.** Score de match,
 * sinalização de knockout, notas internas do recrutador e nome do estágio
 * técnico ficam de fora — o candidato vê o rótulo público (`ROTULOPUB`, campo
 * criado justamente para isso) e o estágio traduzido.
 */

/** Tradução do estágio técnico para linguagem de candidato. */
const ESTAGIO_PUBLICO: Record<string, { rotulo: string; descricao: string; encerrado?: boolean }> = {
  applied: { rotulo: 'Candidatura recebida', descricao: 'Recebemos sua candidatura e ela entrou na fila de análise.' },
  screening: { rotulo: 'Em triagem', descricao: 'Estamos conferindo seu perfil frente aos requisitos da vaga.' },
  analysis: { rotulo: 'Em análise', descricao: 'Seu perfil está sendo analisado pela equipe de recrutamento.' },
  shortlist: { rotulo: 'Selecionado para a próxima etapa', descricao: 'Você avançou para a lista de finalistas.' },
  interview: { rotulo: 'Entrevista', descricao: 'Você está na etapa de entrevistas.' },
  offer: { rotulo: 'Proposta', descricao: 'Há uma proposta em andamento para você.' },
  hired: { rotulo: 'Contratado', descricao: 'Parabéns! Seu processo de admissão está em andamento.' },
  approved: { rotulo: 'Aprovado', descricao: 'Você foi aprovado no processo.' },
  knockout: { rotulo: 'Processo encerrado', descricao: 'Sua candidatura não seguiu nesta vaga.', encerrado: true },
  not_selected: { rotulo: 'Processo encerrado', descricao: 'Desta vez não seguimos com a sua candidatura.', encerrado: true },
  rejected: { rotulo: 'Processo encerrado', descricao: 'Desta vez não seguimos com a sua candidatura.', encerrado: true },
  archived: { rotulo: 'Processo encerrado', descricao: 'Esta candidatura foi arquivada.', encerrado: true },
};

@Controller('acompanhamento/publico')
export class AcompanhamentoPublicoController {
  constructor(private readonly prisma: PrismaService) {}

  @Publico()
  @Get(':token')
  async consultar(@Param('token') token: string) {
    const cdt = await this.prisma.admin.candidatura.findUnique({
      where: { tokenPub: token },
      select: {
        estagio: true,
        dhInc: true,
        candidato: { select: { nomeCand: true } },
        vaga: { select: { titulo: true, local: true, empresa: { select: { nomeFantasia: true } } } },
        // Só eventos com rótulo público: o resto da timeline é interno.
        timeline: {
          where: { rotuloPub: { not: null } },
          orderBy: { codCdtHis: 'asc' },
          select: { rotuloPub: true, dhInc: true },
        },
        convitesComportamentais: {
          orderBy: { codConv: 'desc' },
          take: 1,
          select: { tokenPub: true, status: true, sessao: { select: { dhConclusao: true } } },
        },
        processoAdmissao: { select: { status: true, tokenPub: true } },
      },
    });
    if (!cdt) throw new BadRequestException('Link inválido ou expirado');

    const estagio = ESTAGIO_PUBLICO[cdt.estagio] ?? {
      rotulo: 'Em andamento',
      descricao: 'Sua candidatura está em análise.',
    };

    // O que depende do candidato agora — o portal existe principalmente para isto.
    const pendencias: { tipo: string; rotulo: string; url: string }[] = [];
    const convite = cdt.convitesComportamentais[0];
    if (convite && !convite.sessao?.dhConclusao && !['REVOGADO', 'EXPIRADO'].includes(convite.status)) {
      pendencias.push({
        tipo: 'AVALIACAO_COMPORTAMENTAL',
        rotulo: 'Responder a avaliação comportamental',
        url: `/avaliacao-comportamental/${convite.tokenPub}`,
      });
    }
    if (cdt.processoAdmissao && ['AGUARDANDO_CANDIDATO', 'AJUSTES_SOLICITADOS'].includes(cdt.processoAdmissao.status)) {
      pendencias.push({
        tipo: 'ADMISSAO',
        rotulo:
          cdt.processoAdmissao.status === 'AJUSTES_SOLICITADOS'
            ? 'Corrigir os dados da admissão'
            : 'Preencher os dados da admissão',
        url: `/admissao/${cdt.processoAdmissao.tokenPub}`,
      });
    }

    return {
      candidato: cdt.candidato.nomeCand,
      vaga: { titulo: cdt.vaga.titulo, local: cdt.vaga.local, empresa: cdt.vaga.empresa.nomeFantasia },
      dhCandidatura: cdt.dhInc,
      estagio: { rotulo: estagio.rotulo, descricao: estagio.descricao, encerrado: estagio.encerrado ?? false },
      etapas: cdt.timeline.map((e) => ({ rotulo: e.rotuloPub, dhInc: e.dhInc })),
      pendencias,
    };
  }
}
