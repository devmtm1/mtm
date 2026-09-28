-- Numéros de contact réels de MTM, et numéro dédié aux démarches administratives.
--
-- Le seed ne remplace jamais un bloc de contenu déjà présent (`update: {}`) :
-- sans cette migration, les bases déjà installées resteraient sur les numéros
-- de démonstration. On ne corrige que les valeurs de démonstration exactes,
-- afin de ne jamais écraser un numéro saisi depuis le back-office.

UPDATE "content_blocks"
SET "content" = '+221 78 366 26 51',
    "updatedAt" = NOW()
WHERE "key" = 'contact.telephone'
  AND "content" = '+221 77 000 00 00';

UPDATE "content_blocks"
SET "content" = '221783662651',
    "updatedAt" = NOW()
WHERE "key" = 'contact.whatsapp'
  AND "content" = '221770000000';

-- Les démarches administratives sont suivies par la direction, sur son propre
-- numéro. Bloc créé seulement s'il n'existe pas : une base déjà à jour ou
-- personnalisée n'est pas touchée.
INSERT INTO "content_blocks" ("id", "key", "title", "content", "type", "ordre", "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'contact.whatsapp.demarches',
  'Numéro WhatsApp — démarches administratives (format international, sans +)',
  '221771551810',
  'text',
  44,
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("key") DO NOTHING;
