-- DropIndex
DROP INDEX "commissions_vente_commercialId_idx";

-- DropIndex
DROP INDEX "commissions_vente_dossierVenteId_idx";

-- DropIndex
DROP INDEX "commissions_vente_statut_idx";

-- DropIndex
DROP INDEX "paiements_dossierVenteId_idx";

-- DropIndex
DROP INDEX "paiements_statut_idx";

-- CreateTable
CREATE TABLE "echeances_paiement" (
    "id" TEXT NOT NULL,
    "dossierVenteId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "montantPrevu" DECIMAL(15,2) NOT NULL,
    "montantPaye" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "echeances_paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcase_items" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "date" TIMESTAMP(3),
    "storageKey" TEXT,
    "resourceType" TEXT NOT NULL DEFAULT 'image',
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "showcase_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "echeances_paiement_dossierVenteId_statut_idx" ON "echeances_paiement"("dossierVenteId", "statut");

-- CreateIndex
CREATE INDEX "echeances_paiement_dateEcheance_idx" ON "echeances_paiement"("dateEcheance");

-- CreateIndex
CREATE UNIQUE INDEX "echeances_paiement_dossierVenteId_numero_key" ON "echeances_paiement"("dossierVenteId", "numero");

-- CreateIndex
CREATE INDEX "showcase_items_category_idx" ON "showcase_items"("category");

-- CreateIndex
CREATE INDEX "showcase_items_isActive_idx" ON "showcase_items"("isActive");

-- CreateIndex
CREATE INDEX "showcase_items_ordre_idx" ON "showcase_items"("ordre");

-- CreateIndex
CREATE INDEX "commissions_vente_dossierVenteId_commercialId_idx" ON "commissions_vente"("dossierVenteId", "commercialId");

-- CreateIndex
CREATE INDEX "commissions_vente_dossierVenteId_statut_idx" ON "commissions_vente"("dossierVenteId", "statut");

-- CreateIndex
CREATE INDEX "commissions_vente_commercialId_statut_idx" ON "commissions_vente"("commercialId", "statut");

-- CreateIndex
CREATE INDEX "paiements_dossierVenteId_statut_idx" ON "paiements"("dossierVenteId", "statut");

-- AddForeignKey
ALTER TABLE "echeances_paiement" ADD CONSTRAINT "echeances_paiement_dossierVenteId_fkey" FOREIGN KEY ("dossierVenteId") REFERENCES "dossiers_vente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcase_items" ADD CONSTRAINT "showcase_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
