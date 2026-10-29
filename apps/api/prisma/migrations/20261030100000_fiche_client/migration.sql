-- Fiche client : validité de la pièce d'identité et personne à prévenir en cas d'urgence (facultatifs).
ALTER TABLE "proprietaires"
  ADD COLUMN "pieceValiditeLe" DATE,
  ADD COLUMN "urgenceNom" TEXT,
  ADD COLUMN "urgenceLien" TEXT,
  ADD COLUMN "urgenceTelephone" TEXT;

ALTER TABLE "locataires"
  ADD COLUMN "pieceValiditeLe" DATE,
  ADD COLUMN "urgenceNom" TEXT,
  ADD COLUMN "urgenceLien" TEXT,
  ADD COLUMN "urgenceTelephone" TEXT;

ALTER TABLE "prospects"
  ADD COLUMN "pieceValiditeLe" DATE,
  ADD COLUMN "urgenceNom" TEXT,
  ADD COLUMN "urgenceLien" TEXT,
  ADD COLUMN "urgenceTelephone" TEXT;
