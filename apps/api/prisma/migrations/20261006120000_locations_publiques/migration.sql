-- AlterTable
ALTER TABLE "biens_locatifs" ADD COLUMN     "charges" DECIMAL(15,2),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "disponibleLe" TIMESTAMP(3),
ADD COLUMN     "equipements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "longitude" DECIMAL(9,6),
ADD COLUMN     "loyerMensuel" DECIMAL(15,2),
ADD COLUMN     "meuble" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "misEnAvant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moisCaution" INTEGER,
ADD COLUMN     "nombreChambres" INTEGER,
ADD COLUMN     "nombrePieces" INTEGER,
ADD COLUMN     "nombreSallesEau" INTEGER,
ADD COLUMN     "publie" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publieLe" TIMESTAMP(3),
ADD COLUMN     "titre" TEXT;

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "bienLocatifId" TEXT;

-- CreateTable
CREATE TABLE "biens_locatifs_medias" (
    "id" TEXT NOT NULL,
    "bienLocatifId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'photo',
    "storageKey" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'image',
    "title" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biens_locatifs_medias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "biens_locatifs_medias_bienLocatifId_sortOrder_idx" ON "biens_locatifs_medias"("bienLocatifId", "sortOrder");

-- CreateIndex
CREATE INDEX "biens_locatifs_publie_statut_idx" ON "biens_locatifs"("publie", "statut");

-- CreateIndex
CREATE INDEX "contacts_bienLocatifId_idx" ON "contacts"("bienLocatifId");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_bienLocatifId_fkey" FOREIGN KEY ("bienLocatifId") REFERENCES "biens_locatifs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biens_locatifs_medias" ADD CONSTRAINT "biens_locatifs_medias_bienLocatifId_fkey" FOREIGN KEY ("bienLocatifId") REFERENCES "biens_locatifs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
