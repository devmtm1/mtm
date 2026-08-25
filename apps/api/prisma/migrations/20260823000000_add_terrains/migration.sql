-- J1.1 — Module Terrains.
-- Migration écrite depuis prisma/schema.prisma ; à confirmer avec
-- `prisma migrate dev` contre la base de test réelle.

CREATE TABLE "proprietaires" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "proprietaires_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "terrains" (
    "id" TEXT NOT NULL,
    "referenceInterne" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "parcelleMatricule" TEXT,
    "informationsCadastrales" JSONB,
    "proprietaireId" TEXT,
    "statutJuridique" TEXT NOT NULL,
    "typeDocumentFoncier" TEXT,
    "niveauVerification" TEXT NOT NULL,
    "region" TEXT,
    "commune" TEXT,
    "localisationDetail" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "superficie" DECIMAL(14,2),
    "uniteSuperficie" TEXT,
    "dimensions" JSONB,
    "prixAcquisition" DECIMAL(15,2),
    "prixPublic" DECIMAL(15,2),
    "marge" DECIMAL(15,2),
    "commission" DECIMAL(15,2),
    "statutCommercial" TEXT NOT NULL,
    "accesRoutier" TEXT,
    "eauDisponible" BOOLEAN,
    "electriciteDisponible" BOOLEAN,
    "voisinage" TEXT,
    "vocation" TEXT,
    "proximiteAxes" TEXT,
    "pointsInteret" JSONB,
    "notesInternes" TEXT,
    "commercialResponsableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "terrains_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "terrain_medias" (
    "id" TEXT NOT NULL,
    "terrainId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "title" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "capturedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "terrain_medias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "terrain_documents" (
    "id" TEXT NOT NULL,
    "terrainId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "title" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "terrain_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "terrains_referenceInterne_key" ON "terrains"("referenceInterne");
CREATE INDEX "proprietaires_lastName_firstName_idx" ON "proprietaires"("lastName", "firstName");
CREATE INDEX "terrains_statutJuridique_idx" ON "terrains"("statutJuridique");
CREATE INDEX "terrains_niveauVerification_idx" ON "terrains"("niveauVerification");
CREATE INDEX "terrains_statutCommercial_idx" ON "terrains"("statutCommercial");
CREATE INDEX "terrains_proprietaireId_idx" ON "terrains"("proprietaireId");
CREATE INDEX "terrains_commercialResponsableId_idx" ON "terrains"("commercialResponsableId");
CREATE INDEX "terrains_region_commune_idx" ON "terrains"("region", "commune");
CREATE INDEX "terrains_superficie_idx" ON "terrains"("superficie");
CREATE INDEX "terrains_prixPublic_idx" ON "terrains"("prixPublic");
CREATE INDEX "terrain_medias_terrainId_sortOrder_idx" ON "terrain_medias"("terrainId", "sortOrder");
CREATE INDEX "terrain_documents_terrainId_type_idx" ON "terrain_documents"("terrainId", "type");

ALTER TABLE "terrains" ADD CONSTRAINT "terrains_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "proprietaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "terrains" ADD CONSTRAINT "terrains_commercialResponsableId_fkey" FOREIGN KEY ("commercialResponsableId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "terrain_medias" ADD CONSTRAINT "terrain_medias_terrainId_fkey" FOREIGN KEY ("terrainId") REFERENCES "terrains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "terrain_documents" ADD CONSTRAINT "terrain_documents_terrainId_fkey" FOREIGN KEY ("terrainId") REFERENCES "terrains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
