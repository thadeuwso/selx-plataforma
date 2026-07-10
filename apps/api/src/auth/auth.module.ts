import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AutenticacaoGuard } from './autenticacao.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const segredo = process.env.JWT_SECRET;
        if (!segredo || segredo.length < 16) {
          throw new Error('JWT_SECRET ausente ou fraco (mínimo 16 caracteres)');
        }
        return { secret: segredo };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AutenticacaoGuard }],
})
export class AuthModule {}
