-- Un seul vocabulaire de pièces d'identité : « cni » devient « cni_cedeao », comme sur les fiches prospects.
UPDATE "proprietaires" SET "typePiece" = 'cni_cedeao' WHERE "typePiece" = 'cni';
UPDATE "locataires" SET "typePiece" = 'cni_cedeao' WHERE "typePiece" = 'cni';

-- État civil des propriétaires et des locataires (facultatif).
ALTER TABLE "proprietaires"
  ADD COLUMN "adresse" TEXT,
  ADD COLUMN "dateNaissance" DATE,
  ADD COLUMN "lieuNaissance" TEXT,
  ADD COLUMN "nationalite" TEXT,
  ADD COLUMN "profession" TEXT;

ALTER TABLE "locataires"
  ADD COLUMN "adresse" TEXT,
  ADD COLUMN "dateNaissance" DATE,
  ADD COLUMN "lieuNaissance" TEXT,
  ADD COLUMN "nationalite" TEXT,
  ADD COLUMN "profession" TEXT;

-- Prospects : adresse, nationalité et parcours (acheteur par défaut : rien ne change pour l'existant).
ALTER TABLE "prospects"
  ADD COLUMN "adresse" TEXT,
  ADD COLUMN "nationalite" TEXT,
  ADD COLUMN "parcours" TEXT NOT NULL DEFAULT 'acheteur';
CREATE INDEX "prospects_parcours_idx" ON "prospects"("parcours");

-- Un client qui n'a ni dossier de vente ni visite, mais une mission de vérification ou un chantier, n'est pas un acheteur.
UPDATE "prospects" p SET "parcours" = 'verification'
WHERE EXISTS (SELECT 1 FROM "missions_verification" m WHERE m."prospectId" = p."id")
  AND NOT EXISTS (SELECT 1 FROM "dossiers_vente" d WHERE d."prospectId" = p."id")
  AND NOT EXISTS (SELECT 1 FROM "visites_prospect" v WHERE v."prospectId" = p."id");

UPDATE "prospects" p SET "parcours" = 'chantier'
WHERE p."parcours" = 'acheteur'
  AND EXISTS (SELECT 1 FROM "projets_construction" c WHERE c."clientId" = p."id")
  AND NOT EXISTS (SELECT 1 FROM "dossiers_vente" d WHERE d."prospectId" = p."id")
  AND NOT EXISTS (SELECT 1 FROM "visites_prospect" v WHERE v."prospectId" = p."id");
