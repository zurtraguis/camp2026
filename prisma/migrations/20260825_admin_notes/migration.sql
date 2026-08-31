-- Observação interna da organização sobre uma inscrição.
-- Aditiva e opcional: pode ser aplicada ANTES do deploy do código sem quebrar
-- nada — o código antigo simplesmente ignora a coluna.
ALTER TABLE "Registration" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT;
