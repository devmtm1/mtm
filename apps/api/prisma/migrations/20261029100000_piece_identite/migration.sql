-- Pièce d'identité facultative des propriétaires et des locataires : type, numéro et copie PDF.
ALTER TABLE "proprietaires"
  ADD COLUMN "typePiece" TEXT,
  ADD COLUMN "numeroPiece" TEXT,
  ADD COLUMN "pieceStorageKey" TEXT,
  ADD COLUMN "pieceResourceType" TEXT;

ALTER TABLE "locataires"
  ADD COLUMN "typePiece" TEXT,
  ADD COLUMN "numeroPiece" TEXT,
  ADD COLUMN "pieceStorageKey" TEXT,
  ADD COLUMN "pieceResourceType" TEXT;
