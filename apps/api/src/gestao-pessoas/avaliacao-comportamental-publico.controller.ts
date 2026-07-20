import { BadRequestException, Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Publico } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import {
  calcularAderenciaVaga,
  calcularConsistencia,
  calcularResultadoPorFator,
  VERSAO_ALGORITMO,
  type PerfilVagaFator,
  type RespostaFator,
} from './calcular-resultado';

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

/** Embaralho determinístico (mesmo token => mesma ordem) — RN-GP-003: nunca revela fator/tipo. */
function embaralharDeterministico<T>(itens: T[], semente: string): T[] {
  let s = 0;
  for (let i = 0; i < semente.length; i++) s = (s * 31 + semente.charCodeAt(i)) >>> 0;
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

async function buscarConvite(prisma: PrismaService, token: string) {
  const convite = await prisma.admin.conviteComportamental.findUnique({
    where: { tokenPub: token },
    include: {
      modelo: { include: { perguntas: { include: { pergunta: true }, orderBy: { ordem: 'asc' } } } },
      sessao: true,
    },
  });
  if (!convite) throw new BadRequestException('Link inválido ou expirado');
  if (convite.dhExpiracao && convite.dhExpiracao < new Date()) {
    throw new BadRequestException('Link expirado');
  }
  return convite;
}

/**
 * Portal público do candidato (token opaco — ADR-0004 §5, mesmo padrão de
 * Admissão Digital). Sem login — usa prisma.admin (bypassa RLS, mesma
 * justificativa do lookup por token em assinaturas/admissão).
 */
@Controller('avaliacao-comportamental/publico')
export class AvaliacaoComportamentalPublicoController {
  constructor(private readonly prisma: PrismaService) {}

  @Publico()
  @Get(':token')
  async consultar(@Param('token') token: string) {
    const convite = await buscarConvite(this.prisma, token);

    const respostas = convite.sessao
      ? await this.prisma.admin.respostaComportamental.findMany({
          where: { codSes: convite.sessao.codSes },
          include: { escala: true },
        })
      : [];
    const respostaPorPergunta = new Map(respostas.map((r) => [r.codPer.toString(), r.escala.valor]));

    const perguntas = embaralharDeterministico(convite.modelo.perguntas, token).map((mp) => ({
      codPer: mp.pergunta.codPer.toString(),
      texto: mp.pergunta.texto,
      respondida: respostaPorPergunta.get(mp.pergunta.codPer.toString()) ?? null,
    }));

    return {
      status: convite.status,
      tempoEstimadoMin: convite.modelo.tempoEstimadoMin,
      tempoEstimadoMax: convite.modelo.tempoEstimadoMax,
      consentimentoAceito: !!convite.sessao,
      concluido: !!convite.sessao?.dhConclusao,
      totalPerguntas: convite.modelo.perguntas.length,
      totalRespondidas: respostas.length,
      perguntas,
    };
  }

  @Publico()
  @Post(':token/consentimento')
  async aceitarConsentimento(@Req() req: Request, @Param('token') token: string) {
    const convite = await buscarConvite(this.prisma, token);
    if (convite.sessao) return { codSes: convite.sessao.codSes.toString() };

    const sessao = await this.prisma.admin.sessaoComportamental.create({
      data: { codTen: convite.codTen, codConv: convite.codConv },
    });
    await this.prisma.admin.consentimentoComportamental.create({
      data: { codTen: convite.codTen, codSes: sessao.codSes, ip: req.ip },
    });
    if (convite.status === 'PENDENTE') {
      await this.prisma.admin.conviteComportamental.update({ where: { codConv: convite.codConv }, data: { status: 'ACEITO' } });
    }
    return { codSes: sessao.codSes.toString() };
  }

  /** Salva uma resposta (autosave) — idempotente, pode reenviar a mesma pergunta pra corrigir antes de finalizar. */
  @Publico()
  @Post(':token/responder')
  async responder(@Param('token') token: string, @Body() corpo: unknown) {
    const dados = validar(z.object({ codPer: z.coerce.bigint(), valor: z.coerce.number().int().min(1).max(5) }), corpo);
    const convite = await buscarConvite(this.prisma, token);
    if (!convite.sessao) throw new BadRequestException('Aceite o termo de ciência antes de responder');
    if (convite.sessao.dhConclusao) throw new BadRequestException('Avaliação já concluída');

    const escala = await this.prisma.admin.escalaResposta.findFirst({
      where: { tipoEscala: 'NORMATIVA_1_5', valor: dados.valor },
    });
    if (!escala) throw new BadRequestException('Valor de resposta inválido');

    await this.prisma.admin.respostaComportamental.upsert({
      where: { codSes_codPer: { codSes: convite.sessao.codSes, codPer: dados.codPer } },
      update: { codEsc: escala.codEsc },
      create: { codTen: convite.codTen, codSes: convite.sessao.codSes, codPer: dados.codPer, codEsc: escala.codEsc },
    });
    await this.prisma.admin.sessaoComportamental.update({
      where: { codSes: convite.sessao.codSes },
      data: { codUltimaPergunta: dados.codPer },
    });
    return { ok: true };
  }

  /** Calcula e persiste o resultado (RN-GP-005/006) — exige todas as perguntas do modelo respondidas. */
  @Publico()
  @Post(':token/finalizar')
  async finalizar(@Param('token') token: string) {
    const convite = await buscarConvite(this.prisma, token);
    if (!convite.sessao) throw new BadRequestException('Aceite o termo de ciência antes de finalizar');
    if (convite.sessao.dhConclusao) throw new BadRequestException('Avaliação já concluída');

    const totalPerguntas = convite.modelo.perguntas.length;
    const respostas = await this.prisma.admin.respostaComportamental.findMany({
      where: { codSes: convite.sessao.codSes },
      include: { pergunta: { include: { fator: true } }, escala: true },
    });
    if (respostas.length < totalPerguntas) {
      throw new BadRequestException(`Faltam ${totalPerguntas - respostas.length} pergunta(s) para finalizar`);
    }

    const fatorPorSigla = new Map(respostas.map((r) => [r.pergunta.fator.sigla, r.pergunta.fator]));
    const respostasFator: RespostaFator[] = respostas.map((r) => ({
      codFat: r.pergunta.fator.sigla,
      tipo: r.pergunta.tipo as 'DIRETA' | 'REVERSA',
      peso: Number(r.pergunta.peso),
      valor: r.escala.valor,
    }));
    const resultadoFatores = calcularResultadoPorFator(respostasFator);
    const consistencia = calcularConsistencia(respostas.map((r) => r.escala.valor));

    const dhConclusao = new Date();
    const tempoTotalSeg = Math.round((dhConclusao.getTime() - convite.sessao.dhInicio.getTime()) / 1000);

    const resultado = await this.prisma.admin.resultadoComportamental.create({
      data: {
        codTen: convite.codTen,
        codSes: convite.sessao.codSes,
        versaoAlgoritmo: VERSAO_ALGORITMO,
        versaoMod: convite.modelo.versao,
        indicadorConsistencia: consistencia.indicadorConsistencia,
        percRespNeutras: consistencia.percRespNeutras,
        percRespUniformes: consistencia.percRespUniformes,
        tempoTotalSeg,
      },
    });
    await this.prisma.admin.resultadoComportamentalFator.createMany({
      data: resultadoFatores.map((rf) => ({
        codTen: convite.codTen,
        codResult: resultado.codResult,
        codFat: fatorPorSigla.get(rf.codFat)!.codFat,
        pontuacaoBruta: rf.pontuacaoBruta,
        minimoPossivel: rf.minimoPossivel,
        maximoPossivel: rf.maximoPossivel,
        percentualNormalizado: rf.percentualNormalizado,
        media: rf.media,
        desvio: rf.desvio,
        faixaInterpretativa: rf.faixaInterpretativa,
      })),
    });
    await this.prisma.admin.sessaoComportamental.update({
      where: { codSes: convite.sessao.codSes },
      data: { dhConclusao, tempoTotalSeg },
    });

    // Aderência à vaga (RN-GP-009) — só quando a vaga desta candidatura tem perfil comportamental configurado.
    const candidatura = await this.prisma.admin.candidatura.findFirst({
      where: { codCdt: convite.codCdt },
      include: { vaga: { include: { perfisComportamentais: { where: { ativo: 'S' }, include: { fatores: { include: { fator: true } } } } } } },
    });
    const perfilVaga = candidatura?.vaga.perfisComportamentais[0];
    let aderenciaCalculada = null;
    if (perfilVaga && perfilVaga.fatores.length > 0) {
      const perfilFatores: PerfilVagaFator[] = perfilVaga.fatores.map((pf) => ({
        codFat: pf.fator.sigla,
        minimo: pf.minimo,
        maximo: pf.maximo,
        peso: Number(pf.peso),
        eliminatorio: pf.eliminatorio === 'S',
      }));
      const aderencia = calcularAderenciaVaga(resultadoFatores, perfilFatores);

      const aderVag = await this.prisma.admin.aderenciaComportamentalVaga.create({
        data: {
          codTen: convite.codTen,
          codResult: resultado.codResult,
          codPerVag: perfilVaga.codPerVag,
          aderenciaGeral: aderencia.aderenciaGeral,
          versao: VERSAO_ALGORITMO,
        },
      });
      await this.prisma.admin.aderenciaComportamentalVagaFator.createMany({
        data: aderencia.fatores.map((af) => ({
          codTen: convite.codTen,
          codAderVag: aderVag.codAderVag,
          codFat: fatorPorSigla.get(af.codFat)!.codFat,
          distanciaFaixa: af.distanciaFaixa,
          aderenciaDimensao: af.aderenciaDimensao,
          dentroDaFaixa: af.dentroDaFaixa ? 'S' : 'N',
        })),
      });
      aderenciaCalculada = { codAderVag: aderVag.codAderVag, aderenciaGeral: aderencia.aderenciaGeral };
    }

    return {
      codResult: resultado.codResult,
      indicadorConsistencia: resultado.indicadorConsistencia,
      fatores: resultadoFatores,
      aderencia: aderenciaCalculada,
    };
  }
}
