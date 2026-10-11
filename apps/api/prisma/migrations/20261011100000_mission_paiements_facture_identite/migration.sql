-- Identité du client (facture, rapport de mission)
ALTER TABLE "prospects"
  ADD COLUMN "dateNaissance" DATE,
  ADD COLUMN "lieuNaissance" TEXT,
  ADD COLUMN "typePieceIdentite" TEXT,
  ADD COLUMN "numeroPieceIdentite" TEXT;

-- Facture de mission
ALTER TABLE "missions_verification"
  ADD COLUMN "factureReference" TEXT,
  ADD COLUMN "factureEmiseLe" TIMESTAMP(3);
CREATE UNIQUE INDEX "missions_verification_factureReference_key" ON "missions_verification"("factureReference");

-- Personnes présentes à la visite
ALTER TABLE "etapes_mission" ADD COLUMN "personnesPresentes" TEXT;

-- Règlements d'une mission
CREATE TABLE "paiements_mission" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "datePaiement" TIMESTAMP(3) NOT NULL,
    "montantEnvoye" DECIMAL(15,2) NOT NULL,
    "frais" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "montantNet" DECIMAL(15,2) NOT NULL,
    "mode" TEXT NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paiements_mission_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "paiements_mission_missionId_datePaiement_idx" ON "paiements_mission"("missionId", "datePaiement");
ALTER TABLE "paiements_mission" ADD CONSTRAINT "paiements_mission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions_verification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "paiements_mission" ADD CONSTRAINT "paiements_mission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Les missions déjà réglées gardent leur historique : un règlement unique reprend
-- l'ancien montant, pour que le solde et la facture restent cohérents.
INSERT INTO "paiements_mission" ("id", "missionId", "datePaiement", "montantEnvoye", "frais", "montantNet", "mode", "reference", "note", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "updatedAt", "montantPaye", 0, "montantPaye",
       COALESCE(NULLIF("modePaiement", ''), 'autre'), "referencePaiement",
       'Repris de l''ancienne saisie à paiement unique', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "missions_verification"
WHERE "montantPaye" IS NOT NULL AND "montantPaye" > 0;
