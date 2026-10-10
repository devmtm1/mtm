-- Le contenu de départ de la page « Notre équipe » (noms « Prénom NOM », légende
-- générique sans photo) ne doit pas être visible des visiteurs tant que MTM ne l'a
-- pas remplacé. Seules les fiches encore au contenu par défaut sont dépubliées :
-- tout ce qui a été modifié depuis le back-office reste publié.
UPDATE "team_members"
SET "isActive" = false
WHERE "nom" = 'Prénom NOM'
   OR ("kind" = 'groupe' AND "storageKey" IS NULL AND "nom" = 'L''équipe MTM Immobilier');
