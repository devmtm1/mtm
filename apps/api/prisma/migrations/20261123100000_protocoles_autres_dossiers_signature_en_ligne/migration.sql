-- Protocoles : un protocole peut suivre une vente, un bail ou un chantier (un seul à la fois), avec ses propres pièces pour les
-- baux et chantiers ; et l'acceptation en ligne par le client (signature électronique simple) avec sa preuve.
-- AlterTable
ALTER TABLE "protocoles_dossier" ADD COLUMN     "acceptationAgent" TEXT,
ADD COLUMN     "acceptationEmpreinte" TEXT,
ADD COLUMN     "acceptationIp" TEXT,
ADD COLUMN     "acceptationLe" TIMESTAMP(3),
ADD COLUMN     "acceptationNom" TEXT,
ADD COLUMN     "bailLocatifId" TEXT,
ADD COLUMN     "empreinteDocument" TEXT,
ADD COLUMN     "fichierPrepareId" TEXT,
ADD COLUMN     "fichierSigneId" TEXT,
ADD COLUMN     "projetConstructionId" TEXT,
ALTER COLUMN "dossierVenteId" DROP NOT NULL;
-- CreateTable
CREATE TABLE "protocoles_fichiers" (
    "id" TEXT NOT NULL,
    "protocoleId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "title" TEXT,
    "storageKey" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'raw',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "protocoles_fichiers_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "protocoles_fichiers_protocoleId_role_idx" ON "protocoles_fichiers"("protocoleId", "role");
-- CreateIndex
CREATE INDEX "protocoles_dossier_bailLocatifId_idx" ON "protocoles_dossier"("bailLocatifId");
-- CreateIndex
CREATE INDEX "protocoles_dossier_projetConstructionId_idx" ON "protocoles_dossier"("projetConstructionId");
-- AddForeignKey
ALTER TABLE "protocoles_dossier" ADD CONSTRAINT "protocoles_dossier_bailLocatifId_fkey" FOREIGN KEY ("bailLocatifId") REFERENCES "baux_locatifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "protocoles_dossier" ADD CONSTRAINT "protocoles_dossier_projetConstructionId_fkey" FOREIGN KEY ("projetConstructionId") REFERENCES "projets_construction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "protocoles_dossier" ADD CONSTRAINT "protocoles_dossier_fichierPrepareId_fkey" FOREIGN KEY ("fichierPrepareId") REFERENCES "protocoles_fichiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "protocoles_dossier" ADD CONSTRAINT "protocoles_dossier_fichierSigneId_fkey" FOREIGN KEY ("fichierSigneId") REFERENCES "protocoles_fichiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "protocoles_fichiers" ADD CONSTRAINT "protocoles_fichiers_protocoleId_fkey" FOREIGN KEY ("protocoleId") REFERENCES "protocoles_dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "protocoles_fichiers" ADD CONSTRAINT "protocoles_fichiers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Exactement un dossier par protocole : sans cette contrainte, une erreur de saisie laisserait un protocole orphelin ou double.
ALTER TABLE "protocoles_dossier" ADD CONSTRAINT "protocoles_un_seul_dossier"
  CHECK (num_nonnulls("dossierVenteId", "bailLocatifId", "projetConstructionId") = 1);

-- Signature en ligne par le client : désactivée tant que le conseil juridique de MTM n'a pas validé sa valeur (docs/PROTOCOLES.md).
INSERT INTO "system_settings" ("id", "key", "value", "description", "isSensitive", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'protocoles.signatureEnLigne',
  to_jsonb(false),
  'Autoriser le client à accepter son protocole en ligne depuis son espace (signature électronique simple)',
  false,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
