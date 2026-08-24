-- Ajoute le champ de forçage du changement de mot de passe.
-- Écrit manuellement pour la même raison que la migration initiale
-- (voir apps/api/prisma/PRISMA_NOTES.md) : à confirmer via
-- `npx prisma migrate dev` dans un environnement avec accès réseau
-- complet, qui régénérera cette migration si un écart est détecté.

ALTER TABLE "users" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
