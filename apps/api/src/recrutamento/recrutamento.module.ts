import { Module } from '@nestjs/common';
import { DocumentosModule } from '../core/documentos/documentos.module';
import { FuncionariosModule } from '../core/funcionarios/funcionarios.module';
import { AdmissaoProcessoController } from './admissao-processo.controller';
import { AdmissaoPublicoController } from './admissao-publico.controller';
import { CandidatosController } from './candidatos.controller';
import { CurriculosController } from './curriculos.controller';
import { IaVagasController } from './ia-vagas.controller';
import { VagasController } from './vagas.controller';

@Module({
  imports: [FuncionariosModule, DocumentosModule], // RN-REC-007: hired -> admissão via FuncionariosService/DocumentosService do Core
  controllers: [
    VagasController,
    CandidatosController,
    IaVagasController,
    CurriculosController,
    AdmissaoProcessoController,
    AdmissaoPublicoController,
  ],
})
export class RecrutamentoModule {}
