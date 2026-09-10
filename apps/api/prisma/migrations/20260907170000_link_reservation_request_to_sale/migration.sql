-- J1.6 — rattachement d’une demande publique à son dossier de vente.

ALTER TABLE "dossiers_vente" ADD COLUMN "reservationRequestId" TEXT;
CREATE UNIQUE INDEX "dossiers_vente_reservationRequestId_key" ON "dossiers_vente"("reservationRequestId");
ALTER TABLE "dossiers_vente" ADD CONSTRAINT "dossiers_vente_reservationRequestId_fkey"
  FOREIGN KEY ("reservationRequestId") REFERENCES "reservation_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;