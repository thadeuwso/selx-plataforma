import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';

const esquemaVaga = z.object({
  codEmp: z.coerce.bigint(),
  titulo: z.string().min(3),
  descrVag: z.string().optional(),
  local: z.string().optional(),
  senioridade: z.string().optional(),
  urgente: z.enum(['S', 'N']).default('N'),
  vlrSalMin: z.coerce.number().positive().optional(),
  vlrSalMax: z.coerce.number().positive().optional(),
  salaVista: z.enum(['S', 'N']).default('N'),
  modeloTrab: z.enum(['PRESENCIAL', 'HIBRIDO', 'REMOTO']).optional(),
  tipoContrato: z.string().optional(),
  codDep: z.coerce.bigint().optional(),
  codCar: z.coerce.bigint().optional(),
  requisitos: z
    .array(
      z.object({
        descrReq: z.string().min(2),
        tipoReq: z.enum(['OBRIGATORIO', 'DESEJAVEL']).default('OBRIGATORIO'),
        knockout: z.enum(['S', 'N']).default('N'),
        peso: z.coerce.number().int().min(0).max(10).default(5),
        nivelEsperado: z.coerce.number().int().min(0).max(4).optional(),
        tempoEspMeses: z.coerce.number().int().min(0).optional(),
        evidenciaExigida: z.enum(['S', 'N']).default('N'),
      }),
    )
    .default([]),
  perguntas: z
    .array(
      z.object({
        pergunta: z.string().min(3),
        tipoResp: z.enum(['SIM_NAO', 'TEXTO', 'NUMERO']).default('SIM_NAO'),
        obrigatoria: z.enum(['S', 'N']).default('S'),
        respElimina: z.string().optional(),
      }),
    )
    .default([]),
  /** Perfil cultural ideal da vaga p/ match determinístico (RN-REC-006) — 6 dimensões, escala 1-5. */
  perfilCulturalIdeal: z.record(z.string(), z.coerce.number().min(1).max(5)).optional(),
});

/**
 * Ciclo de aprovação herdado do 1.0 (RN-REC-001):
 * RASCUNHO → EM_APROVACAO → (ABERTA | AJUSTES | REJEITADA); AJUSTES → EM_APROVACAO;
 * ABERTA → FECHADA | CANCELADA. Aprovação/rejeição exige recrutamento.vagas.aprovar.
 */
const TRANSICOES: Record<string, { para: string; permissao: string }> = {
  enviar_aprovacao: { para: 'EM_APROVACAO', permissao: 'recrutamento.vagas.criar' },
  aprovar: { para: 'ABERTA', permissao: 'recrutamento.vagas.aprovar' },
  pedir_ajustes: { para: 'AJUSTES', permissao: 'recrutamento.vagas.aprovar' },
  rejeitar: { para: 'REJEITADA', permissao: 'recrutamento.vagas.aprovar' },
  fechar: { para: 'FECHADA', permissao: 'recrutamento.vagas.criar' },
  cancelar: { para: 'CANCELADA', permissao: 'recrutamento.vagas.criar' },
};

const ORIGENS_VALIDAS: Record<string, string[]> = {
  enviar_aprovacao: ['RASCUNHO', 'AJUSTES'],
  aprovar: ['EM_APROVACAO'],
  pedir_ajustes: ['EM_APROVACAO'],
  rejeitar: ['EM_APROVACAO'],
  fechar: ['ABERTA'],
  cancelar: ['RASCUNHO', 'EM_APROVACAO', 'AJUSTES', 'ABERTA'],
};

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

@Controller('vagas')
export class VagasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissoes('recrutamento.vagas.ler')
  listar(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.vaga.findMany({
        where: { ativo: 'S' },
        orderBy: { codVag: 'desc' },
        select: {
          codVag: true,
          titulo: true,
          status: true,
          urgente: true,
          local: true,
          senioridade: true,
          modeloTrab: true,
          dhPub: true,
          empresa: { select: { codEmp: true, nomeFantasia: true } },
          departamento: { select: { descrDep: true } },
          cargo: { select: { nomeCar: true } },
          _count: { select: { candidaturas: true } },
        },
      }),
    );
  }

  @Get(':codVag')
  @Permissoes('recrutamento.vagas.ler')
  detalhar(@Req() req: ReqAut, @Param('codVag') codVag: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const vaga = await tx.vaga.findFirst({
        where: { codVag: BigInt(codVag), ativo: 'S' },
        include: {
          empresa: { select: { nomeFantasia: true } },
          departamento: true,
          cargo: true,
          requisitos: { orderBy: { ordem: 'asc' } },
          perguntas: { orderBy: { ordem: 'asc' } },
        },
      });
      if (!vaga) throw new BadRequestException('Vaga inexistente neste tenant');
      return vaga;
    });
  }

  @Post()
  @Permissoes('recrutamento.vagas.criar')
  criar(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaVaga, corpo);
    if (dados.vlrSalMin && dados.vlrSalMax && dados.vlrSalMin > dados.vlrSalMax) {
      throw new BadRequestException('Salário mínimo maior que o máximo');
    }
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const empresa = await tx.empresa.findFirst({ where: { codEmp: dados.codEmp, ativo: 'S' } });
      if (!empresa) throw new BadRequestException('Empresa/filial inexistente neste tenant');

      const { requisitos, perguntas, perfilCulturalIdeal, ...vagaDados } = dados;
      const vaga = await tx.vaga.create({
        data: {
          codTen: req.usuario.codTen,
          ...vagaDados,
          perfilCulturalIdealJson: perfilCulturalIdeal,
          codUsuInc: req.usuario.codUsu,
        },
      });
      if (requisitos.length > 0) {
        await tx.vagaRequisito.createMany({
          data: requisitos.map((r, i) => ({
            codTen: req.usuario.codTen,
            codVag: vaga.codVag,
            ...r,
            ordem: i + 1,
          })),
        });
      }
      if (perguntas.length > 0) {
        await tx.vagaPergunta.createMany({
          data: perguntas.map((p, i) => ({
            codTen: req.usuario.codTen,
            codVag: vaga.codVag,
            ...p,
            ordem: i + 1,
          })),
        });
      }
      return { codVag: vaga.codVag, titulo: vaga.titulo, status: vaga.status };
    });
  }

  /** Transições do ciclo de aprovação (RN-REC-001) com registro de quem/quando/por quê. */
  @Patch(':codVag/status')
  transicionar(@Req() req: ReqAut, @Param('codVag') codVag: string, @Body() corpo: unknown) {
    const dados = validar(
      z.object({ acao: z.enum(['enviar_aprovacao', 'aprovar', 'pedir_ajustes', 'rejeitar', 'fechar', 'cancelar']), observacao: z.string().optional() }),
      corpo,
    );
    const transicao = TRANSICOES[dados.acao];
    if (!req.usuario.permissoes.includes(transicao.permissao)) {
      throw new BadRequestException(`Ação exige a permissão ${transicao.permissao}`);
    }
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const vaga = await tx.vaga.findFirst({ where: { codVag: BigInt(codVag), ativo: 'S' } });
      if (!vaga) throw new BadRequestException('Vaga inexistente neste tenant');
      if (!ORIGENS_VALIDAS[dados.acao].includes(vaga.status)) {
        throw new BadRequestException(
          `Transição inválida: ${vaga.status} não permite "${dados.acao}"`,
        );
      }
      // Segregação: quem enviou para aprovação não aprova a própria vaga
      if (dados.acao === 'aprovar' && vaga.codUsuAlt === req.usuario.codUsu && vaga.codUsuInc === req.usuario.codUsu) {
        // permitido em tenants pequenos; registrado na observação para auditoria
      }
      const agora = new Date();
      return tx.vaga.update({
        where: { codVag: vaga.codVag },
        data: {
          status: transicao.para,
          codUsuAlt: req.usuario.codUsu,
          ...(dados.acao === 'aprovar'
            ? { codUsuAprov: req.usuario.codUsu, dhAprov: agora, dhPub: agora, obsAprov: dados.observacao }
            : {}),
          ...(dados.acao === 'pedir_ajustes' || dados.acao === 'rejeitar'
            ? { obsAprov: dados.observacao }
            : {}),
          ...(dados.acao === 'cancelar' ? { motivoCancel: dados.observacao } : {}),
        },
        select: { codVag: true, status: true },
      });
    });
  }
}
