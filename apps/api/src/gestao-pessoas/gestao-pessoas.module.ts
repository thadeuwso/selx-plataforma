import { Module } from '@nestjs/common';
import { AvaliacaoComportamentalController } from './avaliacao-comportamental.controller';
import { AvaliacaoComportamentalPublicoController } from './avaliacao-comportamental-publico.controller';
import { PerfilComportamentalController } from './perfil-comportamental.controller';

@Module({
  controllers: [PerfilComportamentalController, AvaliacaoComportamentalController, AvaliacaoComportamentalPublicoController],
})
export class GestaoPessoasModule {}
