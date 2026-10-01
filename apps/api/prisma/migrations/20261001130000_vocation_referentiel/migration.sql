-- La vocation d'un terrain devient un référentiel contrôlé.
--
-- C'était un champ libre : « Residentiel » et « residentiel » cohabitaient en
-- base, et le filtre public — qui dérive ses options des biens publiés — les
-- proposait comme deux critères distincts. Choisir l'un ne ramenait alors
-- qu'une partie des terrains concernés.
--
-- On normalise la casse et les accents sur les valeurs du référentiel. Toute
-- valeur hors liste est laissée telle quelle : elle reste lisible sur la
-- fiche, et MTM décidera de la rattacher ou d'étendre la liste depuis les
-- Paramètres plutôt que de la voir disparaître ici.

UPDATE "terrains" SET "vocation" = 'habitation'
 WHERE lower(trim("vocation")) IN ('habitation', 'habitations');

UPDATE "terrains" SET "vocation" = 'residentiel'
 WHERE lower(trim("vocation")) IN ('residentiel', 'résidentiel', 'residence', 'résidence');

UPDATE "terrains" SET "vocation" = 'commercial'
 WHERE lower(trim("vocation")) IN ('commercial', 'commerce');

UPDATE "terrains" SET "vocation" = 'agricole'
 WHERE lower(trim("vocation")) IN ('agricole', 'agriculture');

UPDATE "terrains" SET "vocation" = 'touristique'
 WHERE lower(trim("vocation")) IN ('touristique', 'tourisme');

UPDATE "terrains" SET "vocation" = 'industriel'
 WHERE lower(trim("vocation")) IN ('industriel', 'industrie');

UPDATE "terrains" SET "vocation" = 'mixte'
 WHERE lower(trim("vocation")) = 'mixte';

UPDATE "terrains" SET "vocation" = 'autre'
 WHERE lower(trim("vocation")) = 'autre';

-- Une chaîne vide n'est pas une vocation : elle alimenterait une option vide
-- dans le filtre public.
UPDATE "terrains" SET "vocation" = NULL WHERE trim(coalesce("vocation", '')) = '';
