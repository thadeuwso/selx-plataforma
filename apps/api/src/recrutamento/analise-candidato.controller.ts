import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { calcularScoreRequisito, type AutoavaliacaoResp } from './calcular-match';
import {
  EsquemaAnalise,
  PROMPT_SISTEMA,
  VERSAO_PROMPT,
  montarEvidencias,
  montarPromptUsuario,
  normalizarAnalise,
  type DossieAnalise,
} from './analise-candidato';

type ReqAut = Request & { usuario: UsuarioAutenticado };

/**
 * Análise de candidato por IA (RN-REC-013).
 *
 * A IA recebe um dossiê inteiramente determinístico — vaga, requisitos com a
 * evidência localizada no currículo, match já calculado, respostas de triagem e
 * resultado comportamental — e devolve leitura em linguagem de recrutador.
 * Nenhum número sai daqui: o score continua sendo do motor determinístico.
 */
@Controller('candidaturas/:codCdt/analise-ia')
export class AnaliseCandidatoController {
  constructor(private readonly prisma: PrismaService) {}

  /** Última análise guardada, com aviso se o dossiê mudou desde então. */
  @Get()
  @Permissoes('recrutamento.candidatos.ler')
  async consultar(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    const dados = await this.reunirDossie(req, codCdt);
    const analise = await this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.iAAnaliseCandidatura.findFirst({
        where: { codCdt: BigInt(codCdt), status: 'OK' },
        orderBy: { codIaAnalise: 'desc' },
      }),
    );
    if (!analise) return null;
    return {
      ...analise,
      // Currículo novo ou avaliação concluída depois da análise mudam o hash:
      // em vez de reprocessar sozinho (chamada paga), avisa e deixa a decisão
      // com o recrutador.
      desatualizada: analise.hashEntrada !== dados.hash,
    };
  }

  /** Gera a análise. Reaproveita a guardada quando o dossiê não mudou. */
  @Post()
  @Permissoes('recrutamento.candidatos.criar')
  async gerar(@Req() req: ReqAut, @Param('codCdt') codCdt: string) {
    const codTen = req.usuario.codTen;
    const dados = await this.reunirDossie(req, codCdt);

    const existente = await this.prisma.executarNoTenant(codTen, (tx) =>
      tx.iAAnaliseCandidatura.findFirst({
        where: { codCdt: BigInt(codCdt), hashEntrada: dados.hash, status: 'OK' },
        orderBy: { codIaAnalise: 'desc' },
      }),
    );
    if (existente) return { ...existente, desatualizada: false, reaproveitada: true };

    // Fora de transação: chamada a LLM leva dezenas de segundos e estoura o
    // timeout de transação interativa do Prisma (5s). Mesma lição já registrada
    // no resumo comportamental.
    const resultado = await this.chamarGateway(codTen, dados.provedorIa, dados.dossie);

    const salva = await this.prisma.executarNoTenant(codTen, (tx) =>
      tx.iAAnaliseCandidatura.create({
        data: {
          codTen,
          codCdt: BigInt(codCdt),
          conteudoJson: normalizarAnalise(resultado.conteudo) as Prisma.InputJsonValue,
          hashEntrada: dados.hash,
          provedor: resultado.provedor,
          modeloUsado: resultado.modelo,
          versaoPrompt: VERSAO_PROMPT,
          duracaoMs: resultado.duracaoMs,
          codUsuInc: req.usuario.codUsu,
        },
      }),
    );
    return { ...salva, desatualizada: false, reaproveitada: false };
  }

  /**
   * Reúne tudo o que a IA verá. Nada aqui é inferido: são leituras do banco e
   * do motor de match, montadas na mesma ordem sempre — o hash depende disso.
   */
  private async reunirDossie(req: ReqAut, codCdt: string) {
    const codTen = req.usuario.codTen;

    const contexto = await this.prisma.executarNoTenant(codTen, async (tx) => {
      const cdt = await tx.candidatura.findFirst({
        where: { codCdt: BigInt(codCdt), ativo: 'S' },
        include: {
          candidato: {
            select: {
              nomeCand: true,
              cidade: true,
              cargoAtual: true,
              curriculos: { orderBy: { codCandCv: 'desc' }, take: 1, select: { textoExtraido: true } },
            },
          },
          vaga: {
            include: {
              requisitos: { where: { ativo: 'S' } },
              perguntas: { where: { ativo: 'S' } },
            },
          },
          match: true,
        },
      });
      if (!cdt) throw new BadRequestException('Candidatura inexistente neste tenant');

      const convite = await tx.conviteComportamental.findFirst({
        where: { codCdt: cdt.codCdt },
        orderBy: { codConv: 'desc' },
        include: {
          sessao: {
            include: {
              resultado: {
                include: { fatores: { include: { fator: true } }, aderencias: true },
              },
            },
          },
        },
      });
      const cfgIa = await tx.configuracaoIa.findFirst({ where: { codTen }, select: { provedorIa: true } });
      return { cdt, convite, provedorIa: cfgIa?.provedorIa ?? 'nuvem' };
    });

    const { cdt, convite } = contexto;
    const curriculo = cdt.candidato.curriculos[0]?.textoExtraido ?? null;
    const autoavaliacoes = (cdt.autoavaliacaoJson ?? {}) as unknown as Record<string, AutoavaliacaoResp>;

    const requisitosAuditaveis = montarEvidencias(
      cdt.vaga.requisitos.map((r) => ({ descrReq: r.descrReq, tipoReq: r.tipoReq })),
      curriculo,
    );

    const resultado = convite?.sessao?.resultado ?? null;
    const dossie: DossieAnalise = {
      vaga: {
        titulo: cdt.vaga.titulo,
        senioridade: cdt.vaga.senioridade,
        local: cdt.vaga.local,
        modeloTrab: cdt.vaga.modeloTrab,
        descricao: cdt.vaga.descrVag,
      },
      requisitosAuditaveis,
      matchDeterministico: cdt.match
        ? {
            scoreGeral: cdt.match.scoreGeral,
            scoreContratacao: cdt.match.scoreContratacao,
            scoreCultura: cdt.match.scoreCultura,
            driverPrincipal: cdt.match.driverPrincipal,
            qtdGapsCriticos: cdt.match.qtdGapsCrit,
            porRequisito: cdt.vaga.requisitos.map((r) => ({
              requisito: r.descrReq,
              tipo: r.tipoReq,
              score: Math.round(
                calcularScoreRequisito(
                  {
                    codVagReq: r.codVagReq.toString(),
                    descrReq: r.descrReq,
                    tipoReq: r.tipoReq as 'OBRIGATORIO' | 'DESEJAVEL',
                    peso: r.peso,
                    nivelEsperado: r.nivelEsperado,
                    tempoEspMeses: r.tempoEspMeses,
                  },
                  autoavaliacoes[r.codVagReq.toString()],
                ) * 100,
              ),
            })),
          }
        : null,
      comportamental: resultado
        ? {
            indicadorConsistencia: resultado.indicadorConsistencia,
            fatores: resultado.fatores.map((f) => ({
              sigla: f.fator.sigla,
              nome: f.fator.nome,
              percentual: Number(f.percentualNormalizado),
              faixa: f.faixaInterpretativa,
            })),
            aderenciaGeralVaga: resultado.aderencias[0] ? Number(resultado.aderencias[0].aderenciaGeral) : null,
          }
        : null,
      respostasTriagem: cdt.vaga.perguntas.map((p) => ({
        pergunta: p.pergunta,
        resposta: (cdt.respostasJson as Record<string, unknown> | null)?.[p.codVagPer.toString()] ?? null,
        respostaEliminatoria: p.respElimina,
      })),
      curriculo,
    };

    // Hash sobre o dossiê inteiro: qualquer insumo que mude (currículo novo,
    // avaliação concluída, requisito editado) invalida a análise guardada.
    const hash = createHash('sha256').update(JSON.stringify(dossie)).digest('hex');
    return { dossie, hash, provedorIa: contexto.provedorIa };
  }

  private async chamarGateway(codTen: bigint, provedorIa: string, dossie: DossieAnalise) {
    const baseUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';
    const inicio = Date.now();
    let resp: Response;
    try {
      resp = await fetch(`${baseUrl}/v1/ia/gerar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          purpose: VERSAO_PROMPT,
          cod_ten: Number(codTen),
          mensagens: [
            { papel: 'system', conteudo: PROMPT_SISTEMA },
            { papel: 'user', conteudo: montarPromptUsuario(dossie) },
          ],
          orcamento_tokens: 2400,
          provedor_preferido: provedorIa === 'local' ? 'local' : 'nuvem',
          esquema_saida: EsquemaAnalise,
        }),
        signal: AbortSignal.timeout(180_000),
      });
    } catch {
      throw new ServiceUnavailableException({
        codigo: 'IA_INDISPONIVEL',
        mensagem: 'Serviço de IA não respondeu.',
      });
    }
    const duracaoMs = Date.now() - inicio;
    const json = (await resp.json().catch(() => null)) as {
      detail?: unknown;
      conteudo?: unknown;
      modelo?: string;
      provedor?: string;
    } | null;
    if (!resp.ok) {
      throw new ServiceUnavailableException(
        json?.detail ?? { codigo: 'IA_ERRO', mensagem: 'Falha ao gerar a análise.' },
      );
    }
    return {
      conteudo: json?.conteudo,
      modelo: json?.modelo ?? null,
      provedor: json?.provedor ?? null,
      duracaoMs,
    };
  }
}
