-- AlterTable
ALTER TABLE "TFPFUN" ADD COLUMN     "EMAIL" TEXT;


-- Backfill: funcionário admitido pelo processo de recrutamento herda o e-mail
-- do candidato que lhe deu origem. É o mesmo endereço com que a pessoa se
-- candidatou, e o único que a plataforma conhece.
UPDATE "TFPFUN" f
   SET "EMAIL" = c."EMAIL"
  FROM "TRECDT" cdt
  JOIN "TRECAND" c ON c."CODCAND" = cdt."CODCAND"
 WHERE cdt."CODFUN" = f."CODFUN"
   AND f."EMAIL" IS NULL;
