import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Códigos são BIGINT (ADR-0004); JSON.stringify não serializa BigInt nativamente.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const porta = Number(process.env.API_PORT ?? 3001);
  await app.listen(porta);
  console.log(`SelX API ouvindo em http://localhost:${porta}`);
}

void bootstrap();
