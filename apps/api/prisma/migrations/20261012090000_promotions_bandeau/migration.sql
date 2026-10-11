-- Publicités et promotions du bandeau d'accueil
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "storageKey" TEXT,
    "resourceType" TEXT NOT NULL DEFAULT 'image',
    "lienUrl" TEXT,
    "libelleLien" TEXT,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "promotions_isActive_idx" ON "promotions"("isActive");
CREATE INDEX "promotions_ordre_idx" ON "promotions"("ordre");
