import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { renderizarModelo } from './renderizar-modelo';

/**
 * Extraído do controller para ser reutilizável por outros módulos (ex.:
 * Recrutamento e Seleção, ao aprovar um processo de admissão dispara
 * automaticamente o contrato + o kit admissional) — sem duplicar lógica.
 */
@Injectable()
export class DocumentosService {
  async enviarParaAssinatura(
    tx: Prisma.TransactionClient,
    codTen: bigint,
    codUsu: bigint,
    codFun: bigint,
    codDoc: bigint,
  ) {
    const funcionario = await tx.funcionario.findFirst({
      where: { codFun, ativo: 'S' },
      include: { empresa: true, cargo: true, departamento: true },
    });
    if (!funcionario) throw new BadRequestException('Funcionário inexistente neste tenant');

    const modelo = await tx.documentoModelo.findFirst({ where: { codDoc, ativo: 'S' } });
    if (!modelo) throw new BadRequestException('Modelo de documento inexistente neste tenant');

    const conteudoRenderizado = renderizarModelo(modelo.conteudoModelo, funcionario);
    const hashConteudo = createHash('sha256').update(conteudoRenderizado).digest('hex');
    const tokenPub = randomBytes(24).toString('hex');

    return tx.assinatura.create({
      data: { codTen, codDoc, codFun, conteudoRenderizado, hashConteudo, tokenPub, codUsuInc: codUsu },
      select: { codAssin: true, tokenPub: true, status: true, documento: { select: { nomeDoc: true } } },
    });
  }

  /** Dispara o contrato + todos os documentos do kit (se houver) numa só chamada. */
  async enviarPacoteAdmissao(
    tx: Prisma.TransactionClient,
    codTen: bigint,
    codUsu: bigint,
    codFun: bigint,
    codDocContrato: bigint,
    codKit?: bigint,
  ) {
    const enviados = [await this.enviarParaAssinatura(tx, codTen, codUsu, codFun, codDocContrato)];

    if (codKit) {
      const kit = await tx.kitAdmissional.findFirst({
        where: { codKit, ativo: 'S' },
        include: { itens: { orderBy: { ordem: 'asc' } } },
      });
      if (!kit) throw new BadRequestException('Kit admissional inexistente neste tenant');
      for (const item of kit.itens) {
        enviados.push(await this.enviarParaAssinatura(tx, codTen, codUsu, codFun, item.codDoc));
      }
    }
    return enviados;
  }
}
