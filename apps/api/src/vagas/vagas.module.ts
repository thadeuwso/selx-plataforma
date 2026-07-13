import { Module } from '@nestjs/common';
import { CandidatosController } from './candidatos.controller';
import { IaVagasController } from './ia-vagas.controller';
import { VagasController } from './vagas.controller';

@Module({
  controllers: [VagasController, CandidatosController, IaVagasController],
})
export class VagasModule {}
