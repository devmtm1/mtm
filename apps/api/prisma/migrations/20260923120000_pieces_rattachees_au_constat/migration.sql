-- AlterTable
ALTER TABLE "documents_mission" ADD COLUMN     "etapeId" TEXT;

-- CreateIndex
CREATE INDEX "documents_mission_etapeId_idx" ON "documents_mission"("etapeId");

-- AddForeignKey
ALTER TABLE "documents_mission" ADD CONSTRAINT "documents_mission_etapeId_fkey" FOREIGN KEY ("etapeId") REFERENCES "etapes_mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

