-- Propriétés (villa divisée, immeuble, résidence) regroupant plusieurs logements louables.
-- Non destructif : les biens existants restent seuls (immeubleId nul).
CREATE TABLE "immeubles_locatifs" (
    "id" TEXT NOT NULL,
    "referenceInterne" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'immeuble',
    "proprietaireId" TEXT NOT NULL,
    "responsableId" TEXT,
    "adresse" TEXT NOT NULL,
    "commune" TEXT,
    "region" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "tauxGestion" DECIMAL(5,2),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "immeubles_locatifs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "immeubles_locatifs_referenceInterne_key" ON "immeubles_locatifs"("referenceInterne");
CREATE INDEX "immeubles_locatifs_proprietaireId_idx" ON "immeubles_locatifs"("proprietaireId");
CREATE INDEX "immeubles_locatifs_responsableId_idx" ON "immeubles_locatifs"("responsableId");

ALTER TABLE "immeubles_locatifs" ADD CONSTRAINT "immeubles_locatifs_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "proprietaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "immeubles_locatifs" ADD CONSTRAINT "immeubles_locatifs_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "immeubles_locatifs" ADD CONSTRAINT "immeubles_locatifs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "biens_locatifs" ADD COLUMN "immeubleId" TEXT;
ALTER TABLE "biens_locatifs" ADD COLUMN "numeroLot" TEXT;
CREATE INDEX "biens_locatifs_immeubleId_idx" ON "biens_locatifs"("immeubleId");
ALTER TABLE "biens_locatifs" ADD CONSTRAINT "biens_locatifs_immeubleId_fkey" FOREIGN KEY ("immeubleId") REFERENCES "immeubles_locatifs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
