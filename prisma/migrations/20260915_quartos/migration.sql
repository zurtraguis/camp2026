-- Quartos do alojamento + líder de quarto (o mais velho, calculado na leitura).
-- Aditiva: o código antigo ignora a tabela e a coluna.

CREATE TABLE IF NOT EXISTS "Room" (
    "id" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "number" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Room_gender_number_key" ON "Room"("gender", "number");

ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "roomId" TEXT;
CREATE INDEX IF NOT EXISTS "Registration_roomId_idx" ON "Registration"("roomId");

-- SET NULL: regerar quartos apaga os antigos; a inscrição fica "sem quarto".
-- Jamais CASCADE — apagaria inscrições junto com o quarto.
ALTER TABLE "Registration" DROP CONSTRAINT IF EXISTS "Registration_roomId_fkey";
ALTER TABLE "Registration"
  ADD CONSTRAINT "Registration_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
