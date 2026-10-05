-- Trois reprises de données, découvertes en relisant le journal d'audit.

-- 1. Marge déduite d'un prix d'acquisition masqué.
--
-- Un commercial sans accès financier recevait la fiche avec ses montants à
-- `null` ; son formulaire les réexpédiait, et l'ancien calcul posait
-- marge = prixPublic - null, soit le prix public entier. Une parcelle acquise
-- gratuitement, ce qui gonfle d'autant la marge au reporting.
--
-- On ne restaure que les cas qui portent exactement cette signature : marge
-- égale au prix public alors qu'aucun prix d'acquisition n'est connu. La
-- marge repasse à « non renseignée », son état avant l'écrasement — inventer
-- un prix d'acquisition serait pire que l'absence.
UPDATE "terrains"
SET "marge" = NULL
WHERE "prixAcquisition" IS NULL
  AND "marge" IS NOT NULL
  AND "prixPublic" IS NOT NULL
  AND "marge" = "prixPublic";

-- 2. « habitation » et « residentiel » désignaient le même usage.
--
-- MTM retient « residentiel ». Les fiches classées « habitation » le
-- rejoignent, sans quoi une recherche résidentielle en manquerait la moitié.
UPDATE "terrains" SET "vocation" = 'residentiel' WHERE "vocation" = 'habitation';

-- 3. La villa F2 porte sa typologie.
--
-- Elle s'appelle « villa F2 » mais le champ était vide : elle ne remontait
-- donc sur aucune recherche par typologie. La valeur est déduite de son
-- propre nom, rien d'autre. La surface habitable reste vide : personne ici
-- ne la connaît, et un chiffre inventé s'afficherait devant des acheteurs.
UPDATE "terrains"
SET "nombrePieces" = 'F2'
WHERE "typeBien" <> 'terrain'
  AND "nombrePieces" IS NULL
  AND "nom" ILIKE '%F2%';
