import { Module } from '@nestjs/common';
import { AvaliacaoComportamentalController } from './avaliacao-comportamental.controller';
import { BancoPerguntasController } from './banco-perguntas.controller';
import { AvaliacaoComportamentalPublicoController } from './avaliacao-comportamental-publico.controller';
import { IaComportamentalController } from './ia-comportamental.controller';
import { PerfilComportamentalController } from './perfil-comportamental.controller';
import { PerfilComportamentalPadraoController } from './perfil-comportamental-padrao.controller';

@Module({
  controllers: [
    PerfilComportamentalController,
    BancoPerguntasController,
    PerfilComportamentalPadraoController,
    AvaliacaoComportamentalController,
    AvaliacaoComportamentalPublicoController,
    IaComportamentalController,
  ],
})
export class GestaoPessoasModule {}
