import { BadRequestException, Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { AuthService, esquemaCadastro, esquemaLogin } from './auth.service';
import { Publico, UsuarioAutenticado } from './autenticacao.guard';

function validar<T extends z.ZodTypeAny>(esquema: T, corpo: unknown): z.infer<T> {
  try {
    return esquema.parse(corpo);
  } catch (erro) {
    if (erro instanceof ZodError) {
      throw new BadRequestException({ mensagem: 'Dados inválidos', detalhes: erro.issues });
    }
    throw erro;
  }
}

const esquemaAtualizar = z.object({ refreshToken: z.string().min(10) });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Cadastro de novo tenant (grupo + empresa matriz + usuário administrador). */
  @Publico()
  @Post('cadastro')
  cadastrar(@Body() corpo: unknown) {
    return this.auth.cadastrar(validar(esquemaCadastro, corpo));
  }

  @Publico()
  @Post('login')
  entrar(@Body() corpo: unknown) {
    return this.auth.entrar(validar(esquemaLogin, corpo));
  }

  /** Rotação do par de tokens via refresh token. */
  @Publico()
  @Post('atualizar')
  atualizar(@Body() corpo: unknown) {
    return this.auth.atualizar(validar(esquemaAtualizar, corpo).refreshToken);
  }

  /** Logout: revoga a sessão do refresh token (idempotente). */
  @Publico()
  @Post('sair')
  sair(@Body() corpo: unknown) {
    return this.auth.sair(validar(esquemaAtualizar, corpo).refreshToken);
  }

  @Get('eu')
  eu(@Req() req: Request & { usuario: UsuarioAutenticado }) {
    return req.usuario;
  }
}
