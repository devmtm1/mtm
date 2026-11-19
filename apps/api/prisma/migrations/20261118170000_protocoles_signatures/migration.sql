-- CreateTable
CREATE TABLE "protocoles_dossier" (
    "id" TEXT NOT NULL,
    "dossierVenteId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'protocole_accord',
    "titre" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'a_preparer',
    "documentPrepareId" TEXT,
    "documentSigneId" TEXT,
    "dateEnvoi" TIMESTAMP(3),
    "moyenEnvoi" TEXT,
    "dateReceptionSignee" TIMESTAMP(3),
    "dateSignatureMtm" TIMESTAMP(3),
    "motif" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protocoles_dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocoles_historique" (
    "id" TEXT NOT NULL,
    "protocoleId" TEXT NOT NULL,
    "deStatut" TEXT,
    "versStatut" TEXT NOT NULL,
    "note" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protocoles_historique_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "protocoles_dossier_dossierVenteId_idx" ON "protocoles_dossier"("dossierVenteId");

-- CreateIndex
CREATE INDEX "protocoles_dossier_statut_idx" ON "protocoles_dossier"("statut");

-- CreateIndex
CREATE INDEX "protocoles_dossier_dateEnvoi_idx" ON "protocoles_dossier"("dateEnvoi");

-- CreateIndex
CREATE INDEX "protocoles_historique_protocoleId_createdAt_idx" ON "protocoles_historique"("protocoleId", "createdAt");

-- AddForeignKey
ALTER TABLE "protocoles_dossier" ADD CONSTRAINT "protocoles_dossier_dossierVenteId_fkey" FOREIGN KEY ("dossierVenteId") REFERENCES "dossiers_vente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocoles_dossier" ADD CONSTRAINT "protocoles_dossier_documentPrepareId_fkey" FOREIGN KEY ("documentPrepareId") REFERENCES "documents_vente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocoles_dossier" ADD CONSTRAINT "protocoles_dossier_documentSigneId_fkey" FOREIGN KEY ("documentSigneId") REFERENCES "documents_vente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocoles_dossier" ADD CONSTRAINT "protocoles_dossier_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocoles_historique" ADD CONSTRAINT "protocoles_historique_protocoleId_fkey" FOREIGN KEY ("protocoleId") REFERENCES "protocoles_dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocoles_historique" ADD CONSTRAINT "protocoles_historique_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

