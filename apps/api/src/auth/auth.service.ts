import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

const hashToken = (jti: string) => createHash('sha256').update(jti).digest('hex');

export const esquemaCadastro = z.object({
  nomeGrupo: z.string().min(2),
  nomeFantasia: z.string().min(2),
  razaoSocial: z.string().min(2),
  cgc: z.string().optional(),
  nomeUsu: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(8),
});

export const esquemaLogin = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export interface CargaToken {
  sub: string; // codUsu
  ten: string; // codTen
  nome: string;
  permissoes: string[];
  tipo: 'access' | 'refresh';
  jti?: string; // identificador da sessão (apenas refresh)
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Cadastro de tenant (operação de PLATAFORMA — usa papel admin, sem RLS):
   * cria tenant + empresa matriz + papel Administrador com todas as
   * permissões do catálogo + usuário administrador.
   */
  async cadastrar(dados: z.infer<typeof esquemaCadastro>) {
    const senhaHash = await bcrypt.hash(dados.senha, 10);

    const resultado = await this.prisma.admin.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { nomeTen: dados.nomeGrupo } });

      const empresa = await tx.empresa.create({
        data: {
          codTen: tenant.codTen,
          nomeFantasia: dados.nomeFantasia,
          razaoSocial: dados.razaoSocial,
          cgc: dados.cgc,
        },
      });

      const papelAdmin = await tx.papel.create({
        data: {
          codTen: tenant.codTen,
          nomePap: 'Administrador',
          descrPap: 'Acesso total ao tenant',
        },
      });

      const permissoes = await tx.permissao.findMany();
      if (permissoes.length === 0) {
        throw new BadRequestException(
          'Catálogo de permissões vazio — execute o seed (pnpm --filter @selx/database db:seed)',
        );
      }
      await tx.papelPermissao.createMany({
        data: permissoes.map((p) => ({
          codTen: tenant.codTen,
          codPap: papelAdmin.codPap,
          codPerm: p.codPerm,
        })),
      });

      const usuario = await tx.usuario.create({
        data: {
          codTen: tenant.codTen,
          nomeUsu: dados.nomeUsu,
          email: dados.email.toLowerCase(),
          senha: senhaHash,
        },
      });

      await tx.usuarioPapel.create({
        data: {
          codTen: tenant.codTen,
          codUsu: usuario.codUsu,
          codPap: papelAdmin.codPap,
        },
      });

      return { tenant, empresa, usuario };
    });

    return {
      codTen: resultado.tenant.codTen,
      codEmp: resultado.empresa.codEmp,
      codUsu: resultado.usuario.codUsu,
    };
  }

  /** Login por e-mail (lookup de plataforma) + emissão do par de tokens. */
  async entrar(dados: z.infer<typeof esquemaLogin>) {
    const usuario = await this.prisma.admin.usuario.findFirst({
      where: { email: dados.email.toLowerCase(), situacao: 'ATIVO', ativo: 'S' },
    });
    if (!usuario || !(await bcrypt.compare(dados.senha, usuario.senha))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const permissoes = await this.permissoesDoUsuario(usuario.codTen, usuario.codUsu);

    await this.prisma.admin.usuario.update({
      where: { codUsu: usuario.codUsu },
      data: { dhUltAcesso: new Date() },
    });

    return this.emitirTokens(usuario.codUsu, usuario.codTen, usuario.nomeUsu, permissoes);
  }

  /** Rotaciona o par de tokens a partir de um refresh token válido. */
  async atualizar(refreshToken: string) {
    let carga: CargaToken;
    try {
      carga = await this.jwt.verifyAsync<CargaToken>(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
    if (carga.tipo !== 'refresh' || !carga.jti) {
      throw new UnauthorizedException('Token informado não é um refresh token');
    }
    const codUsu = BigInt(carga.sub);
    const codTen = BigInt(carga.ten);

    // Sessão precisa existir, não estar revogada nem expirada (revogação server-side)
    const agora = new Date();
    const rotacionada = await this.prisma.executarNoTenant(codTen, async (tx) => {
      const sessao = await tx.sessao.findUnique({ where: { tokenHash: hashToken(carga.jti!) } });
      if (!sessao || sessao.dhRevog || sessao.dhExp < agora) return false;
      await tx.sessao.update({
        where: { codSes: sessao.codSes },
        data: { dhRevog: agora }, // rotação: o refresh usado morre aqui
      });
      return true;
    });
    if (!rotacionada) {
      throw new UnauthorizedException('Sessão revogada, expirada ou inexistente');
    }

    const usuario = await this.prisma.admin.usuario.findFirst({
      where: { codUsu, situacao: 'ATIVO', ativo: 'S' },
    });
    if (!usuario) throw new UnauthorizedException('Usuário inativo');

    const permissoes = await this.permissoesDoUsuario(usuario.codTen, usuario.codUsu);
    return this.emitirTokens(usuario.codUsu, usuario.codTen, usuario.nomeUsu, permissoes);
  }

  /** Logout: revoga a sessão do refresh token informado. Idempotente. */
  async sair(refreshToken: string) {
    let carga: CargaToken;
    try {
      carga = await this.jwt.verifyAsync<CargaToken>(refreshToken);
    } catch {
      return { ok: true }; // token inválido/expirado: nada a revogar
    }
    if (carga.tipo !== 'refresh' || !carga.jti) return { ok: true };

    await this.prisma.executarNoTenant(BigInt(carga.ten), async (tx) => {
      await tx.sessao.updateMany({
        where: { tokenHash: hashToken(carga.jti!), dhRevog: null },
        data: { dhRevog: new Date() },
      });
    });
    return { ok: true };
  }

  private async permissoesDoUsuario(codTen: bigint, codUsu: bigint): Promise<string[]> {
    return this.prisma.executarNoTenant(codTen, async (tx) => {
      const vinculos = await tx.usuarioPapel.findMany({
        where: { codUsu, ativo: 'S' },
        include: { papel: { include: { permissoes: { include: { permissao: true } } } } },
      });
      const chaves = new Set<string>();
      for (const v of vinculos) {
        for (const pp of v.papel.permissoes) chaves.add(pp.permissao.chavePerm);
      }
      return [...chaves];
    });
  }

  private async emitirTokens(
    codUsu: bigint,
    codTen: bigint,
    nome: string,
    permissoes: string[],
  ) {
    const base = { sub: codUsu.toString(), ten: codTen.toString(), nome, permissoes };
    const jti = randomUUID();
    const validade = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    // Sessão server-side (TSXSES): permite logout, rotação e revogação (migration 0002)
    await this.prisma.executarNoTenant(codTen, (tx) =>
      tx.sessao.create({
        data: { codTen, codUsu, tokenHash: hashToken(jti), dhExp: validade },
      }),
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ ...base, tipo: 'access' }, { expiresIn: '15m' }),
      this.jwt.signAsync({ ...base, tipo: 'refresh', jti }, { expiresIn: '7d' }),
    ]);
    return { accessToken, refreshToken };
  }
}
