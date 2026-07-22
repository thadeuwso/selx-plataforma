import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

/** Global como o Prisma: qualquer módulo pode enfileirar sem reimportar. */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
