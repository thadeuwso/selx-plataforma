import { BadRequestException, Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../auth/autenticacao.guard';
import { PrismaService } from '../prisma/prisma.service';

const esquemaCargo = z.object({ nomeCar: z.string().min(2), cbo: z.string().optional() });

const esquemaDepartamento = z.object({
  descrDep: z.string().min(2),
  codDepPai: z.coerce.bigint().optional(),
  codCencus: z.coerce.bigint().optional(),
});

const esquemaFuncionario = z.object({
  codEmp: z.coerce.bigint(),
  numCad: z.coerce.bigint(),
  nomeFun: z.string().min(2),
  cgc: z.string().optional(),
  dtAdm: z.coerce.date(),
  dtNasc: z.coerce.date().optional(),
  codCar: z.coerce.bigint().optional(),
  codDep: z.coerce.bigint().optional(),
  codCencus: z.coerce.bigint().optional(),
  tipoContrato: z.string().default('CLT'),
  vlrSal: z.coerce.number().positive().optional(),
});

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

type ReqAut = Request & { usuario: UsuarioAutenticado };

@Controller()
export class FuncionariosController {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Cargos =====
  @Get('cargos')
  @Permissoes('core.funcionarios.ler')
  listarCargos(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.cargo.findMany({ where: { ativo: 'S' }, orderBy: { codCar: 'asc' } }),
    );
  }

  @Post('cargos')
  @Permissoes('core.funcionarios.editar')
  criarCargo(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaCargo, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.cargo.create({
        data: { codTen: req.usuario.codTen, ...dados, codUsuInc: req.usuario.codUsu },
      }),
    );
  }

  // ===== Departamentos (TFPDEP) =====
  @Get('departamentos')
  @Permissoes('core.funcionarios.ler')
  listarDepartamentos(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.departamento.findMany({ where: { ativo: 'S' }, orderBy: { codDep: 'asc' } }),
    );
  }

  @Post('departamentos')
  @Permissoes('core.funcionarios.editar')
  criarDepartamento(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaDepartamento, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      let grau = 1;
      if (dados.codDepPai) {
        const pai = await tx.departamento.findFirst({
          where: { codDep: dados.codDepPai, ativo: 'S' },
        });
        if (!pai) throw new BadRequestException('Departamento pai inexistente');
        grau = pai.grau + 1;
      }
      return tx.departamento.create({
        data: { codTen: req.usuario.codTen, ...dados, grau, codUsuInc: req.usuario.codUsu },
      });
    });
  }

  // ===== Funcionários (TFPFUN) =====
  @Get('funcionarios')
  @Permissoes('core.funcionarios.ler')
  listarFuncionarios(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.funcionario.findMany({
        where: { ativo: 'S' },
        orderBy: { codFun: 'asc' },
        select: {
          codFun: true,
          numCad: true,
          nomeFun: true,
          situacao: true,
          dtAdm: true,
          empresa: { select: { codEmp: true, nomeFantasia: true } },
          cargo: { select: { codCar: true, nomeCar: true } },
          departamento: { select: { codDep: true, descrDep: true } },
          centroResultado: { select: { codCencus: true, descrCencus: true } },
        },
      }),
    );
  }

  /** Admissão: cria o funcionário e registra o evento de vida em TFPFUNHIS. */
  @Post('funcionarios')
  @Permissoes('core.funcionarios.criar')
  criarFuncionario(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaFuncionario, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const empresa = await tx.empresa.findFirst({ where: { codEmp: dados.codEmp, ativo: 'S' } });
      if (!empresa) throw new BadRequestException('Empresa/filial inexistente neste tenant');
      // Vínculos opcionais precisam existir no tenant (RLS já limita; validamos para erro claro)
      for (const [campo, tabela] of [
        ['codCar', 'cargo'],
        ['codDep', 'departamento'],
      ] as const) {
        const cod = dados[campo];
        if (cod) {
          const existe = await (tx as never as Record<string, { findFirst: (a: object) => Promise<unknown> }>)[
            tabela
          ].findFirst({ where: { ativo: 'S', [campo === 'codCar' ? 'codCar' : 'codDep']: cod } });
          if (!existe) throw new BadRequestException(`${tabela} inexistente neste tenant`);
        }
      }

      const funcionario = await tx.funcionario.create({
        data: {
          codTen: req.usuario.codTen,
          codEmp: dados.codEmp,
          numCad: dados.numCad,
          nomeFun: dados.nomeFun,
          cgc: dados.cgc,
          dtAdm: dados.dtAdm,
          dtNasc: dados.dtNasc,
          codCar: dados.codCar,
          codDep: dados.codDep,
          codCencus: dados.codCencus,
          tipoContrato: dados.tipoContrato,
          vlrSal: dados.vlrSal,
          codUsuInc: req.usuario.codUsu,
        },
        select: { codFun: true, numCad: true, nomeFun: true },
      });

      await tx.funcionarioHistorico.create({
        data: {
          codTen: req.usuario.codTen,
          codFun: funcionario.codFun,
          tipoMud: 'ADMISSAO',
          valorNovo: dados.nomeFun,
          dtMud: dados.dtAdm,
          codUsuInc: req.usuario.codUsu,
        },
      });

      return funcionario;
    });
  }

  // ===== Projetos (TCSPRJ) e Contratos de serviço (TCSCON) — espelhos mínimos =====
  @Get('projetos')
  @Permissoes('core.funcionarios.ler')
  listarProjetos(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.projeto.findMany({ where: { ativo: 'S' }, orderBy: { codProj: 'asc' } }),
    );
  }

  @Post('projetos')
  @Permissoes('core.funcionarios.editar')
  criarProjeto(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(
      z.object({
        identificacao: z.string().min(2),
        abreviatura: z.string().min(1).max(20),
        codProjPai: z.coerce.bigint().optional(),
        codEmp: z.coerce.bigint().optional(),
        dtInicio: z.coerce.date().optional(),
        dtTermino: z.coerce.date().optional(),
        vlrOrcado: z.coerce.number().positive().optional(),
      }),
      corpo,
    );
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      let grau = 1;
      if (dados.codProjPai) {
        const pai = await tx.projeto.findFirst({ where: { codProj: dados.codProjPai, ativo: 'S' } });
        if (!pai) throw new BadRequestException('Projeto pai inexistente');
        grau = pai.grau + 1;
      }
      return tx.projeto.create({
        data: { codTen: req.usuario.codTen, ...dados, grau, codUsuInc: req.usuario.codUsu },
      });
    });
  }

  @Get('contratos-servico')
  @Permissoes('core.funcionarios.ler')
  listarContratos(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.contratoServico.findMany({ where: { ativo: 'S' }, orderBy: { codContrato: 'asc' } }),
    );
  }

  @Post('contratos-servico')
  @Permissoes('core.funcionarios.editar')
  criarContrato(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(
      z.object({
        descrContrato: z.string().min(2),
        numContrato: z.string().optional(),
        codProj: z.coerce.bigint().optional(),
        codEmp: z.coerce.bigint().optional(),
        tipo: z.string().length(1).optional(),
        vlrHora: z.coerce.number().positive().optional(),
        parcelaQtd: z.coerce.number().int().positive().optional(),
        dtTermino: z.coerce.date().optional(),
      }),
      corpo,
    );
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      if (dados.codProj) {
        const proj = await tx.projeto.findFirst({ where: { codProj: dados.codProj, ativo: 'S' } });
        if (!proj) throw new BadRequestException('Projeto inexistente neste tenant');
      }
      return tx.contratoServico.create({
        data: { codTen: req.usuario.codTen, ...dados, codUsuInc: req.usuario.codUsu },
      });
    });
  }

  // ===== Dependentes (TFPDPD) =====
  @Get('funcionarios/:codFun/dependentes')
  @Permissoes('core.funcionarios.ler')
  listarDependentes(@Req() req: ReqAut, @Param('codFun') codFun: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.dependente.findMany({ where: { codFun: BigInt(codFun), ativo: 'S' }, orderBy: { codDpd: 'asc' } }),
    );
  }

  @Post('funcionarios/:codFun/dependentes')
  @Permissoes('core.funcionarios.editar')
  criarDependente(@Req() req: ReqAut, @Param('codFun') codFun: string, @Body() corpo: unknown) {
    const dados = validar(
      z.object({ nomeDpd: z.string().min(2), tipoDpd: z.string().min(2), dtNasc: z.coerce.date().optional(), cgc: z.string().optional() }),
      corpo,
    );
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const fun = await tx.funcionario.findFirst({ where: { codFun: BigInt(codFun), ativo: 'S' } });
      if (!fun) throw new BadRequestException('Funcionário inexistente neste tenant');
      return tx.dependente.create({
        data: { codTen: req.usuario.codTen, codFun: fun.codFun, ...dados, codUsuInc: req.usuario.codUsu },
      });
    });
  }

  @Get('funcionarios/:codFun/historico')
  @Permissoes('core.funcionarios.ler')
  historico(@Req() req: ReqAut, @Param('codFun') codFun: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.funcionarioHistorico.findMany({
        where: { codFun: BigInt(codFun) },
        orderBy: { codFunHis: 'asc' },
      }),
    );
  }
}
