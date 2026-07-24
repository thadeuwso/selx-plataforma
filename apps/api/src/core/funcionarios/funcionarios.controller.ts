import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../auth/autenticacao.guard';
import { PrismaService } from '../../compartilhado/prisma/prisma.service';
import { FuncionariosService } from './funcionarios.service';

const esquemaCargo = z.object({ nomeCar: z.string().min(2), cbo: z.string().optional() });

/** Campos editáveis de um funcionário já admitido (todos opcionais). */
const esquemaFuncionarioPatch = z.object({
  nomeFun: z.string().min(2).optional(),
  email: z.string().email().nullish(),
  cgc: z.string().nullish(),
  dtNasc: z.coerce.date().nullish(),
  codCar: z.coerce.bigint().nullish(),
  codDep: z.coerce.bigint().nullish(),
  tipoContrato: z.string().min(1).optional(),
  vlrSal: z.coerce.number().positive().nullish(),
  situacao: z.enum(['ATIVO', 'AFASTADO', 'FERIAS', 'DESLIGADO']).optional(),
});

const esquemaDepartamento = z.object({
  descrDep: z.string().min(2),
  codDepPai: z.coerce.bigint().optional(),
  codCencus: z.coerce.bigint().optional(),
});

const esquemaFuncionario = z.object({
  codEmp: z.coerce.bigint(),
  numCad: z.coerce.bigint(),
  nomeFun: z.string().min(2),
  email: z.string().email().optional(),
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly funcionariosService: FuncionariosService,
  ) {}

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

  @Patch('cargos/:codCar')
  @Permissoes('core.funcionarios.editar')
  async editarCargo(@Req() req: ReqAut, @Param('codCar') codCar: string, @Body() corpo: unknown) {
    const dados = validar(esquemaCargo.partial(), corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const c = await tx.cargo.findFirst({ where: { codCar: BigInt(codCar), ativo: 'S' } });
      if (!c) throw new NotFoundException('Cargo inexistente neste tenant');
      await tx.cargo.update({ where: { codCar: c.codCar }, data: { ...dados, codUsuAlt: req.usuario.codUsu } });
      return { ok: true };
    });
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

  @Patch('departamentos/:codDep')
  @Permissoes('core.funcionarios.editar')
  async editarDepartamento(@Req() req: ReqAut, @Param('codDep') codDep: string, @Body() corpo: unknown) {
    const dados = validar(esquemaDepartamento.partial(), corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const dep = await tx.departamento.findFirst({ where: { codDep: BigInt(codDep), ativo: 'S' } });
      if (!dep) throw new NotFoundException('Departamento inexistente neste tenant');
      let grau = dep.grau;
      if (dados.codDepPai !== undefined) {
        if (dados.codDepPai && dados.codDepPai === dep.codDep) throw new BadRequestException('Departamento não pode ser pai de si mesmo');
        if (dados.codDepPai) {
          const pai = await tx.departamento.findFirst({ where: { codDep: dados.codDepPai, ativo: 'S' } });
          if (!pai) throw new BadRequestException('Departamento pai inexistente');
          grau = pai.grau + 1;
        } else {
          grau = 1;
        }
      }
      await tx.departamento.update({
        where: { codDep: dep.codDep },
        data: { descrDep: dados.descrDep, codCencus: dados.codCencus, codDepPai: dados.codDepPai, grau, codUsuAlt: req.usuario.codUsu },
      });
      return { ok: true };
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
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      this.funcionariosService.admitir(tx, req.usuario.codTen, req.usuario.codUsu, dados),
    );
  }

  /** Dados de um funcionário para edição. */
  @Get('funcionarios/:codFun')
  @Permissoes('core.funcionarios.ler')
  async obterFuncionario(@Req() req: ReqAut, @Param('codFun') codFun: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const f = await tx.funcionario.findFirst({
        where: { codFun: BigInt(codFun), ativo: 'S' },
        select: {
          codFun: true, numCad: true, nomeFun: true, email: true, cgc: true, dtNasc: true, dtAdm: true,
          codCar: true, codDep: true, tipoContrato: true, vlrSal: true, situacao: true,
          empresa: { select: { codEmp: true, nomeFantasia: true } },
        },
      });
      if (!f) throw new NotFoundException('Funcionário inexistente neste tenant');
      return f;
    });
  }

  /**
   * Edita os dados de um funcionário já admitido. Mudanças de cargo, departamento,
   * situação ou salário viram evento de vida em TFPFUNHIS (o acompanhamento que o
   * módulo valoriza) — quem estava aqui não desaparece do histórico.
   */
  @Patch('funcionarios/:codFun')
  @Permissoes('core.funcionarios.editar')
  async atualizarFuncionario(@Req() req: ReqAut, @Param('codFun') codFun: string, @Body() corpo: unknown) {
    const dados = validar(esquemaFuncionarioPatch, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const atual = await tx.funcionario.findFirst({
        where: { codFun: BigInt(codFun), ativo: 'S' },
        include: { cargo: { select: { nomeCar: true } }, departamento: { select: { descrDep: true } } },
      });
      if (!atual) throw new NotFoundException('Funcionário inexistente neste tenant');

      // Validações de vínculo (o tenant já é garantido pela RLS).
      if (dados.codCar) {
        const c = await tx.cargo.findFirst({ where: { codCar: dados.codCar, ativo: 'S' } });
        if (!c) throw new BadRequestException('Cargo inexistente neste tenant');
      }
      if (dados.codDep) {
        const d = await tx.departamento.findFirst({ where: { codDep: dados.codDep, ativo: 'S' } });
        if (!d) throw new BadRequestException('Departamento inexistente neste tenant');
      }

      // Eventos de vida (TFPFUNHIS) para mudanças relevantes.
      const eventos: { tipoMud: string; valorAnt: string | null; valorNovo: string | null }[] = [];
      if (dados.codCar !== undefined && (dados.codCar ?? null)?.toString() !== (atual.codCar ?? null)?.toString()) {
        const novo = dados.codCar ? await tx.cargo.findFirst({ where: { codCar: dados.codCar }, select: { nomeCar: true } }) : null;
        eventos.push({ tipoMud: 'CARGO', valorAnt: atual.cargo?.nomeCar ?? null, valorNovo: novo?.nomeCar ?? null });
      }
      if (dados.codDep !== undefined && (dados.codDep ?? null)?.toString() !== (atual.codDep ?? null)?.toString()) {
        const novo = dados.codDep ? await tx.departamento.findFirst({ where: { codDep: dados.codDep }, select: { descrDep: true } }) : null;
        eventos.push({ tipoMud: 'DEPARTAMENTO', valorAnt: atual.departamento?.descrDep ?? null, valorNovo: novo?.descrDep ?? null });
      }
      if (dados.situacao !== undefined && dados.situacao !== atual.situacao) {
        eventos.push({ tipoMud: 'SITUACAO', valorAnt: atual.situacao, valorNovo: dados.situacao });
      }
      if (dados.vlrSal !== undefined && dados.vlrSal !== null && dados.vlrSal.toString() !== (atual.vlrSal?.toString() ?? null)) {
        eventos.push({ tipoMud: 'SALARIO', valorAnt: atual.vlrSal?.toString() ?? null, valorNovo: dados.vlrSal.toString() });
      }

      await tx.funcionario.update({
        where: { codFun: atual.codFun },
        data: {
          nomeFun: dados.nomeFun,
          email: dados.email,
          cgc: dados.cgc,
          dtNasc: dados.dtNasc,
          codCar: dados.codCar,
          codDep: dados.codDep,
          tipoContrato: dados.tipoContrato,
          vlrSal: dados.vlrSal,
          situacao: dados.situacao,
          codUsuAlt: req.usuario.codUsu,
        },
      });
      const hoje = new Date();
      for (const e of eventos) {
        await tx.funcionarioHistorico.create({
          data: { codTen: req.usuario.codTen, codFun: atual.codFun, ...e, dtMud: hoje, codUsuInc: req.usuario.codUsu },
        });
      }
      return { ok: true, eventos: eventos.length };
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

  @Patch('projetos/:codProj')
  @Permissoes('core.funcionarios.editar')
  async editarProjeto(@Req() req: ReqAut, @Param('codProj') codProj: string, @Body() corpo: unknown) {
    const dados = validar(
      z.object({
        identificacao: z.string().min(2).optional(),
        abreviatura: z.string().min(1).max(20).optional(),
        codProjPai: z.coerce.bigint().nullish(),
        codEmp: z.coerce.bigint().nullish(),
        dtInicio: z.coerce.date().nullish(),
        dtTermino: z.coerce.date().nullish(),
        vlrOrcado: z.coerce.number().positive().nullish(),
      }),
      corpo,
    );
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const proj = await tx.projeto.findFirst({ where: { codProj: BigInt(codProj), ativo: 'S' } });
      if (!proj) throw new NotFoundException('Projeto inexistente neste tenant');
      let grau = proj.grau;
      if (dados.codProjPai !== undefined) {
        if (dados.codProjPai && dados.codProjPai === proj.codProj) throw new BadRequestException('Projeto não pode ser pai de si mesmo');
        if (dados.codProjPai) {
          const pai = await tx.projeto.findFirst({ where: { codProj: dados.codProjPai, ativo: 'S' } });
          if (!pai) throw new BadRequestException('Projeto pai inexistente');
          grau = pai.grau + 1;
        } else {
          grau = 1;
        }
      }
      await tx.projeto.update({
        where: { codProj: proj.codProj },
        data: {
          identificacao: dados.identificacao,
          abreviatura: dados.abreviatura,
          codProjPai: dados.codProjPai,
          codEmp: dados.codEmp,
          dtInicio: dados.dtInicio,
          dtTermino: dados.dtTermino,
          vlrOrcado: dados.vlrOrcado,
          grau,
          codUsuAlt: req.usuario.codUsu,
        },
      });
      return { ok: true };
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

  @Patch('contratos-servico/:codContrato')
  @Permissoes('core.funcionarios.editar')
  async editarContrato(@Req() req: ReqAut, @Param('codContrato') codContrato: string, @Body() corpo: unknown) {
    const dados = validar(
      z.object({
        descrContrato: z.string().min(2).optional(),
        numContrato: z.string().nullish(),
        codProj: z.coerce.bigint().nullish(),
        codEmp: z.coerce.bigint().nullish(),
        tipo: z.string().length(1).optional(),
        vlrHora: z.coerce.number().positive().nullish(),
        parcelaQtd: z.coerce.number().int().positive().nullish(),
        dtTermino: z.coerce.date().nullish(),
      }),
      corpo,
    );
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const c = await tx.contratoServico.findFirst({ where: { codContrato: BigInt(codContrato), ativo: 'S' } });
      if (!c) throw new NotFoundException('Contrato inexistente neste tenant');
      if (dados.codProj) {
        const proj = await tx.projeto.findFirst({ where: { codProj: dados.codProj, ativo: 'S' } });
        if (!proj) throw new BadRequestException('Projeto inexistente neste tenant');
      }
      await tx.contratoServico.update({
        where: { codContrato: c.codContrato },
        data: {
          descrContrato: dados.descrContrato,
          numContrato: dados.numContrato,
          codProj: dados.codProj,
          codEmp: dados.codEmp,
          tipo: dados.tipo,
          vlrHora: dados.vlrHora,
          parcelaQtd: dados.parcelaQtd,
          dtTermino: dados.dtTermino,
          codUsuAlt: req.usuario.codUsu,
        },
      });
      return { ok: true };
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
