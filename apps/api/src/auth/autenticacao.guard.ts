import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { CargaToken } from './auth.service';

export interface UsuarioAutenticado {
  codUsu: bigint;
  codTen: bigint;
  nome: string;
  permissoes: string[];
}

export const CHAVE_PERMISSOES = 'permissoes_exigidas';
/** Exige permissões do RBAC: `@Permissoes('core.empresas.criar')` */
export const Permissoes = (...chaves: string[]) => SetMetadata(CHAVE_PERMISSOES, chaves);

const CHAVE_PUBLICO = 'rota_publica';
/** Marca rota como pública (sem token): `@Publico()` */
export const Publico = () => SetMetadata(CHAVE_PUBLICO, true);

@Injectable()
export class AutenticacaoGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const publico = this.reflector.getAllAndOverride<boolean>(CHAVE_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (publico) return true;

    const req = contexto.switchToHttp().getRequest<Request & { usuario?: UsuarioAutenticado }>();
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Token ausente');

    let carga: CargaToken;
    try {
      carga = await this.jwt.verifyAsync<CargaToken>(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
    if (carga.tipo !== 'access') {
      throw new UnauthorizedException('Use um access token');
    }

    req.usuario = {
      codUsu: BigInt(carga.sub),
      codTen: BigInt(carga.ten),
      nome: carga.nome,
      permissoes: carga.permissoes ?? [],
    };

    const exigidas =
      this.reflector.getAllAndOverride<string[]>(CHAVE_PERMISSOES, [
        contexto.getHandler(),
        contexto.getClass(),
      ]) ?? [];
    const faltantes = exigidas.filter((p) => !req.usuario!.permissoes.includes(p));
    if (faltantes.length > 0) {
      throw new ForbiddenException(`Permissão necessária: ${faltantes.join(', ')}`);
    }
    return true;
  }
}
