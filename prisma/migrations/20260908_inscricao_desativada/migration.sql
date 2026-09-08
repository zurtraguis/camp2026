-- Inscrição DESATIVADA: quem sumiu e não pagou sai da tribo e libera a vaga,
-- mas pode voltar — e volta como quem se inscreveu naquele dia.
--
-- Aditiva e compatível com o código antigo: nenhuma linha muda de status aqui,
-- e a coluna `tribo` só deixa de ser obrigatória (o código antigo sempre
-- preenche, então continua funcionando).

-- ALTER TYPE ... ADD VALUE não pode ser usado na MESMA transação que o cria.
-- Como aqui só o declaramos (nada grava INACTIVE ainda), é seguro.
ALTER TYPE "RegistrationStatus" ADD VALUE IF NOT EXISTS 'INACTIVE' BEFORE 'CANCELLED';

-- Sem tribo enquanto desativada. Quem não vem não ocupa lugar numa tribo.
ALTER TABLE "Registration" ALTER COLUMN "tribo" DROP NOT NULL;
