-- AlterTable
ALTER TABLE "biens_locatifs" ADD COLUMN     "tauxGestion" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "operations_financieres" (
    "id" TEXT NOT NULL,
    "sens" TEXT NOT NULL,
    "activite" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "montant" DECIMAL(15,2) NOT NULL,
    "date" DATE NOT NULL,
    "modePaiement" TEXT,
    "reference" TEXT,
    "tiers" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "entityLabel" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "motifRejet" TEXT,
    "justificatifKey" TEXT,
    "justificatifType" TEXT,
    "createdById" TEXT NOT NULL,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operations_financieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clotures_financieres" (
    "id" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "resume" JSONB NOT NULL,
    "cloturePar" TEXT NOT NULL,
    "clotureLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clotures_financieres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operations_financieres_date_idx" ON "operations_financieres"("date");

-- CreateIndex
CREATE INDEX "operations_financieres_statut_idx" ON "operations_financieres"("statut");

-- CreateIndex
CREATE INDEX "operations_financieres_activite_sens_idx" ON "operations_financieres"("activite", "sens");

-- CreateIndex
CREATE UNIQUE INDEX "clotures_financieres_periode_key" ON "clotures_financieres"("periode");

-- AddForeignKey
ALTER TABLE "operations_financieres" ADD CONSTRAINT "operations_financieres_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_financieres" ADD CONSTRAINT "operations_financieres_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clotures_financieres" ADD CONSTRAINT "clotures_financieres_cloturePar_fkey" FOREIGN KEY ("cloturePar") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
