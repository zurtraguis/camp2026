-- Intercessão: cada campista fica sob a oração de um coordenador.
-- Aditiva: pode ser aplicada antes do deploy — o código antigo ignora a coluna.

CREATE TABLE IF NOT EXISTS "Coordinator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coordinator_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "intercessorId" TEXT;

CREATE INDEX IF NOT EXISTS "Registration_intercessorId_idx" ON "Registration"("intercessorId");

-- SET NULL: remover um coordenador devolve os campistas dele para a fila.
-- Jamais CASCADE aqui — apagaria as inscrições junto com o coordenador.
ALTER TABLE "Registration"
  DROP CONSTRAINT IF EXISTS "Registration_intercessorId_fkey";
ALTER TABLE "Registration"
  ADD CONSTRAINT "Registration_intercessorId_fkey"
  FOREIGN KEY ("intercessorId") REFERENCES "Coordinator"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
