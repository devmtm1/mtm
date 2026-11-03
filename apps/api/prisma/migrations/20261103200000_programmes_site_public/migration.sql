-- Programmes : visuels pour le site public (couverture, galerie, plan de masse) et interrupteur de publication.
ALTER TABLE "programmes_lotissement" ADD COLUMN "publie" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "programme_medias" (
  "id" TEXT NOT NULL,
  "programmeId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT,
  "storageKey" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL DEFAULT 'image',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "programme_medias_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "programme_medias_programmeId_sortOrder_idx" ON "programme_medias"("programmeId", "sortOrder");
ALTER TABLE "programme_medias" ADD CONSTRAINT "programme_medias_programmeId_fkey"
  FOREIGN KEY ("programmeId") REFERENCES "programmes_lotissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
