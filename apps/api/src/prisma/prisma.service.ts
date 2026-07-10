import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Acesso a dados com dois papéis de banco (ADR-0002):
 * - `app`: papel selx_app, SUJEITO a RLS — todo acesso de negócio passa por
 *   `executarNoTenant`, que abre transação e define app.codten via SET LOCAL.
 * - `admin`: papel administrativo, SEM RLS — uso restrito a operações de
 *   plataforma (cadastro de tenant, login por e-mail, seeds). Cada uso novo
 *   precisa de justificativa em revisão.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly app: PrismaClient;
  readonly admin: PrismaClient;

  constructor() {
    const urlAdmin = process.env.DATABASE_URL;
    const urlApp = process.env.DATABASE_URL_APP;
    if (!urlAdmin || !urlApp) {
      throw new Error('DATABASE_URL e DATABASE_URL_APP são obrigatórias');
    }
    this.admin = new PrismaClient({ datasources: { db: { url: urlAdmin } } });
    this.app = new PrismaClient({ datasources: { db: { url: urlApp } } });
  }

  async onModuleInit() {
    await Promise.all([this.app.$connect(), this.admin.$connect()]);
  }

  async onModuleDestroy() {
    await Promise.all([this.app.$disconnect(), this.admin.$disconnect()]);
  }

  /** Executa `fn` em transação com o contexto do tenant aplicado (RLS ativo). */
  executarNoTenant<T>(
    codTen: bigint,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.app.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.codten', ${codTen.toString()}, true)`;
      return fn(tx);
    });
  }
}
