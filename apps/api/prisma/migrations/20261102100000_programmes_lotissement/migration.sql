-- Programmes de lotissement : un ensemble de lots (terrains) saisi une seule fois.
CREATE TABLE "programmes_lotissement" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "region" TEXT,
  "commune" TEXT,
  "localisationDetail" TEXT,
  "description" TEXT,
  "proprietaireId" TEXT,
  "statutJuridique" TEXT NOT NULL,
  "typeDocumentFoncier" TEXT,
  "niveauVerification" TEXT NOT NULL,
  "prixLot" DECIMAL(15,2),
  "modalitePaiement" TEXT,
  "dureeMoratoireMois" INTEGER,
  "acompteMontant" DECIMAL(15,2),
  "archiveLe" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "programmes_lotissement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "programmes_lotissement_reference_key" ON "programmes_lotissement"("reference");
CREATE INDEX "programmes_lotissement_proprietaireId_idx" ON "programmes_lotissement"("proprietaireId");
CREATE INDEX "programmes_lotissement_archiveLe_idx" ON "programmes_lotissement"("archiveLe");
ALTER TABLE "programmes_lotissement" ADD CONSTRAINT "programmes_lotissement_proprietaireId_fkey"
  FOREIGN KEY ("proprietaireId") REFERENCES "proprietaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "categories_lot" (
  "id" TEXT NOT NULL,
  "programmeId" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "prixPublic" DECIMAL(15,2),
  "modalitePaiement" TEXT,
  "dureeMoratoireMois" INTEGER,
  "acompteMontant" DECIMAL(15,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "categories_lot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "categories_lot_programmeId_nom_key" ON "categories_lot"("programmeId", "nom");
ALTER TABLE "categories_lot" ADD CONSTRAINT "categories_lot_programmeId_fkey"
  FOREIGN KEY ("programmeId") REFERENCES "programmes_lotissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "terrains"
  ADD COLUMN "programmeId" TEXT,
  ADD COLUMN "categorieLotId" TEXT,
  ADD COLUMN "numeroLot" TEXT;
CREATE INDEX "terrains_programmeId_idx" ON "terrains"("programmeId");
CREATE INDEX "terrains_categorieLotId_idx" ON "terrains"("categorieLotId");
CREATE UNIQUE INDEX "terrains_programmeId_numeroLot_key" ON "terrains"("programmeId", "numeroLot");
ALTER TABLE "terrains" ADD CONSTRAINT "terrains_programmeId_fkey"
  FOREIGN KEY ("programmeId") REFERENCES "programmes_lotissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "terrains" ADD CONSTRAINT "terrains_categorieLotId_fkey"
  FOREIGN KEY ("categorieLotId") REFERENCES "categories_lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
