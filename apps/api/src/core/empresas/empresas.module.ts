import { Module } from '@nestjs/common';
import { EmpresasController } from './empresas.controller';
import { ConfiguracoesIaController } from './configuracoes-ia.controller';

@Module({
  controllers: [EmpresasController, ConfiguracoesIaController],
})
export class EmpresasModule {}
