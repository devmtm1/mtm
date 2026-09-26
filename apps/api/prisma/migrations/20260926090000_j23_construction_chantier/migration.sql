-- CreateTable
CREATE TABLE "projets_construction" (
    "id" TEXT NOT NULL,
    "referenceInterne" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "terrainId" TEXT,
    "intitule" TEXT NOT NULL,
    "typeProjet" TEXT NOT NULL,
    "programme" TEXT,
    "adresse" TEXT,
    "commune" TEXT,
    "region" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "surfaceBatie" DECIMAL(10,2),
    "nombreNiveaux" INTEGER,
    "montantDevis" DECIMAL(15,2),
    "budgetPrevu" DECIMAL(15,2),
    "montantEngage" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "montantDepense" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "dateDebutPrevue" TIMESTAMP(3),
    "dateFinPrevue" TIMESTAMP(3),
    "dateDebutReelle" TIMESTAMP(3),
    "dateFinReelle" TIMESTAMP(3),
    "avancement" INTEGER NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'prepare',
    "situationAlerte" TEXT NOT NULL DEFAULT 'aucune',
    "responsableId" TEXT,
    "createdById" TEXT,
    "visibleClient" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projets_construction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jalons_chantier" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "poids" INTEGER NOT NULL DEFAULT 1,
    "dateDebutPrevue" TIMESTAMP(3),
    "dateFinPrevue" TIMESTAMP(3),
    "dateDebutReelle" TIMESTAMP(3),
    "dateFinReelle" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'a_venir',
    "avancement" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jalons_chantier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_chantier" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "jalonId" TEXT,
    "date" DATE NOT NULL,
    "intervenants" TEXT,
    "effectif" INTEGER,
    "meteo" TEXT,
    "avancement" INTEGER,
    "observations" TEXT,
    "probleme" TEXT,
    "decisions" TEXT,
    "prochaineAction" TEXT,
    "resolu" BOOLEAN NOT NULL DEFAULT true,
    "visibleClient" BOOLEAN NOT NULL DEFAULT false,
    "redigeParId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_chantier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intervenants_chantier" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "metier" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "reference" TEXT,
    "montantContrat" DECIMAL(15,2),
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'engage',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intervenants_chantier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_budget_chantier" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "poste" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "quantite" DECIMAL(12,2),
    "unite" TEXT,
    "prixUnitaire" DECIMAL(15,2),
    "montantPrevu" DECIMAL(15,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lignes_budget_chantier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depenses_chantier" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "ligneBudgetId" TEXT,
    "intervenantId" TEXT,
    "libelle" TEXT NOT NULL,
    "poste" TEXT NOT NULL,
    "montant" DECIMAL(15,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modePaiement" TEXT,
    "reference" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "motifRejet" TEXT,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "depenses_chantier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents_chantier" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "entreeJournalId" TEXT,
    "type" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'raw',
    "title" TEXT,
    "isGenerated" BOOLEAN NOT NULL DEFAULT false,
    "visibleClient" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_chantier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projets_construction_referenceInterne_key" ON "projets_construction"("referenceInterne");

-- CreateIndex
CREATE INDEX "projets_construction_clientId_idx" ON "projets_construction"("clientId");

-- CreateIndex
CREATE INDEX "projets_construction_terrainId_idx" ON "projets_construction"("terrainId");

-- CreateIndex
CREATE INDEX "projets_construction_statut_idx" ON "projets_construction"("statut");

-- CreateIndex
CREATE INDEX "projets_construction_responsableId_idx" ON "projets_construction"("responsableId");

-- CreateIndex
CREATE INDEX "projets_construction_situationAlerte_idx" ON "projets_construction"("situationAlerte");

-- CreateIndex
CREATE INDEX "projets_construction_dateFinPrevue_idx" ON "projets_construction"("dateFinPrevue");

-- CreateIndex
CREATE INDEX "jalons_chantier_projetId_ordre_idx" ON "jalons_chantier"("projetId", "ordre");

-- CreateIndex
CREATE INDEX "jalons_chantier_projetId_statut_idx" ON "jalons_chantier"("projetId", "statut");

-- CreateIndex
CREATE INDEX "jalons_chantier_dateFinPrevue_idx" ON "jalons_chantier"("dateFinPrevue");

-- CreateIndex
CREATE INDEX "journal_chantier_projetId_date_idx" ON "journal_chantier"("projetId", "date");

-- CreateIndex
CREATE INDEX "journal_chantier_projetId_resolu_idx" ON "journal_chantier"("projetId", "resolu");

-- CreateIndex
CREATE INDEX "journal_chantier_jalonId_idx" ON "journal_chantier"("jalonId");

-- CreateIndex
CREATE INDEX "intervenants_chantier_projetId_statut_idx" ON "intervenants_chantier"("projetId", "statut");

-- CreateIndex
CREATE INDEX "lignes_budget_chantier_projetId_poste_idx" ON "lignes_budget_chantier"("projetId", "poste");

-- CreateIndex
CREATE INDEX "depenses_chantier_projetId_date_idx" ON "depenses_chantier"("projetId", "date");

-- CreateIndex
CREATE INDEX "depenses_chantier_projetId_statut_idx" ON "depenses_chantier"("projetId", "statut");

-- CreateIndex
CREATE INDEX "depenses_chantier_ligneBudgetId_idx" ON "depenses_chantier"("ligneBudgetId");

-- CreateIndex
CREATE INDEX "depenses_chantier_intervenantId_idx" ON "depenses_chantier"("intervenantId");

-- CreateIndex
CREATE INDEX "documents_chantier_projetId_type_idx" ON "documents_chantier"("projetId", "type");

-- CreateIndex
CREATE INDEX "documents_chantier_entreeJournalId_idx" ON "documents_chantier"("entreeJournalId");

-- CreateIndex
CREATE INDEX "documents_chantier_visibleClient_idx" ON "documents_chantier"("visibleClient");

-- AddForeignKey
ALTER TABLE "projets_construction" ADD CONSTRAINT "projets_construction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "prospects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projets_construction" ADD CONSTRAINT "projets_construction_terrainId_fkey" FOREIGN KEY ("terrainId") REFERENCES "terrains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projets_construction" ADD CONSTRAINT "projets_construction_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projets_construction" ADD CONSTRAINT "projets_construction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jalons_chantier" ADD CONSTRAINT "jalons_chantier_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "projets_construction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_chantier" ADD CONSTRAINT "journal_chantier_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "projets_construction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_chantier" ADD CONSTRAINT "journal_chantier_jalonId_fkey" FOREIGN KEY ("jalonId") REFERENCES "jalons_chantier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_chantier" ADD CONSTRAINT "journal_chantier_redigeParId_fkey" FOREIGN KEY ("redigeParId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervenants_chantier" ADD CONSTRAINT "intervenants_chantier_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "projets_construction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_budget_chantier" ADD CONSTRAINT "lignes_budget_chantier_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "projets_construction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depenses_chantier" ADD CONSTRAINT "depenses_chantier_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "projets_construction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depenses_chantier" ADD CONSTRAINT "depenses_chantier_ligneBudgetId_fkey" FOREIGN KEY ("ligneBudgetId") REFERENCES "lignes_budget_chantier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depenses_chantier" ADD CONSTRAINT "depenses_chantier_intervenantId_fkey" FOREIGN KEY ("intervenantId") REFERENCES "intervenants_chantier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depenses_chantier" ADD CONSTRAINT "depenses_chantier_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depenses_chantier" ADD CONSTRAINT "depenses_chantier_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_chantier" ADD CONSTRAINT "documents_chantier_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "projets_construction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_chantier" ADD CONSTRAINT "documents_chantier_entreeJournalId_fkey" FOREIGN KEY ("entreeJournalId") REFERENCES "journal_chantier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_chantier" ADD CONSTRAINT "documents_chantier_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

