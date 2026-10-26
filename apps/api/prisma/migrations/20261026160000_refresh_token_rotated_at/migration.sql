-- Rotation tolérante : un token de renouvellement tout juste remplacé reste accepté quelques secondes.
ALTER TABLE "refresh_tokens" ADD COLUMN "rotatedAt" TIMESTAMP(3);
