
-- AlterTable
ALTER TABLE "mandats" ADD COLUMN     "modeReversement" TEXT NOT NULL DEFAULT 'au_fur_et_a_mesure';

-- AlterTable
ALTER TABLE "depenses_chantier" ADD COLUMN     "payeParClient" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "operations_financieres" ADD COLUMN     "autorisationDistance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoriseLe" TIMESTAMP(3),
ADD COLUMN     "autoriseParId" TEXT,
ADD COLUMN     "compteId" TEXT,
ADD COLUMN     "corrigeId" TEXT,
ADD COLUMN     "motifAutorisation" TEXT,
ADD COLUMN     "motifCorrection" TEXT,
ADD COLUMN     "nature" TEXT NOT NULL DEFAULT 'definitive',
ADD COLUMN     "niveauValidation" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "numeroSeq" SERIAL NOT NULL;

-- CreateTable
CREATE TABLE "comptes_tresorerie" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "modes" TEXT[],
    "soldeInitial" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "dateSoldeInitial" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comptes_tresorerie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvements_fonds" (
    "id" TEXT NOT NULL,
    "numeroSeq" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "compteSourceId" TEXT,
    "compteDestinationId" TEXT,
    "montant" DECIMAL(15,2) NOT NULL,
    "date" DATE NOT NULL,
    "origine" TEXT,
    "motif" TEXT NOT NULL,
    "remetId" TEXT,
    "remetNom" TEXT,
    "recoitId" TEXT,
    "recoitNom" TEXT,
    "reference" TEXT,
    "justificatifKey" TEXT,
    "justificatifType" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "motifRejet" TEXT,
    "confirmeParId" TEXT,
    "confirmeLe" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mouvements_fonds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clotures_caisse" (
    "id" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "soldeInitial" DECIMAL(15,2) NOT NULL,
    "encaissements" DECIMAL(15,2) NOT NULL,
    "decaissements" DECIMAL(15,2) NOT NULL,
    "soldeTheorique" DECIMAL(15,2) NOT NULL,
    "montantCompte" DECIMAL(15,2) NOT NULL,
    "ecart" DECIMAL(15,2) NOT NULL,
    "explication" TEXT,
    "justificatifKey" TEXT,
    "justificatifType" TEXT,
    "decision" TEXT NOT NULL DEFAULT 'aucune',
    "decisionMotif" TEXT,
    "decisionParId" TEXT,
    "decisionLe" TIMESTAMP(3),
    "cloturePar" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clotures_caisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reversements_proprietaire" (
    "id" TEXT NOT NULL,
    "numeroSeq" SERIAL NOT NULL,
    "proprietaireId" TEXT NOT NULL,
    "dossierVenteId" TEXT NOT NULL,
    "montant" DECIMAL(15,2) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'normal',
    "motif" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "modePaiement" TEXT,
    "reference" TEXT,
    "datePaiement" DATE,
    "justificatifKey" TEXT,
    "justificatifType" TEXT,
    "motifRejet" TEXT,
    "createdById" TEXT NOT NULL,
    "autoriseParId" TEXT,
    "autoriseLe" TIMESTAMP(3),
    "motifAutorisation" TEXT,
    "payeParId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reversements_proprietaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demandes_remboursement" (
    "id" TEXT NOT NULL,
    "numeroSeq" SERIAL NOT NULL,
    "dossierVenteId" TEXT NOT NULL,
    "dateDemande" DATE NOT NULL,
    "montantVerse" DECIMAL(15,2) NOT NULL,
    "retenuePct" DECIMAL(5,2) NOT NULL,
    "montantRetenu" DECIMAL(15,2) NOT NULL,
    "montantRembourse" DECIMAL(15,2) NOT NULL,
    "delaiMois" INTEGER NOT NULL,
    "dateLimite" DATE NOT NULL,
    "regleValidee" BOOLEAN NOT NULL DEFAULT false,
    "versionProtocole" TEXT,
    "motif" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'demandee',
    "decisionMotif" TEXT,
    "decisionParId" TEXT,
    "decisionLe" TIMESTAMP(3),
    "modePaiement" TEXT,
    "reference" TEXT,
    "datePaiement" DATE,
    "justificatifKey" TEXT,
    "justificatifType" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demandes_remboursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "echeances_chantier" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    "dateEcheance" DATE,
    "montantPrevu" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "echeances_chantier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements_chantier" (
    "id" TEXT NOT NULL,
    "numeroSeq" SERIAL NOT NULL,
    "projetId" TEXT NOT NULL,
    "echeanceId" TEXT,
    "montant" DECIMAL(15,2) NOT NULL,
    "date" DATE NOT NULL,
    "mode" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "justificatifKey" TEXT,
    "justificatifType" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "motifRejet" TEXT,
    "recordedById" TEXT NOT NULL,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paiements_chantier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rapports_quotidiens" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "contenu" JSONB NOT NULL,
    "preparePar" TEXT NOT NULL,
    "verifieParId" TEXT,
    "verifieLe" TIMESTAMP(3),
    "transmisLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rapports_quotidiens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "releve_lignes" (
    "id" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "libelle" TEXT NOT NULL,
    "reference" TEXT,
    "montant" DECIMAL(15,2) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'non_rapproche',
    "mouvementId" TEXT,
    "mouvementLibelle" TEXT,
    "motifIgnore" TEXT,
    "empreinte" TEXT NOT NULL,
    "importeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importeParId" TEXT NOT NULL,
    "rapprocheParId" TEXT,
    "rapprocheLe" TIMESTAMP(3),

    CONSTRAINT "releve_lignes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "comptes_tresorerie_code_key" ON "comptes_tresorerie"("code");

-- CreateIndex
CREATE UNIQUE INDEX "mouvements_fonds_numeroSeq_key" ON "mouvements_fonds"("numeroSeq");

-- CreateIndex
CREATE INDEX "mouvements_fonds_date_idx" ON "mouvements_fonds"("date");

-- CreateIndex
CREATE INDEX "mouvements_fonds_statut_idx" ON "mouvements_fonds"("statut");

-- CreateIndex
CREATE INDEX "mouvements_fonds_compteSourceId_idx" ON "mouvements_fonds"("compteSourceId");

-- CreateIndex
CREATE INDEX "mouvements_fonds_compteDestinationId_idx" ON "mouvements_fonds"("compteDestinationId");

-- CreateIndex
CREATE INDEX "clotures_caisse_date_idx" ON "clotures_caisse"("date");

-- CreateIndex
CREATE INDEX "clotures_caisse_decision_idx" ON "clotures_caisse"("decision");

-- CreateIndex
CREATE UNIQUE INDEX "clotures_caisse_compteId_date_key" ON "clotures_caisse"("compteId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "reversements_proprietaire_numeroSeq_key" ON "reversements_proprietaire"("numeroSeq");

-- CreateIndex
CREATE INDEX "reversements_proprietaire_proprietaireId_idx" ON "reversements_proprietaire"("proprietaireId");

-- CreateIndex
CREATE INDEX "reversements_proprietaire_dossierVenteId_idx" ON "reversements_proprietaire"("dossierVenteId");

-- CreateIndex
CREATE INDEX "reversements_proprietaire_statut_idx" ON "reversements_proprietaire"("statut");

-- CreateIndex
CREATE INDEX "reversements_proprietaire_datePaiement_idx" ON "reversements_proprietaire"("datePaiement");

-- CreateIndex
CREATE UNIQUE INDEX "demandes_remboursement_numeroSeq_key" ON "demandes_remboursement"("numeroSeq");

-- CreateIndex
CREATE INDEX "demandes_remboursement_dossierVenteId_idx" ON "demandes_remboursement"("dossierVenteId");

-- CreateIndex
CREATE INDEX "demandes_remboursement_statut_idx" ON "demandes_remboursement"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "echeances_chantier_projetId_ordre_key" ON "echeances_chantier"("projetId", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "paiements_chantier_numeroSeq_key" ON "paiements_chantier"("numeroSeq");

-- CreateIndex
CREATE INDEX "paiements_chantier_projetId_statut_idx" ON "paiements_chantier"("projetId", "statut");

-- CreateIndex
CREATE INDEX "paiements_chantier_date_idx" ON "paiements_chantier"("date");

-- CreateIndex
CREATE UNIQUE INDEX "rapports_quotidiens_date_key" ON "rapports_quotidiens"("date");

-- CreateIndex
CREATE INDEX "releve_lignes_compteId_date_idx" ON "releve_lignes"("compteId", "date");

-- CreateIndex
CREATE INDEX "releve_lignes_statut_idx" ON "releve_lignes"("statut");

-- CreateIndex
CREATE INDEX "releve_lignes_mouvementId_idx" ON "releve_lignes"("mouvementId");

-- CreateIndex
CREATE UNIQUE INDEX "releve_lignes_compteId_empreinte_key" ON "releve_lignes"("compteId", "empreinte");

-- CreateIndex
CREATE UNIQUE INDEX "operations_financieres_numeroSeq_key" ON "operations_financieres"("numeroSeq");

-- CreateIndex
CREATE INDEX "operations_financieres_compteId_idx" ON "operations_financieres"("compteId");

-- CreateIndex
CREATE INDEX "operations_financieres_corrigeId_idx" ON "operations_financieres"("corrigeId");

-- AddForeignKey
ALTER TABLE "operations_financieres" ADD CONSTRAINT "operations_financieres_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "comptes_tresorerie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_financieres" ADD CONSTRAINT "operations_financieres_autoriseParId_fkey" FOREIGN KEY ("autoriseParId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_financieres" ADD CONSTRAINT "operations_financieres_corrigeId_fkey" FOREIGN KEY ("corrigeId") REFERENCES "operations_financieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_fonds" ADD CONSTRAINT "mouvements_fonds_compteSourceId_fkey" FOREIGN KEY ("compteSourceId") REFERENCES "comptes_tresorerie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_fonds" ADD CONSTRAINT "mouvements_fonds_compteDestinationId_fkey" FOREIGN KEY ("compteDestinationId") REFERENCES "comptes_tresorerie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_fonds" ADD CONSTRAINT "mouvements_fonds_remetId_fkey" FOREIGN KEY ("remetId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_fonds" ADD CONSTRAINT "mouvements_fonds_recoitId_fkey" FOREIGN KEY ("recoitId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_fonds" ADD CONSTRAINT "mouvements_fonds_confirmeParId_fkey" FOREIGN KEY ("confirmeParId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_fonds" ADD CONSTRAINT "mouvements_fonds_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clotures_caisse" ADD CONSTRAINT "clotures_caisse_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "comptes_tresorerie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clotures_caisse" ADD CONSTRAINT "clotures_caisse_decisionParId_fkey" FOREIGN KEY ("decisionParId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clotures_caisse" ADD CONSTRAINT "clotures_caisse_cloturePar_fkey" FOREIGN KEY ("cloturePar") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reversements_proprietaire" ADD CONSTRAINT "reversements_proprietaire_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "proprietaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reversements_proprietaire" ADD CONSTRAINT "reversements_proprietaire_dossierVenteId_fkey" FOREIGN KEY ("dossierVenteId") REFERENCES "dossiers_vente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reversements_proprietaire" ADD CONSTRAINT "reversements_proprietaire_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reversements_proprietaire" ADD CONSTRAINT "reversements_proprietaire_autoriseParId_fkey" FOREIGN KEY ("autoriseParId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reversements_proprietaire" ADD CONSTRAINT "reversements_proprietaire_payeParId_fkey" FOREIGN KEY ("payeParId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes_remboursement" ADD CONSTRAINT "demandes_remboursement_dossierVenteId_fkey" FOREIGN KEY ("dossierVenteId") REFERENCES "dossiers_vente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes_remboursement" ADD CONSTRAINT "demandes_remboursement_decisionParId_fkey" FOREIGN KEY ("decisionParId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes_remboursement" ADD CONSTRAINT "demandes_remboursement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "echeances_chantier" ADD CONSTRAINT "echeances_chantier_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "projets_construction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_chantier" ADD CONSTRAINT "paiements_chantier_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "projets_construction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_chantier" ADD CONSTRAINT "paiements_chantier_echeanceId_fkey" FOREIGN KEY ("echeanceId") REFERENCES "echeances_chantier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_chantier" ADD CONSTRAINT "paiements_chantier_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_chantier" ADD CONSTRAINT "paiements_chantier_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports_quotidiens" ADD CONSTRAINT "rapports_quotidiens_preparePar_fkey" FOREIGN KEY ("preparePar") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports_quotidiens" ADD CONSTRAINT "rapports_quotidiens_verifieParId_fkey" FOREIGN KEY ("verifieParId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "releve_lignes" ADD CONSTRAINT "releve_lignes_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "comptes_tresorerie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "releve_lignes" ADD CONSTRAINT "releve_lignes_importeParId_fkey" FOREIGN KEY ("importeParId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "releve_lignes" ADD CONSTRAINT "releve_lignes_rapprocheParId_fkey" FOREIGN KEY ("rapprocheParId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

