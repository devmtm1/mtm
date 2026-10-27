-- Un propriétaire peut proposer un bien à la gestion depuis le site : le message garde sa nature et les champs saisis.
ALTER TABLE "contacts" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'message';
ALTER TABLE "contacts" ADD COLUMN "details" JSONB;
CREATE INDEX "contacts_type_idx" ON "contacts"("type");
