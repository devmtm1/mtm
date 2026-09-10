-- J1.6 — socle vente, réservation, paiements, commissions et documents commerciaux.

ALTER TABLE "dossiers_vente"
  ADD COLUMN "commercialResponsableId" TEXT,
  ADD COLUMN "referenceInterne" TEXT,
  ADD COLUMN "prixVente" DECIMAL(15,2),
  ADD COLUMN "commissionEstimee" DECIMAL(15,2),
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "dateVente" TIMESTAMP(3);

CREATE UNIQUE INDEX "dossiers_vente_referenceInterne_key" ON "dossiers_vente"("referenceInterne");
CREATE INDEX "dossiers_vente_commercialResponsableId_idx" ON "dossiers_vente"("commercialResponsableId");
CREATE INDEX "dossiers_vente_statut_idx" ON "dossiers_vente"("statut");

CREATE TABLE "reservations" (
  "id" TEXT NOT NULL,
  "dossierVenteId" TEXT NOT NULL,
  "montantAcompte" DECIMAL(15,2) NOT NULL,
  "dureeBlocageJours" INTEGER NOT NULL,
  "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dateExpiration" TIMESTAMP(3) NOT NULL,
  "conditionsAnnulation" TEXT,
  "statut" TEXT NOT NULL DEFAULT 'active',
  "reference" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "paiements" (
  "id" TEXT NOT NULL,
  "dossierVenteId" TEXT NOT NULL,
  "montant" DECIMAL(15,2) NOT NULL,
  "datePaiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "mode" TEXT NOT NULL,
  "reference" TEXT,
  "justificatifUrl" TEXT,
  "statut" TEXT NOT NULL DEFAULT 'en_attente',
  "notes" TEXT,
  "recordedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "paiements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commissions_vente" (
  "id" TEXT NOT NULL,
  "dossierVenteId" TEXT NOT NULL,
  "commercialId" TEXT NOT NULL,
  "typeRegle" TEXT NOT NULL,
  "taux" DECIMAL(8,4),
  "montantFixe" DECIMAL(15,2),
  "montantEstime" DECIMAL(15,2) NOT NULL,
  "montantValide" DECIMAL(15,2),
  "montantPaye" DECIMAL(15,2),
  "statut" TEXT NOT NULL DEFAULT 'estimee',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "commissions_vente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "documents_vente" (
  "id" TEXT NOT NULL,
  "dossierVenteId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL DEFAULT 'raw',
  "title" TEXT,
  "isGenerated" BOOLEAN NOT NULL DEFAULT false,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "documents_vente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reservations_reference_key" ON "reservations"("reference");
CREATE INDEX "reservations_dossierVenteId_idx" ON "reservations"("dossierVenteId");
CREATE INDEX "reservations_statut_idx" ON "reservations"("statut");
CREATE INDEX "reservations_dateExpiration_idx" ON "reservations"("dateExpiration");
CREATE INDEX "paiements_dossierVenteId_idx" ON "paiements"("dossierVenteId");
CREATE INDEX "paiements_datePaiement_idx" ON "paiements"("datePaiement");
CREATE INDEX "paiements_statut_idx" ON "paiements"("statut");
CREATE INDEX "commissions_vente_dossierVenteId_idx" ON "commissions_vente"("dossierVenteId");
CREATE INDEX "commissions_vente_commercialId_idx" ON "commissions_vente"("commercialId");
CREATE INDEX "commissions_vente_statut_idx" ON "commissions_vente"("statut");
CREATE INDEX "documents_vente_dossierVenteId_type_idx" ON "documents_vente"("dossierVenteId", "type");
CREATE INDEX "documents_vente_isPublic_idx" ON "documents_vente"("isPublic");

ALTER TABLE "dossiers_vente" ADD CONSTRAINT "dossiers_vente_commercialResponsableId_fkey"
  FOREIGN KEY ("commercialResponsableId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_dossierVenteId_fkey"
  FOREIGN KEY ("dossierVenteId") REFERENCES "dossiers_vente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_dossierVenteId_fkey"
  FOREIGN KEY ("dossierVenteId") REFERENCES "dossiers_vente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "commissions_vente" ADD CONSTRAINT "commissions_vente_dossierVenteId_fkey"
  FOREIGN KEY ("dossierVenteId") REFERENCES "dossiers_vente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commissions_vente" ADD CONSTRAINT "commissions_vente_commercialId_fkey"
  FOREIGN KEY ("commercialId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents_vente" ADD CONSTRAINT "documents_vente_dossierVenteId_fkey"
  FOREIGN KEY ("dossierVenteId") REFERENCES "dossiers_vente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents_vente" ADD CONSTRAINT "documents_vente_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;