-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "mandatId" TEXT;

-- CreateTable
CREATE TABLE "mandats" (
    "id" TEXT NOT NULL,
    "proprietaireId" TEXT NOT NULL,
    "commercialResponsableId" TEXT,
    "referenceInterne" TEXT NOT NULL,
    "typeMandat" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "exclusivite" BOOLEAN NOT NULL DEFAULT false,
    "prixConditions" TEXT,
    "commissions" TEXT,
    "clauses" TEXT,
    "restrictionsContractuelles" JSONB,
    "objectifsCommercialisation" TEXT,
    "alerteEcheanceJours" INTEGER DEFAULT 30,
    "statut" TEXT NOT NULL DEFAULT 'Brouillon',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mandats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mandat_lots" (
    "id" TEXT NOT NULL,
    "mandatId" TEXT NOT NULL,
    "terrainId" TEXT NOT NULL,
    "statutLot" TEXT NOT NULL DEFAULT 'Confie',
    "dateAttribution" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mandat_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mandat_documents" (
    "id" TEXT NOT NULL,
    "mandatId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'raw',
    "title" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mandat_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mandats_referenceInterne_key" ON "mandats"("referenceInterne");

-- CreateIndex
CREATE INDEX "mandats_proprietaireId_idx" ON "mandats"("proprietaireId");

-- CreateIndex
CREATE INDEX "mandats_commercialResponsableId_idx" ON "mandats"("commercialResponsableId");

-- CreateIndex
CREATE INDEX "mandats_statut_idx" ON "mandats"("statut");

-- CreateIndex
CREATE INDEX "mandats_dateFin_idx" ON "mandats"("dateFin");

-- CreateIndex
CREATE INDEX "mandat_lots_mandatId_idx" ON "mandat_lots"("mandatId");

-- CreateIndex
CREATE INDEX "mandat_lots_terrainId_idx" ON "mandat_lots"("terrainId");

-- CreateIndex
CREATE INDEX "mandat_lots_statutLot_idx" ON "mandat_lots"("statutLot");

-- CreateIndex
CREATE INDEX "mandat_documents_mandatId_type_idx" ON "mandat_documents"("mandatId", "type");

-- CreateIndex
CREATE INDEX "audit_logs_mandatId_idx" ON "audit_logs"("mandatId");

-- AddForeignKey
ALTER TABLE "mandats" ADD CONSTRAINT "mandats_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "proprietaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandats" ADD CONSTRAINT "mandats_commercialResponsableId_fkey" FOREIGN KEY ("commercialResponsableId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandat_lots" ADD CONSTRAINT "mandat_lots_mandatId_fkey" FOREIGN KEY ("mandatId") REFERENCES "mandats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandat_lots" ADD CONSTRAINT "mandat_lots_terrainId_fkey" FOREIGN KEY ("terrainId") REFERENCES "terrains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandat_documents" ADD CONSTRAINT "mandat_documents_mandatId_fkey" FOREIGN KEY ("mandatId") REFERENCES "mandats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_mandatId_fkey" FOREIGN KEY ("mandatId") REFERENCES "mandats"("id") ON DELETE SET NULL ON UPDATE CASCADE;
