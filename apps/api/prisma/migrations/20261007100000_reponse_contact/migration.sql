-- Réponse de l'équipe à un message de contact : visible du client dans son espace.
ALTER TABLE "contacts" ADD COLUMN "reponse" TEXT,
ADD COLUMN "reponduLe" TIMESTAMP(3),
ADD COLUMN "reponduParId" TEXT;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_reponduParId_fkey" FOREIGN KEY ("reponduParId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
