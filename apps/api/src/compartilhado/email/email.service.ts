import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { montarMensagem, type DadosTemplate } from './templates';

const INTERVALO_PADRAO_MS = 20_000;
const MAX_TENTATIVAS = 5;
const LOTE = 20;
/** Teto de passadas por dreno — 200 mensagens saem numa chamada só. */
const MAX_PASSADAS = 10;

/**
 * Fila de e-mails (RN-SX-001): enfileira na ação, entrega em segundo plano.
 *
 * Até aqui **nada era enviado ao candidato**. Portal de acompanhamento,
 * avaliação comportamental, admissão, assinatura e questionário cultural
 * geravam um link que o recrutador copiava de um alerta e colava à mão em outro
 * lugar. Com dezenas de candidatos por vaga, isso não é operação.
 *
 * Sem SMTP configurado o serviço **não quebra**: a mensagem continua sendo
 * enfileirada e o botão de copiar link segue existindo. O que não pode
 * acontecer é a intenção de enviar se perder em silêncio.
 */
@Injectable()
export class EmailService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(EmailService.name);
  private transporte: Transporter | null = null;
  private timer: NodeJS.Timeout | null = null;
  private drenando = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (this.configurado()) {
      this.transporte = createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        // 465 é o único porto TLS implícito; 587 e 1025 negociam com STARTTLS.
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
      this.log.log(`SMTP configurado (${process.env.SMTP_HOST}:${process.env.SMTP_PORT})`);
    } else {
      this.log.warn('SMTP não configurado — e-mails ficam na fila até que SMTP_HOST/PORT/FROM existam');
    }

    // `setInterval` simples em vez de @nestjs/schedule: uma dependência a menos
    // para uma única tarefa periódica. `unref` para não segurar o processo.
    const intervalo = Number(process.env.EMAIL_INTERVALO_MS) || INTERVALO_PADRAO_MS;
    if (intervalo > 0) {
      this.timer = setInterval(() => void this.drenar(), intervalo);
      this.timer.unref?.();
    }
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  configurado(): boolean {
    return !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_FROM);
  }

  /**
   * Enfileira. Repetir a mesma `chaveIdem` não gera segunda mensagem — e-mail
   * repetido para candidato é dano de reputação, não incômodo.
   */
  async enfileirar(args: {
    codTen: bigint;
    destinatario: string;
    template: string;
    chaveIdem: string;
    dados: DadosTemplate;
    codUsuInc?: bigint;
    /**
     * Em lote, passe `false` e chame `drenar()` uma vez no fim. Drenar por item
     * não acelera nada — o segundo dreno encontra o primeiro em curso e
     * desiste —, e ainda faz o lote sair em conta-gotas.
     */
    drenarAgora?: boolean;
  }): Promise<{ codEmail: bigint; jaExistia: boolean }> {
    const existente = await this.prisma.admin.emailFila.findUnique({
      where: { chaveIdem: args.chaveIdem },
      select: { codEmail: true },
    });
    if (existente) return { codEmail: existente.codEmail, jaExistia: true };

    const msg = montarMensagem(args.template, args.dados);
    const criado = await this.prisma.admin.emailFila.create({
      data: {
        codTen: args.codTen,
        destinatario: args.destinatario,
        assunto: msg.assunto,
        corpoTexto: msg.texto,
        corpoHtml: msg.html,
        template: args.template,
        chaveIdem: args.chaveIdem,
        codUsuInc: args.codUsuInc,
      },
      select: { codEmail: true },
    });
    // Não espera o intervalo: quem clicou "enviar" quer o e-mail saindo agora.
    if (args.drenarAgora !== false) void this.drenar();
    return { codEmail: criado.codEmail, jaExistia: false };
  }

  /**
   * Envia o que está pendente. `prisma.admin` de propósito: a fila é varrida
   * entre tenants, fora de contexto de tenant — mesmo caminho já usado pelas
   * consultas por token público.
   */
  async drenar(): Promise<{ enviados: number; falhas: number }> {
    if (this.drenando || !this.transporte) return { enviados: 0, falhas: 0 };
    this.drenando = true;
    let enviados = 0;
    let falhas = 0;
    try {
      // Vai até esvaziar, em passadas de LOTE: um envio em massa tem de sair de
      // uma vez, não uma leva a cada intervalo. O teto de passadas evita laço
      // infinito quando tudo falha e os itens voltam para PENDENTE.
      for (let passada = 0; passada < MAX_PASSADAS; passada++) {
        const pendentes = await this.prisma.admin.emailFila.findMany({
          where: { status: 'PENDENTE', tentativas: { lt: MAX_TENTATIVAS } },
          orderBy: { dhInc: 'asc' },
          take: LOTE,
        });
        if (pendentes.length === 0) break;

        let falhouNaPassada = false;
        for (const item of pendentes) {
          try {
            await this.transporte.sendMail({
              from: process.env.SMTP_FROM,
              to: item.destinatario,
              subject: item.assunto,
              text: item.corpoTexto,
              html: item.corpoHtml ?? undefined,
            });
            await this.prisma.admin.emailFila.update({
              where: { codEmail: item.codEmail },
              data: { status: 'ENVIADO', dhEnvio: new Date(), tentativas: { increment: 1 }, erro: null },
            });
            enviados++;
          } catch (erro) {
            const tentativas = item.tentativas + 1;
            // Só marca FALHOU no teto: erro de SMTP costuma ser transitório, e
            // desistir na primeira tentativa perderia mensagem por instabilidade.
            await this.prisma.admin.emailFila.update({
              where: { codEmail: item.codEmail },
              data: {
                tentativas,
                erro: erro instanceof Error ? erro.message.slice(0, 500) : 'erro desconhecido',
                status: tentativas >= MAX_TENTATIVAS ? 'FALHOU' : 'PENDENTE',
              },
            });
            falhas++;
            falhouNaPassada = true;
          }
        }
        // SMTP fora do ar derruba o lote inteiro: insistir nas próximas passadas
        // só gastaria tentativas. O intervalo tenta de novo mais tarde.
        if (falhouNaPassada) break;
      }
    } finally {
      this.drenando = false;
    }
    if (enviados || falhas) this.log.log(`fila de e-mail: ${enviados} enviado(s), ${falhas} falha(s)`);
    return { enviados, falhas };
  }
}
