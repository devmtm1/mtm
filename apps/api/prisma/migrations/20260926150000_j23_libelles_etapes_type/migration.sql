-- Renomme les étapes posées par le déroulé type, qui portaient le code du
-- référentiel au lieu de son libellé français : la création recopiait
-- « second_oeuvre » tel quel dans le planning.
--
-- Deux précautions.
--
-- Seules les correspondances exactes sont renommées : une étape nommée à la
-- main par un conducteur de travaux garde son libellé, quel qu'il soit.
--
-- Et le renommage est abandonné lorsqu'il créerait un homonyme sur le même
-- chantier — un planning portant déjà « fondations » et « Fondations »
-- garderait sinon deux étapes du même nom, ce que la création refuse
-- désormais. Ces cas restent en code brut : c'est visible, donc corrigeable
-- à la main, alors qu'un doublon silencieux ne l'est pas.
UPDATE "jalons_chantier" AS j
SET "libelle" = correspondance.libelle
FROM (
  VALUES
    ('etudes_et_permis', 'Études et permis'),
    ('terrassement', 'Terrassement'),
    ('fondations', 'Fondations'),
    ('elevation', 'Élévation'),
    ('dalle', 'Dalle'),
    ('toiture', 'Toiture'),
    ('second_oeuvre', 'Second œuvre'),
    ('finitions', 'Finitions'),
    ('reception', 'Réception')
) AS correspondance(code, libelle)
WHERE j."libelle" = correspondance.code
  AND NOT EXISTS (
    SELECT 1
    FROM "jalons_chantier" AS autre
    WHERE autre."projetId" = j."projetId"
      AND autre."id" <> j."id"
      AND lower(autre."libelle") = lower(correspondance.libelle)
  );
