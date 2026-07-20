/**
 * Seed do catálogo global de permissões (TSXPERM).
 * Idempotente (upsert por CHAVEPERM). Roda com o papel administrativo.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissoes = [
  ["core.empresas.ler", "Ver empresas e filiais"],
  ["core.empresas.criar", "Criar empresas e filiais"],
  ["core.empresas.editar", "Editar empresas e filiais"],
  ["core.usuarios.ler", "Ver usuários"],
  ["core.usuarios.criar", "Criar usuários"],
  ["core.usuarios.editar", "Editar usuários e papéis"],
  ["core.funcionarios.ler", "Ver funcionários"],
  ["core.funcionarios.criar", "Cadastrar funcionários"],
  ["core.funcionarios.editar", "Editar funcionários"],
  ["core.auditoria.ler", "Consultar trilha de auditoria"],
  ["recrutamento.vagas.ler", "Ver vagas"],
  ["recrutamento.vagas.criar", "Criar e editar vagas"],
  ["recrutamento.vagas.aprovar", "Aprovar, rejeitar e pedir ajustes em vagas"],
  ["recrutamento.candidatos.ler", "Ver candidatos e candidaturas"],
  ["recrutamento.candidatos.criar", "Cadastrar/importar candidatos e mover pipeline"],
  ["core.documentos.ler", "Ver modelos de documento e assinaturas"],
  ["core.documentos.criar", "Enviar documento para assinatura"],
  ["core.documentos.editar", "Criar/editar modelos de documento"],
  ["gestaopessoas.avaliacoes.ler", "Ver perfis comportamentais de vaga, convites e resultados"],
  ["gestaopessoas.avaliacoes.criar", "Configurar perfil comportamental da vaga e convidar candidatos"],
];

for (const [chavePerm, descrPerm] of permissoes) {
  await prisma.permissao.upsert({
    where: { chavePerm },
    update: { descrPerm },
    create: { chavePerm, descrPerm },
  });
}

console.log(`Seed: ${permissoes.length} permissões garantidas no catálogo.`);
await prisma.$disconnect();
