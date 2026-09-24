-- J2.1 (complément) : situation de paiement du bail, validation des
-- encaissements, historique de caution, relances configurables, demandes du
-- locataire et visibilités de document séparées.

-- AlterTable
ALTER TABLE "baux_locatifs" ADD COLUMN     "situationPaiement" TEXT NOT NULL DEFAULT 'a_jour';

-- AlterTable
ALTER TABLE "paiements_loyer" ADD COLUMN     "statut" TEXT NOT NULL DEFAULT 'en_attente',
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedById" TEXT;

-- Les versements déjà saisis avant ce jalon ont été imputés sur les échéances
-- au moment de leur saisie : ils sont donc validés, pas en attente.
UPDATE "paiements_loyer" SET "statut" = 'valide';

-- AlterTable
ALTER TABLE "incidents_locatifs" ADD COLUMN     "nature" TEXT NOT NULL DEFAULT 'incident';

-- AlterTable
ALTER TABLE "documents_locatif" ADD COLUMN     "visibleLocataire" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visibleProprietaire" BOOLEAN NOT NULL DEFAULT false;

-- Reprise de l'ancien drapeau unique : une quittance est une pièce du
-- locataire, les autres pièces publiées restaient visibles des deux côtés.
UPDATE "documents_locatif" SET "visibleLocataire" = "isPublic";
UPDATE "documents_locatif" SET "visibleProprietaire" = "isPublic" WHERE "type" <> 'quittance';

-- DropIndex
DROP INDEX "documents_locatif_isPublic_idx";

-- AlterTable
ALTER TABLE "documents_locatif" DROP COLUMN "isPublic";

-- DropIndex
DROP INDEX "paiements_loyer_bailLocatifId_idx";

-- CreateTable
CREATE TABLE "mouvements_caution" (
    "id" TEXT NOT NULL,
    "bailLocatifId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "montant" DECIMAL(15,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "justification" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mouvements_caution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relances_loyer" (
    "id" TEXT NOT NULL,
    "bailLocatifId" TEXT NOT NULL,
    "echeanceId" TEXT,
    "modeleCode" TEXT NOT NULL,
    "joursRetard" INTEGER NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'email',
    "destinataire" TEXT,
    "objet" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'a_envoyer',
    "envoyeeLe" TIMESTAMP(3),
    "envoyeeById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relances_loyer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "baux_locatifs_situationPaiement_idx" ON "baux_locatifs"("situationPaiement");

-- CreateIndex
CREATE INDEX "paiements_loyer_bailLocatifId_statut_idx" ON "paiements_loyer"("bailLocatifId", "statut");

-- CreateIndex
CREATE INDEX "incidents_locatifs_nature_statut_idx" ON "incidents_locatifs"("nature", "statut");

-- CreateIndex
CREATE INDEX "documents_locatif_visibleLocataire_idx" ON "documents_locatif"("visibleLocataire");

-- CreateIndex
CREATE INDEX "documents_locatif_visibleProprietaire_idx" ON "documents_locatif"("visibleProprietaire");

-- CreateIndex
CREATE INDEX "mouvements_caution_bailLocatifId_date_idx" ON "mouvements_caution"("bailLocatifId", "date");

-- CreateIndex
CREATE INDEX "relances_loyer_bailLocatifId_statut_idx" ON "relances_loyer"("bailLocatifId", "statut");

-- CreateIndex
CREATE INDEX "relances_loyer_statut_createdAt_idx" ON "relances_loyer"("statut", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "relances_loyer_echeanceId_modeleCode_key" ON "relances_loyer"("echeanceId", "modeleCode");

-- AddForeignKey
ALTER TABLE "paiements_loyer" ADD CONSTRAINT "paiements_loyer_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_caution" ADD CONSTRAINT "mouvements_caution_bailLocatifId_fkey" FOREIGN KEY ("bailLocatifId") REFERENCES "baux_locatifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_caution" ADD CONSTRAINT "mouvements_caution_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relances_loyer" ADD CONSTRAINT "relances_loyer_bailLocatifId_fkey" FOREIGN KEY ("bailLocatifId") REFERENCES "baux_locatifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relances_loyer" ADD CONSTRAINT "relances_loyer_echeanceId_fkey" FOREIGN KEY ("echeanceId") REFERENCES "echeances_loyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relances_loyer" ADD CONSTRAINT "relances_loyer_envoyeeById_fkey" FOREIGN KEY ("envoyeeById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
