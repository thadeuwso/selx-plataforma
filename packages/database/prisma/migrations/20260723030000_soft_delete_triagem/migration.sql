-- Soft-delete em TRECANDTAG, TRECDTFAV e TREFILTRO.
--
-- O papel `selx_app` não tem DELETE em tabela nenhuma (migration core_v1) — a
-- plataforma não apaga registro, marca como inativo. As três nasceram na
-- migration anterior com DELETE no código e falharam com 42501 na primeira
-- execução da fumaça.

-- AlterTable
ALTER TABLE "TRECANDTAG" ADD COLUMN     "ATIVO" CHAR(1) NOT NULL DEFAULT 'S';

-- AlterTable
ALTER TABLE "TRECDTFAV" ADD COLUMN     "ATIVO" CHAR(1) NOT NULL DEFAULT 'S';

-- AlterTable
ALTER TABLE "TREFILTRO" ADD COLUMN     "ATIVO" CHAR(1) NOT NULL DEFAULT 'S';

