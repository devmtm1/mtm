-- AlterTable
ALTER TABLE "prospects" ADD COLUMN     "commentaireNegociation" TEXT,
ADD COLUMN     "motifSortie" TEXT,
ADD COLUMN     "niveauInteret" TEXT,
ADD COLUMN     "objectifAchat" TEXT,
ADD COLUMN     "offreClient" DECIMAL(15,2),
ADD COLUMN     "premierContactLe" TIMESTAMP(3),
ADD COLUMN     "premierContactMoyen" TEXT,
ADD COLUMN     "prixNegocie" DECIMAL(15,2),
ADD COLUMN     "prochaineAction" TEXT,
ADD COLUMN     "prochaineRelanceLe" TIMESTAMP(3),
ADD COLUMN     "referenceInterne" TEXT,
ADD COLUMN     "surfaceSouhaitee" INTEGER,
ADD COLUMN     "terrainChoisiId" TEXT,
ADD COLUMN     "typeDocumentSouhaite" TEXT,
ADD COLUMN     "villeResidence" TEXT,
ADD COLUMN     "whatsapp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "zoneRecherchee" TEXT,
ALTER COLUMN "statutPipeline" SET DEFAULT 'nouveau';

-- AlterTable
ALTER TABLE "commissions_vente" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "validatedById" TEXT;

-- CreateTable
CREATE TABLE "visites_prospect" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "terrainId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'proposee',
    "dateProposee" TIMESTAMP(3),
    "dateConfirmee" TIMESTAMP(3),
    "heure" TEXT,
    "lieuRendezVous" TEXT,
    "fraisVisite" DECIMAL(15,2),
    "fraisPayes" BOOLEAN NOT NULL DEFAULT false,
    "accompagnateurId" TEXT,
    "motifNonEffectuee" TEXT,
    "dateRetour" TIMESTAMP(3),
    "terrainPlait" TEXT,
    "prixAccepte" TEXT,
    "objectionPrincipale" TEXT,
    "commentaireClient" TEXT,
    "souhaiteAutreTerrain" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visites_prospect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visites_prospect_prospectId_statut_idx" ON "visites_prospect"("prospectId", "statut");

-- CreateIndex
CREATE INDEX "visites_prospect_terrainId_idx" ON "visites_prospect"("terrainId");

-- CreateIndex
CREATE INDEX "visites_prospect_dateConfirmee_idx" ON "visites_prospect"("dateConfirmee");

-- CreateIndex
CREATE UNIQUE INDEX "prospects_referenceInterne_key" ON "prospects"("referenceInterne");

-- CreateIndex
CREATE INDEX "prospects_prochaineRelanceLe_idx" ON "prospects"("prochaineRelanceLe");

-- AddForeignKey
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_terrainChoisiId_fkey" FOREIGN KEY ("terrainChoisiId") REFERENCES "terrains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visites_prospect" ADD CONSTRAINT "visites_prospect_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visites_prospect" ADD CONSTRAINT "visites_prospect_terrainId_fkey" FOREIGN KEY ("terrainId") REFERENCES "terrains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visites_prospect" ADD CONSTRAINT "visites_prospect_accompagnateurId_fkey" FOREIGN KEY ("accompagnateurId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visites_prospect" ADD CONSTRAINT "visites_prospect_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

