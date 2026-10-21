-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "categorie" TEXT NOT NULL DEFAULT 'conseil',
    "resume" TEXT,
    "storageKey" TEXT,
    "dureeSecondes" INTEGER,
    "largeur" INTEGER,
    "hauteur" INTEGER,
    "tailleOctets" INTEGER,
    "datePublication" TIMESTAMP(3),
    "misEnAvant" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "publications_isActive_idx" ON "publications"("isActive");

-- CreateIndex
CREATE INDEX "publications_datePublication_idx" ON "publications"("datePublication");

