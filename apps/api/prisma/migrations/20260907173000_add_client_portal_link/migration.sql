-- J1.6 — rattachement sécurisé d’un compte utilisateur à un prospect/client.

ALTER TABLE "users" ADD COLUMN "clientProspectId" TEXT;
CREATE UNIQUE INDEX "users_clientProspectId_key" ON "users"("clientProspectId");
ALTER TABLE "users" ADD CONSTRAINT "users_clientProspectId_fkey"
  FOREIGN KEY ("clientProspectId") REFERENCES "prospects"("id") ON DELETE SET NULL ON UPDATE CASCADE;