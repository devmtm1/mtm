-- J1.6 — demande publique de réservation, en attente de validation interne.

CREATE TABLE "reservation_requests" (
  "id" TEXT NOT NULL,
  "terrainId" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "telephone" TEXT,
  "message" TEXT,
  "statut" TEXT NOT NULL DEFAULT 'nouvelle',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reservation_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reservation_requests_terrainId_idx" ON "reservation_requests"("terrainId");
CREATE INDEX "reservation_requests_statut_idx" ON "reservation_requests"("statut");
CREATE INDEX "reservation_requests_createdAt_idx" ON "reservation_requests"("createdAt");

ALTER TABLE "reservation_requests" ADD CONSTRAINT "reservation_requests_terrainId_fkey"
  FOREIGN KEY ("terrainId") REFERENCES "terrains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;