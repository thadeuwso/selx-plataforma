import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { salvarCurriculo } from './armazenamento-curriculo';
import {
  detectarContatoNoTexto,
  detectarNomeNoTexto,
  extrairTextoCurriculo,
  tipoArquivoAceito,
} from './curriculo-extracao';

/** Teto por lote — a extração é síncrona e serial; acima disso a requisição fica longa demais. */
const ARQUIVOS_MAX_LOTE = 20;
const TAMANHO_MAX_BYTES = 8 * 1024 * 1024;

const esquemaLote = z.object({
  codCanal: z.coerce.bigint(),
  /** Opcional: com vaga, cada currículo vira candidatura; sem vaga, só entra no banco de talentos. */
  codVag: z.coerce.bigint().optional(),
});

type ReqAut = Request & { usuario: UsuarioAutenticado };

type StatusItem = 'importado' | 'reaproveitado' | 'ignorado';

interface ItemLote {
  arquivo: string;
  status: StatusItem;
  motivo?: string;
  codCand?: string;
  codCdt?: string;
  nomeCand?: string;
  email?: string;
}

/**
 * Importação de currículos em lote (item pendente do módulo desde a v1, que só
 * aceitava um arquivo por vez e exigia o candidato já cadastrado).
 *
 * Aqui o candidato **nasce do arquivo**: extrai o texto, deduz nome/e-mail/telefone
 * por heurística mecânica (sem IA — mesma extração de sempre) e cria o cadastro.
 *
 * Duas decisões que valem explicar:
 *
 * 1. **Sem e-mail, não importa.** O e-mail é a chave de deduplicação do banco de
 *    talentos (RN-REC-002) e o único jeito de falar com a pessoa. Sem ele o
 *    registro entraria duplicado e mudo. O arquivo volta como `ignorado`, com
 *    motivo, para o recrutador cadastrar à mão — melhor que sujar a base.
 * 2. **Candidato que já existe não é sobrescrito.** O nome vindo do lote é um
 *    palpite; o cadastro existente foi curado por alguém. O currículo novo é
 *    anexado, o cadastro fica como está.
 *
 * Também não se calcula match aqui: sem autoavaliação, a fórmula devolveria zero,
 * e um zero é indistinguível de quem foi de fato mal avaliado. Candidatura
 * importada aparece sem score até alguém responder — ausência é o dado honesto.
 */
@Controller('candidatos')
export class ImportacaoLoteController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('importar-lote')
  @Permissoes('recrutamento.candidatos.criar')
  @UseInterceptors(FilesInterceptor('arquivos', ARQUIVOS_MAX_LOTE))
  async importarLote(
    @Req() req: ReqAut,
    @Body() corpo: unknown,
    @UploadedFiles() arquivos?: Express.Multer.File[],
  ) {
    let dados: z.infer<typeof esquemaLote>;
    try {
      dados = esquemaLote.parse(corpo);
    } catch (erro) {
      if (erro instanceof ZodError) {
        throw new BadRequestException({ mensagem: 'Dados inválidos', detalhes: erro.issues });
      }
      throw erro;
    }

    if (!arquivos?.length) throw new BadRequestException('Envie ao menos um arquivo no campo "arquivos"');
    if (arquivos.length > ARQUIVOS_MAX_LOTE) {
      throw new BadRequestException(`No máximo ${ARQUIVOS_MAX_LOTE} arquivos por lote`);
    }

    const codTen = req.usuario.codTen;
    const codUsu = req.usuario.codUsu;

    // Canal e vaga são validados uma vez, antes de processar arquivo nenhum —
    // não faz sentido extrair 20 currículos para descobrir no fim que a vaga não existe.
    const contexto = await this.prisma.executarNoTenant(codTen, async (tx) => {
      const canal = await tx.canal.findFirst({ where: { codCanal: dados.codCanal, ativo: 'S' } });
      if (!canal) throw new BadRequestException('Canal de captação inexistente');
      if (!dados.codVag) return { canal, vaga: null };
      const vaga = await tx.vaga.findFirst({ where: { codVag: dados.codVag, ativo: 'S' } });
      if (!vaga) throw new BadRequestException('Vaga inexistente neste tenant');
      if (vaga.status !== 'ABERTA') throw new BadRequestException('A vaga precisa estar ABERTA para receber candidaturas');
      return { canal, vaga };
    });

    const itens: ItemLote[] = [];
    for (const arquivo of arquivos) {
      itens.push(await this.processarArquivo(arquivo, contexto, codTen, codUsu));
    }

    return {
      total: itens.length,
      importados: itens.filter((i) => i.status === 'importado').length,
      reaproveitados: itens.filter((i) => i.status === 'reaproveitado').length,
      ignorados: itens.filter((i) => i.status === 'ignorado').length,
      itens,
    };
  }

  /**
   * Um arquivo por vez, cada um na própria transação: um currículo ilegível no
   * meio do lote não pode desfazer os que já entraram.
   */
  private async processarArquivo(
    arquivo: Express.Multer.File,
    contexto: { canal: { codCanal: bigint; nomeCanal: string }; vaga: { codVag: bigint } | null },
    codTen: bigint,
    codUsu: bigint,
  ): Promise<ItemLote> {
    const nome = arquivo.originalname;

    if (arquivo.size > TAMANHO_MAX_BYTES) {
      return { arquivo: nome, status: 'ignorado', motivo: 'Arquivo maior que 8MB' };
    }
    const tipo = tipoArquivoAceito(nome, arquivo.mimetype);
    if (!tipo) {
      return { arquivo: nome, status: 'ignorado', motivo: 'Formato não suportado — use PDF, DOCX ou TXT' };
    }

    const extraido = await extrairTextoCurriculo({
      nomeArquivo: nome,
      mimetype: arquivo.mimetype,
      buffer: arquivo.buffer,
    });
    if (extraido.status !== 'ok' || !extraido.texto) {
      return {
        arquivo: nome,
        status: 'ignorado',
        motivo: extraido.mensagemErro ?? 'Não foi possível extrair texto (PDF digitalizado?)',
      };
    }

    const contato = detectarContatoNoTexto(extraido.texto);
    if (!contato.email) {
      return { arquivo: nome, status: 'ignorado', motivo: 'Nenhum e-mail encontrado no currículo' };
    }
    const nomeCand = detectarNomeNoTexto(extraido.texto, nome);
    if (!nomeCand) {
      return { arquivo: nome, status: 'ignorado', motivo: 'Não foi possível identificar o nome do candidato' };
    }

    const email = contato.email.toLowerCase();
    const caminhoRelativo = await salvarCurriculo(codTen, tipo, arquivo.buffer);

    return this.prisma.executarNoTenant(codTen, async (tx) => {
      const existente = await tx.candidato.findFirst({ where: { email, ativo: 'S' } });
      const candidato =
        existente ??
        (await tx.candidato.create({
          data: { codTen, nomeCand, email, fone: contato.fone, codUsuInc: codUsu },
        }));

      await tx.candidatoCurriculo.create({
        data: { codTen, codCand: candidato.codCand, arquivo: caminhoRelativo, textoExtraido: extraido.texto },
      });

      const item: ItemLote = {
        arquivo: nome,
        status: existente ? 'reaproveitado' : 'importado',
        codCand: candidato.codCand.toString(),
        nomeCand: candidato.nomeCand,
        email: candidato.email,
      };
      if (!contexto.vaga) return item;

      // Reentrada na mesma vaga não cria candidatura duplicada (RN-REC-003).
      const candidaturaExistente = await tx.candidatura.findUnique({
        where: { codVag_codCand: { codVag: contexto.vaga.codVag, codCand: candidato.codCand } },
      });
      if (candidaturaExistente) {
        return { ...item, codCdt: candidaturaExistente.codCdt.toString(), motivo: 'Já tinha candidatura nesta vaga' };
      }

      const candidatura = await tx.candidatura.create({
        data: {
          codTen,
          codVag: contexto.vaga.codVag,
          codCand: candidato.codCand,
          codCanal: contexto.canal.codCanal,
          codUsuInc: codUsu,
        },
      });
      await tx.candidaturaHistorico.create({
        data: {
          codTen,
          codCdt: candidatura.codCdt,
          tipoEvento: 'candidatura_recebida',
          estagioNovo: 'applied',
          rotuloPub: 'Candidatura recebida',
          tipoAtor: 'usuario',
          metadadosJson: { canal: contexto.canal.nomeCanal, origem: 'importacao_lote', arquivo: nome },
          codUsuInc: codUsu,
        },
      });
      return { ...item, codCdt: candidatura.codCdt.toString() };
    });
  }
}
