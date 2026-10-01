-- Terminologie : le catalogue ne vend plus seulement du foncier.
--
-- Les textes du site vivent en base et le seed ne remplace jamais un bloc
-- existant : sans cette migration, l'accueil continuerait d'annoncer
-- « Découvrir nos terrains » alors que des villas sont en vente.
--
-- Chaque mise à jour est conditionnée au texte d'origine exact : un bloc que
-- MTM aurait réécrit depuis le back-office n'est pas touché.

UPDATE "content_blocks"
SET "content" = 'Terrains et villas vérifiés, accompagnement transparent et solutions concrètes pour investir, construire et transmettre au Sénégal.',
    "updatedAt" = NOW()
WHERE "key" = 'home.hero.subtitle'
  AND "content" = 'Terrains vérifiés, accompagnement transparent et solutions concrètes pour investir, construire et transmettre au Sénégal.';

UPDATE "content_blocks"
SET "content" = 'Découvrir nos biens',
    "updatedAt" = NOW()
WHERE "key" = 'home.cta.title'
  AND "content" = 'Découvrir nos terrains';

UPDATE "content_blocks"
SET "content" = 'Vous envisagez d’acheter un terrain ou une villa, notamment depuis l’étranger ? Notre équipe se déplace pour vérifier le bien avant votre engagement. Tarif communiqué sur devis selon la nature du dossier.',
    "updatedAt" = NOW()
WHERE "key" = 'demarches.intro'
  AND "content" = 'Vous envisagez d’acheter un terrain, notamment depuis l’étranger ? Notre équipe se déplace pour vérifier le bien avant votre engagement. Tarif communiqué sur devis selon la nature du dossier.';

-- Ces deux blocs sont des listes « Titre | Description », une par ligne : on
-- ne reprend que la ligne concernée, pour ne pas écraser une ligne ajoutée
-- entre-temps depuis le back-office.
UPDATE "content_blocks"
SET "content" = replace(
      "content",
      'Vérification avant achat | Contrôle du terrain et de sa situation administrative avant votre engagement.',
      'Vérification avant achat | Contrôle du bien et de sa situation administrative avant votre engagement.'
    ),
    "updatedAt" = NOW()
WHERE "key" = 'demarches.prestations'
  AND "content" LIKE '%Contrôle du terrain et de sa situation administrative%';

UPDATE "content_blocks"
SET "content" = replace(
      "content",
      'Demande | Vous nous transmettez le terrain concerné et vos pièces disponibles.',
      'Demande | Vous nous transmettez le bien concerné et vos pièces disponibles.'
    ),
    "updatedAt" = NOW()
WHERE "key" = 'demarches.etapes'
  AND "content" LIKE '%Vous nous transmettez le terrain concerné%';

-- Volontairement épargnés : les deux témoignages clients, qui rapportent de
-- vrais achats de terrain et que personne n'a le droit de réécrire, et
-- l'article « Étapes essentielles avant d'acheter un terrain », qui traite
-- bien du foncier. « Analyse de votre terrain » sur la page Construction
-- reste juste : on construit sur un terrain.
