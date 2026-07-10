import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { EmpresasModule } from './empresas/empresas.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { SaudeModule } from './saude/saude.module';

/**
 * Monólito modular (FOUNDATION §5): cada domínio (Core, Recrutamento,
 * Gestão de Pessoas, Benefícios, Auditoria da Folha, Analytics, Integrações)
 * entra como um módulo Nest com fronteira explícita.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SaudeModule,
    EmpresasModule,
    UsuariosModule,
  ],
})
export class AppModule {}
