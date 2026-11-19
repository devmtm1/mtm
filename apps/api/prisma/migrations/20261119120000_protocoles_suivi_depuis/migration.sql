-- Début du suivi des signatures : les dossiers ouverts avant la mise en service n'entrent pas dans l'alerte
-- « paiement reçu – signature manquante » (voir docs/PROTOCOLES.md). Fixé au jour de la mise en service ;
-- modifiable dans Paramètres. N'écrase jamais une valeur déjà réglée.
INSERT INTO "system_settings" ("id", "key", "value", "description", "isSensitive", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'protocoles.suiviDepuis',
  to_jsonb(to_char(CURRENT_DATE, 'YYYY-MM-DD')),
  'Date (AAAA-MM-JJ) à partir de laquelle les dossiers sont suivis pour les signatures',
  false,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
