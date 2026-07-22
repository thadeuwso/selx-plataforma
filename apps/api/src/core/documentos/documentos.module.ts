import { Module } from '@nestjs/common';
import { AssinaturasPublicasController } from './assinaturas-publicas.controller';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { AvisoAssinaturaService } from './aviso-assinatura.service';
import { KitsController } from './kits.controller';

@Module({
  controllers: [DocumentosController, AssinaturasPublicasController, KitsController],
  providers: [DocumentosService, AvisoAssinaturaService],
  exports: [DocumentosService, AvisoAssinaturaService],
})
export class DocumentosModule {}
