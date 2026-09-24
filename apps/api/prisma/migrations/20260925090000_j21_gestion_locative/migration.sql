-- AlterTable
ALTER TABLE "users" ADD COLUMN     "clientLocataireId" TEXT,
ADD COLUMN     "clientProprietaireId" TEXT;

-- CreateTable
CREATE TABLE "locataires" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locataires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biens_locatifs" (
    "id" TEXT NOT NULL,
    "referenceInterne" TEXT NOT NULL,
    "proprietaireId" TEXT NOT NULL,
    "responsableId" TEXT,
    "type" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "commune" TEXT,
    "region" TEXT,
    "superficie" DECIMAL(10,2),
    "statut" TEXT NOT NULL DEFAULT 'disponible',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biens_locatifs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baux_locatifs" (
    "id" TEXT NOT NULL,
    "referenceInterne" TEXT NOT NULL,
    "bienLocatifId" TEXT NOT NULL,
    "locataireId" TEXT NOT NULL,
    "loyerMensuel" DECIMAL(15,2) NOT NULL,
    "charges" DECIMAL(15,2),
    "jourEcheance" INTEGER NOT NULL DEFAULT 5,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "cautionMontant" DECIMAL(15,2),
    "cautionDate" TIMESTAMP(3),
    "cautionStatut" TEXT NOT NULL DEFAULT 'non_versee',
    "cautionRetenue" DECIMAL(15,2),
    "cautionJustification" TEXT,
    "cautionRembourseeLe" TIMESTAMP(3),
    "cautionRembourseeMontant" DECIMAL(15,2),
    "statut" TEXT NOT NULL DEFAULT 'actif',
    "preavisDonneLe" TIMESTAMP(3),
    "preavisDepartPrevu" TIMESTAMP(3),
    "etatLieuxEntree" TEXT,
    "etatLieuxSortie" TEXT,
    "dateSortieReelle" TIMESTAMP(3),
    "regularisationMontant" DECIMAL(15,2),
    "regularisationNotes" TEXT,
    "motifCloture" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "baux_locatifs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "echeances_loyer" (
    "id" TEXT NOT NULL,
    "bailLocatifId" TEXT NOT NULL,
    "periode" TIMESTAMP(3) NOT NULL,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "montantPrevu" DECIMAL(15,2) NOT NULL,
    "montantPaye" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'a_venir',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "echeances_loyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements_loyer" (
    "id" TEXT NOT NULL,
    "bailLocatifId" TEXT NOT NULL,
    "echeanceId" TEXT,
    "type" TEXT NOT NULL,
    "montant" DECIMAL(15,2) NOT NULL,
    "datePaiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modePaiement" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiements_loyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents_locatifs" (
    "id" TEXT NOT NULL,
    "bailLocatifId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'signale',
    "resolutionNotes" TEXT,
    "reportedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "incidents_locatifs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents_locatif" (
    "id" TEXT NOT NULL,
    "bailLocatifId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'raw',
    "title" TEXT,
    "isGenerated" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_locatif_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "locataires_lastName_firstName_idx" ON "locataires"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "biens_locatifs_referenceInterne_key" ON "biens_locatifs"("referenceInterne");

-- CreateIndex
CREATE INDEX "biens_locatifs_proprietaireId_idx" ON "biens_locatifs"("proprietaireId");

-- CreateIndex
CREATE INDEX "biens_locatifs_responsableId_idx" ON "biens_locatifs"("responsableId");

-- CreateIndex
CREATE INDEX "biens_locatifs_statut_idx" ON "biens_locatifs"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "baux_locatifs_referenceInterne_key" ON "baux_locatifs"("referenceInterne");

-- CreateIndex
CREATE INDEX "baux_locatifs_bienLocatifId_idx" ON "baux_locatifs"("bienLocatifId");

-- CreateIndex
CREATE INDEX "baux_locatifs_locataireId_idx" ON "baux_locatifs"("locataireId");

-- CreateIndex
CREATE INDEX "baux_locatifs_statut_idx" ON "baux_locatifs"("statut");

-- CreateIndex
CREATE INDEX "echeances_loyer_bailLocatifId_statut_idx" ON "echeances_loyer"("bailLocatifId", "statut");

-- CreateIndex
CREATE INDEX "echeances_loyer_dateEcheance_idx" ON "echeances_loyer"("dateEcheance");

-- CreateIndex
CREATE UNIQUE INDEX "echeances_loyer_bailLocatifId_periode_key" ON "echeances_loyer"("bailLocatifId", "periode");

-- CreateIndex
CREATE INDEX "paiements_loyer_bailLocatifId_idx" ON "paiements_loyer"("bailLocatifId");

-- CreateIndex
CREATE INDEX "paiements_loyer_echeanceId_idx" ON "paiements_loyer"("echeanceId");

-- CreateIndex
CREATE INDEX "paiements_loyer_datePaiement_idx" ON "paiements_loyer"("datePaiement");

-- CreateIndex
CREATE INDEX "incidents_locatifs_bailLocatifId_statut_idx" ON "incidents_locatifs"("bailLocatifId", "statut");

-- CreateIndex
CREATE INDEX "documents_locatif_bailLocatifId_type_idx" ON "documents_locatif"("bailLocatifId", "type");

-- CreateIndex
CREATE INDEX "documents_locatif_isPublic_idx" ON "documents_locatif"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "users_clientProprietaireId_key" ON "users"("clientProprietaireId");

-- CreateIndex
CREATE UNIQUE INDEX "users_clientLocataireId_key" ON "users"("clientLocataireId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clientProprietaireId_fkey" FOREIGN KEY ("clientProprietaireId") REFERENCES "proprietaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clientLocataireId_fkey" FOREIGN KEY ("clientLocataireId") REFERENCES "locataires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biens_locatifs" ADD CONSTRAINT "biens_locatifs_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "proprietaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biens_locatifs" ADD CONSTRAINT "biens_locatifs_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biens_locatifs" ADD CONSTRAINT "biens_locatifs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baux_locatifs" ADD CONSTRAINT "baux_locatifs_bienLocatifId_fkey" FOREIGN KEY ("bienLocatifId") REFERENCES "biens_locatifs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baux_locatifs" ADD CONSTRAINT "baux_locatifs_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "locataires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baux_locatifs" ADD CONSTRAINT "baux_locatifs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "echeances_loyer" ADD CONSTRAINT "echeances_loyer_bailLocatifId_fkey" FOREIGN KEY ("bailLocatifId") REFERENCES "baux_locatifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_loyer" ADD CONSTRAINT "paiements_loyer_bailLocatifId_fkey" FOREIGN KEY ("bailLocatifId") REFERENCES "baux_locatifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_loyer" ADD CONSTRAINT "paiements_loyer_echeanceId_fkey" FOREIGN KEY ("echeanceId") REFERENCES "echeances_loyer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_loyer" ADD CONSTRAINT "paiements_loyer_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents_locatifs" ADD CONSTRAINT "incidents_locatifs_bailLocatifId_fkey" FOREIGN KEY ("bailLocatifId") REFERENCES "baux_locatifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents_locatifs" ADD CONSTRAINT "incidents_locatifs_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_locatif" ADD CONSTRAINT "documents_locatif_bailLocatifId_fkey" FOREIGN KEY ("bailLocatifId") REFERENCES "baux_locatifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_locatif" ADD CONSTRAINT "documents_locatif_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

