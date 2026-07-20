import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './core/auth/auth.module';
import { DocumentosModule } from './core/documentos/documentos.module';
import { EmpresasModule } from './core/empresas/empresas.module';
import { FuncionariosModule } from './core/funcionarios/funcionarios.module';
import { UsuariosModule } from './core/usuarios/usuarios.module';
import { GestaoPessoasModule } from './gestao-pessoas/gestao-pessoas.module';
import { RecrutamentoModule } from './recrutamento/recrutamento.module';
import { PrismaModule } from './compartilhado/prisma/prisma.module';
import { SaudeModule } from './compartilhado/saude/saude.module';

/**
 * Monólito modular (FOUNDATION §5): cada domínio de negócio é uma pasta
 * própria em `src/`, com fronteira explícita — `core/` (Core: auth, empresas,
 * usuários, funcionários) e `recrutamento/` (Recrutamento e Seleção) hoje;
 * `gestao-pessoas/`, `beneficios/`, `auditoria-folha/`, `analytics/` e
 * `integracoes/` entram do mesmo jeito, um módulo por vez. `compartilhado/`
 * é infraestrutura técnica cross-cutting (banco, health check) — não é
 * módulo de negócio.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SaudeModule,
    AuthModule,
    EmpresasModule,
    UsuariosModule,
    FuncionariosModule,
    DocumentosModule,
    RecrutamentoModule,
    GestaoPessoasModule,
  ],
})
export class AppModule {}
