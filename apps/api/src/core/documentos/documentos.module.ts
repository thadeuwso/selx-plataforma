import { Module } from '@nestjs/common';
import { AssinaturasPublicasController } from './assinaturas-publicas.controller';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { KitsController } from './kits.controller';

@Module({
  controllers: [DocumentosController, AssinaturasPublicasController, KitsController],
  providers: [DocumentosService],
  exports: [DocumentosService],
})
export class DocumentosModule {}
