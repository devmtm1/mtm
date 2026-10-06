# CI — GitHub Actions

`.github/workflows/ci.yml` s'exécute sur chaque push/PR vers `main` et
`develop`, avec trois jobs indépendants et parallèles (API, back-office, site public).

## Job `api`

1. Installation des dépendances (`npm ci`, monorepo complet)
2. `npx prisma generate` — génère le client Prisma typé
3. `npx prisma migrate deploy` — applique les migrations contre un vrai
   PostgreSQL 16 (service container GitHub Actions)
4. Lint (`eslint`)
5. Build (vérifie aussi le typage TypeScript)
6. Tests unitaires (`npm run test`)
7. Tests e2e du parcours critique (`npm run test:e2e`)

## Job `backoffice`

1. Installation des dépendances
2. Lint (`ng lint`)
3. Build (`ng build`)
4. Tests unitaires (`ng test`, environnement jsdom — pas besoin de
   Chrome headless)

## Job `public-web`

1. Installation des dépendances
2. Lint (`eslint`)
3. Build (`npm run build`, vérifie aussi les types)
4. Tests unitaires (`vitest run`)

## Tests e2e : base et encodage

Les e2e tournent sur PostgreSQL 16 (service du job). En local, sans
`E2E_DATABASE_URL`, un PostgreSQL embarqué est démarré en **UTF-8** : sans cet
encodage imposé, initdb choisit WIN1252 sous Windows et refuse certains
caractères du français.

## Validation effectuée

- Parsing YAML générique (Python `pyyaml`)
- **Validation du schéma officiel GitHub Actions** via
  `@action-validator/cli` (JSON Schema officiel) — 0 erreur
- Job `backoffice` : chaque étape (`ng lint`, `ng build`, `ng test`)
  testée intégralement en local avant d'être ajoutée au workflow

## Ce qui reste à confirmer sur un vrai runner

Ce sandbox de développement a un accès réseau restreint (voir
`apps/api/prisma/PRISMA_NOTES.md`), ce qui empêche de tester
`prisma generate`/`prisma migrate deploy` ici. Sur un runner GitHub
Actions réel, l'accès réseau est complet, donc ces étapes devraient
fonctionner normalement — mais cela doit être confirmé au premier push.
Si `prisma generate` échoue sur le runner pour une raison quelconque,
vérifier d'abord la connectivité sortante du runner vers
`binaries.prisma.sh`.
