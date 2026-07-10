import { Controller, Get } from '@nestjs/common';
import { Publico } from '../auth/autenticacao.guard';

@Controller('health')
export class SaudeController {
  @Publico()
  @Get()
  verificar() {
    return { ok: true, servico: 'selx-api', dataHora: new Date().toISOString() };
  }
}
