import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export interface DadosAdmissao {
  codEmp: bigint;
  numCad: bigint;
  nomeFun: string;
  /// Sem e-mail não há como enviar documento para assinatura (RN-SX-001).
  email?: string;
  cgc?: string;
  dtAdm: Date;
  dtNasc?: Date;
  codCar?: bigint;
  codDep?: bigint;
  codCencus?: bigint;
  tipoContrato: string;
  vlrSal?: number;
}

/**
 * Regra de admissão do Core, extraída do controller para ser reutilizável por
 * outros módulos (ex.: Recrutamento e Seleção, RN-REC-007: hired → admissão)
 * sem duplicar a lógica — ver "09 - Módulos/README.md" (fronteiras entre módulos).
 */
@Injectable()
export class FuncionariosService {
  /** Cria o funcionário e registra o evento de vida ADMISSAO em TFPFUNHIS. */
  async admitir(tx: Prisma.TransactionClient, codTen: bigint, codUsu: bigint, dados: DadosAdmissao) {
    const empresa = await tx.empresa.findFirst({ where: { codEmp: dados.codEmp, ativo: 'S' } });
    if (!empresa) throw new BadRequestException('Empresa/filial inexistente neste tenant');

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
        codTen,
        codEmp: dados.codEmp,
        numCad: dados.numCad,
        nomeFun: dados.nomeFun,
        email: dados.email,
        cgc: dados.cgc,
        dtAdm: dados.dtAdm,
        dtNasc: dados.dtNasc,
        codCar: dados.codCar,
        codDep: dados.codDep,
        codCencus: dados.codCencus,
        tipoContrato: dados.tipoContrato,
        vlrSal: dados.vlrSal,
        codUsuInc: codUsu,
      },
      select: { codFun: true, numCad: true, nomeFun: true },
    });

    await tx.funcionarioHistorico.create({
      data: {
        codTen,
        codFun: funcionario.codFun,
        tipoMud: 'ADMISSAO',
        valorNovo: dados.nomeFun,
        dtMud: dados.dtAdm,
        codUsuInc: codUsu,
      },
    });

    return funcionario;
  }
}
