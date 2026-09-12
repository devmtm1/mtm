-- CreateTable
CREATE TABLE "objectifs_commerciaux" (
    "id" TEXT NOT NULL,
    "commercialId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "cibleVentes" INTEGER,
    "cibleChiffreAffaires" DECIMAL(15,2),
    "cibleCommissions" DECIMAL(15,2),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "objectifs_commerciaux_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "objectifs_commerciaux_periode_idx" ON "objectifs_commerciaux"("periode");

-- CreateIndex
CREATE UNIQUE INDEX "objectifs_commerciaux_commercialId_periode_key" ON "objectifs_commerciaux"("commercialId", "periode");

-- AddForeignKey
ALTER TABLE "objectifs_commerciaux" ADD CONSTRAINT "objectifs_commerciaux_commercialId_fkey" FOREIGN KEY ("commercialId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectifs_commerciaux" ADD CONSTRAINT "objectifs_commerciaux_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
