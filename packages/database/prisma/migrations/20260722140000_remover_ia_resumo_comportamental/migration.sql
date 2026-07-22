-- Remove TGPIARESUMO: o resumo executivo e as perguntas de entrevista geradas a
-- partir SÓ do resultado comportamental foram absorvidos pela análise de
-- candidato (TREIAANALISE), que recebe os mesmos insumos e mais vaga,
-- requisitos, currículo e triagem. As duas rotas ficaram sem consumidor no
-- frontend ao unificar as abas na "Dossiê" — órfão é dívida, não patrimônio.
--
-- Só havia 6 linhas, todas de teste; nenhum dado de cliente se perde.

-- DropForeignKey
ALTER TABLE "TGPIARESUMO" DROP CONSTRAINT "TGPIARESUMO_CODRESULT_fkey";

-- DropForeignKey
ALTER TABLE "TGPIARESUMO" DROP CONSTRAINT "TGPIARESUMO_CODTEN_fkey";

-- DropTable
DROP TABLE "TGPIARESUMO";

