-- CreateTable
CREATE TABLE "TSXEMAIL" (
    "CODEMAIL" BIGSERIAL NOT NULL,
    "CODTEN" BIGINT NOT NULL,
    "DESTINATARIO" TEXT NOT NULL,
    "ASSUNTO" TEXT NOT NULL,
    "CORPOTEXTO" TEXT NOT NULL,
    "CORPOHTML" TEXT,
    "TEMPLATE" TEXT NOT NULL,
    "CHAVEIDEM" TEXT NOT NULL,
    "STATUS" TEXT NOT NULL DEFAULT 'PENDENTE',
    "TENTATIVAS" INTEGER NOT NULL DEFAULT 0,
    "ERRO" TEXT,
    "DHENVIO" TIMESTAMP(3),
    "DHINC" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CODUSUINC" BIGINT,

    CONSTRAINT "TSXEMAIL_pkey" PRIMARY KEY ("CODEMAIL")
);

-- CreateIndex
CREATE UNIQUE INDEX "TSXEMAIL_CHAVEIDEM_key" ON "TSXEMAIL"("CHAVEIDEM");

-- CreateIndex
CREATE INDEX "TSXEMAIL_STATUS_DHINC_idx" ON "TSXEMAIL"("STATUS", "DHINC");

-- CreateIndex
CREATE INDEX "TSXEMAIL_CODTEN_DHINC_idx" ON "TSXEMAIL"("CODTEN", "DHINC");

-- AddForeignKey
ALTER TABLE "TSXEMAIL" ADD CONSTRAINT "TSXEMAIL_CODTEN_fkey" FOREIGN KEY ("CODTEN") REFERENCES "TSXTEN"("CODTEN") ON DELETE RESTRICT ON UPDATE CASCADE;


-- SelX: RLS (ADR-0002) — TSXEMAIL guarda mensagens por tenant.
--
-- O drenador da fila roda FORA de contexto de tenant (varre a fila inteira) e
-- por isso usa `prisma.admin`, que já contorna RLS por desenho — mesmo caminho
-- das consultas por token público. A política aqui protege o acesso normal.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['TSXEMAIL'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY politica_tenant ON %I USING ("CODTEN" = NULLIF(current_setting(''app.codten'', true), '''')::bigint) WITH CHECK ("CODTEN" = NULLIF(current_setting(''app.codten'', true), '''')::bigint)', t);
  END LOOP;
END $$;
