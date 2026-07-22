import { Module } from '@nestjs/common';
import { DocumentosModule } from '../core/documentos/documentos.module';
import { FuncionariosModule } from '../core/funcionarios/funcionarios.module';
import { AdmissaoProcessoController } from './admissao-processo.controller';
import { AcompanhamentoPublicoController } from './acompanhamento-publico.controller';
import { AdmissaoPublicoController } from './admissao-publico.controller';
import { AdmissoesListaController } from './admissoes-lista.controller';
import { CandidatosController } from './candidatos.controller';
import { CurriculosController } from './curriculos.controller';
import { ImportacaoLoteController } from './importacao-lote.controller';
import { AnaliseCandidatoController } from './analise-candidato.controller';
import { EntrevistasController } from './entrevistas.controller';
import { TriagemController } from './triagem.controller';
import { PropostasController } from './propostas.controller';
import { CulturaEmpresaController } from './cultura-empresa.controller';
import { PortalCandidatoController } from './portal-candidato.controller';
import { IaVagasController } from './ia-vagas.controller';
import { VagasController } from './vagas.controller';

@Module({
  imports: [FuncionariosModule, DocumentosModule], // RN-REC-007: hired -> admissão via FuncionariosService/DocumentosService do Core
  controllers: [
    VagasController,
    CandidatosController,
    IaVagasController,
    CurriculosController,
    ImportacaoLoteController,
    AnaliseCandidatoController,
    EntrevistasController,
    TriagemController,
    PropostasController,
    CulturaEmpresaController,
    PortalCandidatoController,
    AdmissaoProcessoController,
    AdmissaoPublicoController,
    AcompanhamentoPublicoController,
    AdmissoesListaController,
  ],
})
export class RecrutamentoModule {}
