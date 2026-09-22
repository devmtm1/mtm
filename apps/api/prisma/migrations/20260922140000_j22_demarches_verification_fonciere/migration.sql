-- CreateTable
CREATE TABLE "missions_verification" (
    "id" TEXT NOT NULL,
    "referenceInterne" TEXT,
    "prospectId" TEXT NOT NULL,
    "terrainId" TEXT,
    "typeVerification" TEXT NOT NULL,
    "objectif" TEXT,
    "localisation" TEXT,
    "region" TEXT,
    "commune" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "piecesFournies" TEXT,
    "urgence" TEXT NOT NULL DEFAULT 'normale',
    "budgetAnnonce" DECIMAL(15,2),
    "dateDemande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEcheance" TIMESTAMP(3),
    "faisabiliteConclusion" TEXT,
    "faisabiliteNotes" TEXT,
    "montantDevis" DECIMAL(15,2),
    "fraisEtude" DECIMAL(15,2),
    "montantPaye" DECIMAL(15,2),
    "modePaiement" TEXT,
    "referencePaiement" TEXT,
    "decision" TEXT,
    "conclusion" TEXT,
    "reserves" TEXT,
    "recommandation" TEXT,
    "dateRapport" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'demande',
    "responsableId" TEXT,
    "createdById" TEXT,
    "visibleClient" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "missions_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapes_mission" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "observations" TEXT,
    "dateVisite" TIMESTAMP(3),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "accesDescription" TEXT,
    "environnement" TEXT,
    "conformiteApparente" TEXT,
    "administration" TEXT,
    "interlocuteur" TEXT,
    "resultat" TEXT,
    "realiseeParId" TEXT,
    "realiseeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etapes_mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents_mission" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'raw',
    "title" TEXT,
    "isGenerated" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_mission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "missions_verification_referenceInterne_key" ON "missions_verification"("referenceInterne");

-- CreateIndex
CREATE INDEX "missions_verification_prospectId_idx" ON "missions_verification"("prospectId");

-- CreateIndex
CREATE INDEX "missions_verification_terrainId_idx" ON "missions_verification"("terrainId");

-- CreateIndex
CREATE INDEX "missions_verification_statut_idx" ON "missions_verification"("statut");

-- CreateIndex
CREATE INDEX "missions_verification_responsableId_idx" ON "missions_verification"("responsableId");

-- CreateIndex
CREATE INDEX "missions_verification_dateEcheance_idx" ON "missions_verification"("dateEcheance");

-- CreateIndex
CREATE INDEX "etapes_mission_missionId_type_idx" ON "etapes_mission"("missionId", "type");

-- CreateIndex
CREATE INDEX "documents_mission_missionId_type_idx" ON "documents_mission"("missionId", "type");

-- CreateIndex
CREATE INDEX "documents_mission_isPublic_idx" ON "documents_mission"("isPublic");

-- AddForeignKey
ALTER TABLE "missions_verification" ADD CONSTRAINT "missions_verification_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "prospects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions_verification" ADD CONSTRAINT "missions_verification_terrainId_fkey" FOREIGN KEY ("terrainId") REFERENCES "terrains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions_verification" ADD CONSTRAINT "missions_verification_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions_verification" ADD CONSTRAINT "missions_verification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapes_mission" ADD CONSTRAINT "etapes_mission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions_verification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapes_mission" ADD CONSTRAINT "etapes_mission_realiseeParId_fkey" FOREIGN KEY ("realiseeParId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_mission" ADD CONSTRAINT "documents_mission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions_verification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_mission" ADD CONSTRAINT "documents_mission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

