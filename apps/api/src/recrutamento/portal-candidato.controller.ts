import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ZodError, z } from 'zod';
import type { Prisma } from '@prisma/client';
import { Publico } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { salvarCurriculo } from './armazenamento-curriculo';
import { extrairTextoCurriculo, tipoArquivoAceito } from './curriculo-extracao';
import { apurarPerfilCultural, dimensoesRespondidas } from './apurar-cultura';

const TAMANHO_MAX_BYTES = 8 * 1024 * 1024;
const TOTAL_DIMENSOES = 6;

const esquemaPerfil = z.object({
  fone: z.string().max(40).optional(),
  cidade: z.string().max(120).optional(),
  linkedin: z.string().max(300).optional(),
  cargoAtual: z.string().max(160).optional(),
});

const esquemaRespostas = z.object({
  respostas: z.array(z.object({ codCulPer: z.coerce.bigint(), valor: z.coerce.number().int().min(1).max(5) })).min(1),
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

/**
 * Portal do candidato — parte de **escrita** (RN-REC-014).
 *
 * O portal de acompanhamento já existia, mas só de leitura. Aqui o candidato
 * mantém os próprios dados, anexa currículo e responde o questionário cultural
 * — que antes era preenchido no chute pelo recrutador.
 *
 * Duas fronteiras que valem explicitar:
 *
 * 1. **O token é a credencial.** É opaco (ADR-0004 §5) e amarra numa
 *    candidatura, logo num candidato. Toda escrita aqui resolve o candidato a
 *    partir do token — nenhuma rota aceita `codCand` do cliente, senão o token
 *    de um viraria chave para editar outro.
 * 2. **O candidato edita só o que é dele.** Nome, e-mail e CPF ficam de fora:
 *    são a chave de deduplicação do banco de talentos (RN-REC-002) e mudá-los
 *    pelo portal quebraria a identidade do registro. Para corrigi-los, fala-se
 *    com o recrutador.
 */
@Controller('portal/candidato')
export class PortalCandidatoController {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve a candidatura pelo token e recusa portal de processo encerrado. */
  private async candidaturaPorToken(token: string) {
    const cdt = await this.prisma.admin.candidatura.findUnique({
      where: { tokenPub: token },
      select: { codCdt: true, codTen: true, codCand: true, estagio: true },
    });
    if (!cdt) throw new BadRequestException('Link inválido ou expirado');
    return cdt;
  }

  /** Dados que o candidato pode ver e manter sobre si. */
  @Publico()
  @Get(':token/perfil')
  async consultarPerfil(@Param('token') token: string) {
    const cdt = await this.candidaturaPorToken(token);
    const candidato = await this.prisma.admin.candidato.findUnique({
      where: { codCand: cdt.codCand },
      select: {
        nomeCand: true,
        email: true,
        fone: true,
        cidade: true,
        linkedin: true,
        cargoAtual: true,
        perfilCulturalOrigem: true,
        curriculos: { orderBy: { codCandCv: 'desc' }, take: 1, select: { dhInc: true } },
      },
    });
    if (!candidato) throw new BadRequestException('Link inválido ou expirado');
    return {
      // Nome e e-mail só de leitura — identificam o registro.
      nomeCand: candidato.nomeCand,
      email: candidato.email,
      fone: candidato.fone,
      cidade: candidato.cidade,
      linkedin: candidato.linkedin,
      cargoAtual: candidato.cargoAtual,
      curriculoEnviadoEm: candidato.curriculos[0]?.dhInc ?? null,
      culturaRespondida: candidato.perfilCulturalOrigem === 'CANDIDATO',
    };
  }

  @Publico()
  @Patch(':token/perfil')
  async atualizarPerfil(@Param('token') token: string, @Body() corpo: unknown) {
    const dados = validar(esquemaPerfil, corpo);
    const cdt = await this.candidaturaPorToken(token);
    const limpo = (v?: string) => (v?.trim() ? v.trim() : null);
    await this.prisma.admin.candidato.update({
      where: { codCand: cdt.codCand },
      data: {
        fone: limpo(dados.fone),
        cidade: limpo(dados.cidade),
        linkedin: limpo(dados.linkedin),
        cargoAtual: limpo(dados.cargoAtual),
      },
    });
    return { ok: true };
  }

  /** Currículo enviado pelo próprio candidato — mesma extração do upload interno. */
  @Publico()
  @Post(':token/curriculo')
  @UseInterceptors(FileInterceptor('arquivo'))
  async enviarCurriculo(@Param('token') token: string, @UploadedFile() arquivo?: Express.Multer.File) {
    const cdt = await this.candidaturaPorToken(token);
    if (!arquivo) throw new BadRequestException('Envie um arquivo no campo "arquivo"');
    if (arquivo.size > TAMANHO_MAX_BYTES) throw new BadRequestException('Arquivo maior que 8MB');
    const tipo = tipoArquivoAceito(arquivo.originalname, arquivo.mimetype);
    if (!tipo) throw new BadRequestException('Formato não suportado — use PDF, DOCX ou TXT');

    const extraido = await extrairTextoCurriculo({
      nomeArquivo: arquivo.originalname,
      mimetype: arquivo.mimetype,
      buffer: arquivo.buffer,
    });
    const caminho = await salvarCurriculo(cdt.codTen, tipo, arquivo.buffer);
    await this.prisma.admin.candidatoCurriculo.create({
      data: {
        codTen: cdt.codTen,
        codCand: cdt.codCand,
        arquivo: caminho,
        textoExtraido: extraido.texto || null,
      },
    });
    return { ok: true, statusExtracao: extraido.status };
  }

  /** Horários disponíveis para a entrevista, e o que o candidato já escolheu. */
  @Publico()
  @Get(':token/entrevista')
  async consultarEntrevista(@Param('token') token: string) {
    const cdt = await this.candidaturaPorToken(token);
    const candidatura = await this.prisma.admin.candidatura.findUnique({
      where: { codCdt: cdt.codCdt },
      select: { codVag: true },
    });
    const [horarios, marcada] = await Promise.all([
      this.prisma.admin.entrevistaHorario.findMany({
        where: { codVag: candidatura!.codVag, status: 'LIVRE', dhInicio: { gte: new Date() } },
        orderBy: { dhInicio: 'asc' },
        select: { codHor: true, dhInicio: true, duracaoMin: true, tipo: true, local: true },
      }),
      this.prisma.admin.entrevista.findFirst({
        where: { codCdt: cdt.codCdt, status: 'AGENDADA' },
        orderBy: { codEntrev: 'desc' },
        // `parecer` fica de fora: é anotação interna do entrevistador.
        select: { dhInicio: true, duracaoMin: true, tipo: true, local: true, linkReuniao: true },
      }),
    ]);
    return { horariosDisponiveis: horarios, entrevistaMarcada: marcada };
  }

  /**
   * O candidato reserva um horário.
   *
   * A reserva é uma atualização condicional (`LIVRE` → `RESERVADO`) e a
   * entrevista só é criada se ela pegou. Dois candidatos clicando no mesmo
   * horário ao mesmo tempo: o segundo recebe recusa, não uma agenda dupla.
   */
  @Publico()
  @Post(':token/entrevista')
  async escolherHorario(@Param('token') token: string, @Body() corpo: unknown) {
    const dados = validar(z.object({ codHor: z.coerce.bigint() }), corpo);
    const cdt = await this.candidaturaPorToken(token);

    const jaTem = await this.prisma.admin.entrevista.findFirst({
      where: { codCdt: cdt.codCdt, status: 'AGENDADA' },
    });
    if (jaTem) throw new BadRequestException('Você já tem uma entrevista marcada para esta vaga');

    const horario = await this.prisma.admin.entrevistaHorario.findUnique({ where: { codHor: dados.codHor } });
    if (!horario || horario.codTen !== cdt.codTen) throw new BadRequestException('Horário indisponível');

    const reservou = await this.prisma.admin.entrevistaHorario.updateMany({
      where: { codHor: dados.codHor, status: 'LIVRE' },
      data: { status: 'RESERVADO' },
    });
    if (reservou.count === 0) {
      throw new BadRequestException('Este horário acabou de ser reservado por outra pessoa. Escolha outro.');
    }

    const entrevista = await this.prisma.admin.entrevista.create({
      data: {
        codTen: cdt.codTen,
        codCdt: cdt.codCdt,
        codHor: horario.codHor,
        dhInicio: horario.dhInicio,
        duracaoMin: horario.duracaoMin,
        tipo: horario.tipo,
        local: horario.local,
        linkReuniao: horario.linkReuniao,
        codUsuEntrev: horario.codUsuEntrev,
      },
      select: { codEntrev: true, dhInicio: true, tipo: true, local: true, linkReuniao: true },
    });

    await this.prisma.admin.candidaturaHistorico.create({
      data: {
        codTen: cdt.codTen,
        codCdt: cdt.codCdt,
        tipoEvento: 'entrevista_agendada',
        rotuloPub: 'Entrevista agendada',
        tipoAtor: 'candidato',
        metadadosJson: { codEntrev: entrevista.codEntrev.toString() },
      },
    });
    return entrevista;
  }

  /** Questionário cultural: afirmações do catálogo + o que já foi respondido. */
  @Publico()
  @Get(':token/cultura')
  async consultarCultura(@Param('token') token: string) {
    const cdt = await this.candidaturaPorToken(token);
    const [perguntas, respostas] = await Promise.all([
      this.prisma.admin.perguntaCultural.findMany({
        where: { ativo: 'S' },
        orderBy: { ordem: 'asc' },
        select: { codCulPer: true, texto: true, dimensao: true },
      }),
      this.prisma.admin.respostaCultural.findMany({
        where: { codCand: cdt.codCand },
        select: { codCulPer: true, valor: true },
      }),
    ]);
    const porPergunta = new Map(respostas.map((r) => [r.codCulPer.toString(), r.valor]));
    return {
      // `dimensao` e `reversa` não saem daqui: saber que uma afirmação é
      // invertida, ou a que dimensão pertence, ensina a responder na direção
      // desejada — e aí a medida deixa de medir.
      perguntas: perguntas.map((p) => ({
        codCulPer: p.codCulPer,
        texto: p.texto,
        respondida: porPergunta.get(p.codCulPer.toString()) ?? null,
      })),
      total: perguntas.length,
      respondidas: respostas.length,
    };
  }

  /**
   * Salva as respostas e apura o perfil.
   *
   * Idempotente por pergunta (`upsert`): o candidato pode voltar e corrigir
   * antes de terminar, como no questionário comportamental.
   */
  @Publico()
  @Post(':token/cultura')
  async responderCultura(@Param('token') token: string, @Body() corpo: unknown) {
    const dados = validar(esquemaRespostas, corpo);
    const cdt = await this.candidaturaPorToken(token);

    const perguntas = await this.prisma.admin.perguntaCultural.findMany({
      where: { ativo: 'S' },
      select: { codCulPer: true, dimensao: true, reversa: true },
    });
    const porCodigo = new Map(perguntas.map((p) => [p.codCulPer.toString(), p]));
    for (const r of dados.respostas) {
      if (!porCodigo.has(r.codCulPer.toString())) {
        throw new BadRequestException('Pergunta inexistente no questionário');
      }
    }

    for (const r of dados.respostas) {
      await this.prisma.admin.respostaCultural.upsert({
        where: { codCand_codCulPer: { codCand: cdt.codCand, codCulPer: r.codCulPer } },
        create: { codTen: cdt.codTen, codCand: cdt.codCand, codCulPer: r.codCulPer, valor: r.valor },
        update: { valor: r.valor },
      });
    }

    const todas = await this.prisma.admin.respostaCultural.findMany({
      where: { codCand: cdt.codCand },
      select: { valor: true, codCulPer: true },
    });
    const paraApuracao = todas.map((t) => {
      const p = porCodigo.get(t.codCulPer.toString())!;
      return { dimensao: p.dimensao, reversa: p.reversa, valor: t.valor };
    });

    // O perfil só substitui o que existe quando **todas** as dimensões foram
    // respondidas: um perfil parcial compararia o candidato com a vaga em
    // metade dos eixos e chamaria isso de fit cultural.
    const completo = dimensoesRespondidas(paraApuracao) === TOTAL_DIMENSOES;
    if (completo) {
      await this.prisma.admin.candidato.update({
        where: { codCand: cdt.codCand },
        data: {
          perfilCulturalJson: apurarPerfilCultural(paraApuracao) as Prisma.InputJsonValue,
          perfilCulturalOrigem: 'CANDIDATO',
          perfilCulturalDh: new Date(),
        },
      });
    }
    return {
      respondidas: todas.length,
      dimensoesRespondidas: dimensoesRespondidas(paraApuracao),
      completo,
    };
  }
}
