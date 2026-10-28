-- Justificatif d'assurance déposé par le locataire, contrôlé par MTM.
ALTER TABLE "documents_locatif"
  ADD COLUMN "deposeParLocataire" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "controleStatut" TEXT,
  ADD COLUMN "dateExpiration" DATE,
  ADD COLUMN "motifRejet" TEXT,
  ADD COLUMN "controleLe" TIMESTAMP(3),
  ADD COLUMN "controleParId" TEXT;

-- Charges communes d'une propriété.
CREATE TABLE "charges_immeubles" (
  "id" TEXT NOT NULL,
  "immeubleId" TEXT NOT NULL,
  "libelle" TEXT NOT NULL,
  "montant" DECIMAL(15,2) NOT NULL,
  "dateCharge" DATE NOT NULL,
  "repartition" TEXT NOT NULL DEFAULT 'egale',
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "charges_immeubles_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "charges_immeubles_immeubleId_dateCharge_idx" ON "charges_immeubles"("immeubleId", "dateCharge");
ALTER TABLE "charges_immeubles"
  ADD CONSTRAINT "charges_immeubles_immeubleId_fkey" FOREIGN KEY ("immeubleId") REFERENCES "immeubles_locatifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Relevé de gestion unique d'une propriété.
CREATE TABLE "releves_immeubles" (
  "id" TEXT NOT NULL,
  "immeubleId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "periodeDebut" DATE NOT NULL,
  "periodeFin" DATE NOT NULL,
  "totalDu" DECIMAL(15,2) NOT NULL,
  "totalEncaisse" DECIMAL(15,2) NOT NULL,
  "totalCharges" DECIMAL(15,2) NOT NULL,
  "net" DECIMAL(15,2) NOT NULL,
  "storageKey" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL DEFAULT 'raw',
  "visibleProprietaire" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "releves_immeubles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "releves_immeubles_reference_key" ON "releves_immeubles"("reference");
CREATE INDEX "releves_immeubles_immeubleId_createdAt_idx" ON "releves_immeubles"("immeubleId", "createdAt");
ALTER TABLE "releves_immeubles"
  ADD CONSTRAINT "releves_immeubles_immeubleId_fkey" FOREIGN KEY ("immeubleId") REFERENCES "immeubles_locatifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
