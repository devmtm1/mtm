-- Page « Notre équipe » du site public : mot du directeur, photo de groupe, membres.
CREATE TABLE "team_members" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "poste" TEXT,
  "message" TEXT,
  "storageKey" TEXT,
  "resourceType" TEXT NOT NULL DEFAULT 'image',
  "ordre" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "team_members_kind_idx" ON "team_members"("kind");
CREATE INDEX "team_members_isActive_idx" ON "team_members"("isActive");
CREATE INDEX "team_members_ordre_idx" ON "team_members"("ordre");

-- Contenu de départ, à remplacer depuis le back-office (Contenu → Équipe) :
-- noms génériques et aucune photo (le site affiche les initiales).
INSERT INTO "team_members" ("id", "kind", "nom", "poste", "message", "ordre", "updatedAt") VALUES
  (gen_random_uuid()::text, 'directeur', 'Prénom NOM', 'Directeur général',
   E'Chez MTM Immobilier, nous croyons qu''un achat immobilier se construit sur la confiance.\n\nChaque bien que nous proposons est vérifié, chaque étape est expliquée, et nos clients — où qu''ils vivent — savent à tout moment où en est leur dossier.\n\nNotre équipe est à votre écoute pour vous accompagner, de la recherche du terrain jusqu''à la remise des clés.', 0, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'groupe', 'L''équipe MTM Immobilier', NULL, NULL, 0, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'membre', 'Prénom NOM', 'Responsable commercial', NULL, 1, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'membre', 'Prénom NOM', 'Conseiller commercial', NULL, 2, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'membre', 'Prénom NOM', 'Gestion locative', NULL, 3, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'membre', 'Prénom NOM', 'Démarches administratives', NULL, 4, CURRENT_TIMESTAMP);
