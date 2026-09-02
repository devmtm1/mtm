-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "prospectId" TEXT;

-- CreateTable
CREATE TABLE "prospects" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "paysResidence" TEXT,
    "sourceAcquisition" TEXT,
    "besoins" TEXT,
    "budgetMin" DECIMAL(15,2),
    "budgetMax" DECIMAL(15,2),
    "preferences" TEXT,
    "commercialResponsableId" TEXT,
    "statutPipeline" TEXT NOT NULL DEFAULT 'nouveau_contact',
    "score" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossiers_vente" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "terrainId" TEXT,
    "mandatId" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'en_cours',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dossiers_vente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activites_crm" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "dateEcheance" TIMESTAMP(3),
    "dateRealisation" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'a_faire',
    "priorite" TEXT NOT NULL DEFAULT 'moyenne',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activites_crm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents_crm" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'raw',
    "title" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_crm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prospects_commercialResponsableId_idx" ON "prospects"("commercialResponsableId");

-- CreateIndex
CREATE INDEX "prospects_statutPipeline_idx" ON "prospects"("statutPipeline");

-- CreateIndex
CREATE INDEX "prospects_createdAt_idx" ON "prospects"("createdAt");

-- CreateIndex
CREATE INDEX "dossiers_vente_prospectId_idx" ON "dossiers_vente"("prospectId");

-- CreateIndex
CREATE INDEX "dossiers_vente_terrainId_idx" ON "dossiers_vente"("terrainId");

-- CreateIndex
CREATE INDEX "dossiers_vente_mandatId_idx" ON "dossiers_vente"("mandatId");

-- CreateIndex
CREATE INDEX "activites_crm_prospectId_idx" ON "activites_crm"("prospectId");

-- CreateIndex
CREATE INDEX "activites_crm_statut_idx" ON "activites_crm"("statut");

-- CreateIndex
CREATE INDEX "documents_crm_prospectId_type_idx" ON "documents_crm"("prospectId", "type");

-- CreateIndex
CREATE INDEX "audit_logs_prospectId_idx" ON "audit_logs"("prospectId");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "prospects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_commercialResponsableId_fkey" FOREIGN KEY ("commercialResponsableId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers_vente" ADD CONSTRAINT "dossiers_vente_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "prospects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers_vente" ADD CONSTRAINT "dossiers_vente_terrainId_fkey" FOREIGN KEY ("terrainId") REFERENCES "terrains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers_vente" ADD CONSTRAINT "dossiers_vente_mandatId_fkey" FOREIGN KEY ("mandatId") REFERENCES "mandats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activites_crm" ADD CONSTRAINT "activites_crm_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_crm" ADD CONSTRAINT "documents_crm_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
