-- CreateTable
CREATE TABLE "materiels" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "marque" TEXT,
    "modele" TEXT,
    "numeroSerie" TEXT,
    "dateAchat" DATE,
    "prixAchat" DECIMAL(15,2),
    "fournisseur" TEXT,
    "garantieJusqua" DATE,
    "etat" TEXT NOT NULL DEFAULT 'bon',
    "statut" TEXT NOT NULL DEFAULT 'disponible',
    "lieu" TEXT,
    "affecteAId" TEXT,
    "projetId" TEXT,
    "affecteANom" TEXT,
    "affecteLe" TIMESTAMP(3),
    "prochainEntretien" DATE,
    "notes" TEXT,
    "sortieType" TEXT,
    "sortieMotif" TEXT,
    "sortieLe" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materiels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiels_mouvements" (
    "id" TEXT NOT NULL,
    "materielId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "resume" TEXT NOT NULL,
    "note" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materiels_mouvements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiels_entretiens" (
    "id" TEXT NOT NULL,
    "materielId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'prevu',
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "cout" DECIMAL(15,2),
    "prestataire" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materiels_entretiens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiels_fichiers" (
    "id" TEXT NOT NULL,
    "materielId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "title" TEXT,
    "storageKey" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'image',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materiels_fichiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiels_inventaires" (
    "id" TEXT NOT NULL,
    "lieu" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_cours',
    "termineLe" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materiels_inventaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiels_inventaires_lignes" (
    "id" TEXT NOT NULL,
    "inventaireId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "materielId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materiels_inventaires_lignes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "materiels_numero_key" ON "materiels"("numero");

-- CreateIndex
CREATE INDEX "materiels_categorie_idx" ON "materiels"("categorie");

-- CreateIndex
CREATE INDEX "materiels_statut_idx" ON "materiels"("statut");

-- CreateIndex
CREATE INDEX "materiels_lieu_idx" ON "materiels"("lieu");

-- CreateIndex
CREATE INDEX "materiels_affecteAId_idx" ON "materiels"("affecteAId");

-- CreateIndex
CREATE INDEX "materiels_projetId_idx" ON "materiels"("projetId");

-- CreateIndex
CREATE INDEX "materiels_mouvements_materielId_createdAt_idx" ON "materiels_mouvements"("materielId", "createdAt");

-- CreateIndex
CREATE INDEX "materiels_entretiens_materielId_statut_idx" ON "materiels_entretiens"("materielId", "statut");

-- CreateIndex
CREATE INDEX "materiels_entretiens_statut_date_idx" ON "materiels_entretiens"("statut", "date");

-- CreateIndex
CREATE INDEX "materiels_fichiers_materielId_idx" ON "materiels_fichiers"("materielId");

-- CreateIndex
CREATE INDEX "materiels_inventaires_statut_idx" ON "materiels_inventaires"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "materiels_inventaires_lignes_inventaireId_numero_key" ON "materiels_inventaires_lignes"("inventaireId", "numero");

-- AddForeignKey
ALTER TABLE "materiels" ADD CONSTRAINT "materiels_affecteAId_fkey" FOREIGN KEY ("affecteAId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiels" ADD CONSTRAINT "materiels_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "projets_construction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiels" ADD CONSTRAINT "materiels_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiels_mouvements" ADD CONSTRAINT "materiels_mouvements_materielId_fkey" FOREIGN KEY ("materielId") REFERENCES "materiels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiels_mouvements" ADD CONSTRAINT "materiels_mouvements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiels_entretiens" ADD CONSTRAINT "materiels_entretiens_materielId_fkey" FOREIGN KEY ("materielId") REFERENCES "materiels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiels_entretiens" ADD CONSTRAINT "materiels_entretiens_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiels_fichiers" ADD CONSTRAINT "materiels_fichiers_materielId_fkey" FOREIGN KEY ("materielId") REFERENCES "materiels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiels_fichiers" ADD CONSTRAINT "materiels_fichiers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiels_inventaires" ADD CONSTRAINT "materiels_inventaires_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiels_inventaires_lignes" ADD CONSTRAINT "materiels_inventaires_lignes_inventaireId_fkey" FOREIGN KEY ("inventaireId") REFERENCES "materiels_inventaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiels_inventaires_lignes" ADD CONSTRAINT "materiels_inventaires_lignes_materielId_fkey" FOREIGN KEY ("materielId") REFERENCES "materiels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

