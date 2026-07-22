import { Injectable } from '@nestjs/common';
import { EmailService } from '../../compartilhado/email/email.service';

/** O que `enviarParaAssinatura` devolve e o e-mail precisa. */
export interface AssinaturaParaEmail {
  codAssin: bigint;
  tokenPub: string;
  documento: { nomeDoc: string };
  funcionario: { nomeFun: string; email: string | null; empresa: { nomeFantasia: string } };
}

/**
 * Enfileira o aviso de documento para assinar (RN-SX-001).
 *
 * Sempre **depois** do commit: enfileirar dentro da transação amarraria a
 * assinatura à fila. Funcionário sem e-mail cadastrado é ignorado em silêncio
 * aqui, mas contado no retorno — quem chama informa ao usuário, e o link
 * copiável continua sendo o caminho alternativo.
 */
@Injectable()
export class AvisoAssinaturaService {
  constructor(private readonly email: EmailService) {}

  async enfileirar(codTen: bigint, codUsu: bigint, assinaturas: AssinaturaParaEmail[]) {
    const base = process.env.APP_URL ?? 'http://localhost:3002';
    let enfileirados = 0;
    let semEmail = 0;
    for (const a of assinaturas) {
      if (!a.funcionario.email) {
        semEmail++;
        continue;
      }
      const r = await this.email.enfileirar({
        codTen,
        destinatario: a.funcionario.email,
        template: 'documento-assinatura',
        chaveIdem: `assinatura:${a.codAssin}`,
        codUsuInc: codUsu,
        drenarAgora: false,
        dados: {
          nomeCandidato: a.funcionario.nomeFun,
          nomeEmpresa: a.funcionario.empresa.nomeFantasia,
          tituloVaga: a.documento.nomeDoc,
          nomeDocumento: a.documento.nomeDoc,
          url: `${base}/assinatura/${a.tokenPub}`,
        },
      });
      if (!r.jaExistia) enfileirados++;
    }
    void this.email.drenar();
    return { enfileirados, semEmail };
  }
}
