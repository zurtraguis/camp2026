-- O acampamento passa de 4 para 3 tribos: Pistis sai; ficam Ágape, Eirene e Chara.
--
-- ORDEM DE APLICAÇÃO (importante): esta migração deve rodar DEPOIS do deploy do
-- código de 3 tribos. Enquanto o enum ainda tem PISTIS, a aplicação nova grava
-- normalmente (o banco aceita um superconjunto); o inverso — dropar o valor com
-- código velho no ar — quebraria qualquer inscrição nova.

-- Ninguém pode ficar para trás: se ainda houver campista em PISTIS, a migração
-- aborta em vez de apagar a tribo dele em silêncio. Rebalanceie antes
-- (painel admin → Tribos → Rebalancear, ou `npx tsx scripts/rebalance-tribos.ts --apply`).
DO $$
DECLARE restantes int;
BEGIN
  SELECT count(*) INTO restantes FROM "Registration" WHERE "tribo" = 'PISTIS';
  IF restantes > 0 THEN
    RAISE EXCEPTION 'Ainda há % inscrição(ões) na tribo PISTIS. Rebalanceie antes de aplicar esta migração.', restantes;
  END IF;
END $$;

-- Postgres não permite remover um valor de enum: recria-se o tipo.
ALTER TYPE "Tribo" RENAME TO "Tribo_old";
CREATE TYPE "Tribo" AS ENUM ('AGAPE', 'EIRENE', 'CHARA');
ALTER TABLE "Registration"
  ALTER COLUMN "tribo" TYPE "Tribo" USING ("tribo"::text::"Tribo");
DROP TYPE "Tribo_old";
