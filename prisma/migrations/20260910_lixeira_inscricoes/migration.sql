-- Lixeira das inscrições excluídas: guarda a fotografia completa antes de apagar.
-- Aditiva; o código antigo simplesmente ignora a tabela.

CREATE TABLE IF NOT EXISTS "DeletedRegistration" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "publicCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedById" TEXT,
    "deletedByName" TEXT,
    "reason" TEXT,
    "snapshot" JSONB NOT NULL,
    "restoredAt" TIMESTAMP(3),

    CONSTRAINT "DeletedRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DeletedRegistration_registrationId_key"
  ON "DeletedRegistration"("registrationId");
CREATE INDEX IF NOT EXISTS "DeletedRegistration_deletedAt_idx"
  ON "DeletedRegistration"("deletedAt");
