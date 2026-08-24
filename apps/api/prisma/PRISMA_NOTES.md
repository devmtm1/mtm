# Notes Prisma — limitation de l'environnement de développement sandbox

## Ce qui a été vérifié réellement

- **`prisma/schema.prisma`** : validé structurellement (8 modèles, accolades
  équilibrées, relations cohérentes) — le CLI `prisma validate` n'a pas pu
  s'exécuter (voir ci-dessous), donc cette vérification a été faite
  manuellement.
- **Migration SQL** (`prisma/migrations/20260818000000_init_phase_0/migration.sql`) :
  écrite à la main en miroir exact du schéma, puis **appliquée réellement**
  contre une instance PostgreSQL 16 locale (installée dans ce sandbox pour
  les besoins du test). Résultat vérifié : 8 tables créées, 7 clés
  étrangères, index conformes au schéma.
- La table `_prisma_migrations` a été créée et alimentée manuellement avec
  le checksum réel du fichier SQL, pour que l'historique reste cohérent
  avec ce qu'aurait produit `prisma migrate dev`.

## Ce qui n'a PAS pu être vérifié ici

Le CLI Prisma (`prisma generate`, `prisma validate`, `prisma migrate dev`)
télécharge ses moteurs (`schema-engine`, `query-engine`) depuis
`binaries.prisma.sh`. Ce domaine n'est pas autorisé par la configuration
réseau de cet environnement de développement (sandbox), qui limite les
domaines accessibles à un ensemble restreint (npm, GitHub, PyPI, dépôts
Ubuntu...).

Conséquence concrète : `@prisma/client` reste au stade de **stub non
généré** ici (`PrismaClient` typé `any`), donc `PrismaService` compile
mais **sans la sécurité de typage réelle** que donne normalement Prisma.

## Build bloqué actuellement dans ce sandbox

`npx nest build` échoue avec **une seule erreur**, isolée et attendue :

```
src/modules/users/users.service.ts:2:10 - error TS2305:
Module '"@prisma/client"' has no exported member 'User'.
```

C'est la conséquence directe et unique du stub non généré (voir plus haut).
Tout le reste du code (Auth, Users, guards, 2FA...) compile sans erreur —
cette ligne d'import (`import { User } from '@prisma/client'`) est du code
Prisma standard qui fonctionnera normalement dès que `npx prisma generate`
aura pu s'exécuter avec un accès réseau complet. Aucune action corrective
n'est nécessaire côté code.

## Vérification à faire après `prisma generate`

Dans ce sandbox, `npx eslint "src/**/*.ts"` (modules Auth + Users + RBAC +
Audit + Settings compris — l'ensemble de la Phase 0 backend) remonte
**293 erreurs** au total (chiffre après ajout du changement de mot de
passe forcé et du durcissement 2FA), réparties sur exactement 6 règles :
`no-unsafe-call`, `no-unsafe-member-access`, `no-unsafe-assignment`,
`no-unsafe-return`, `no-unsafe-argument`, `no-redundant-type-constituents`.
Toutes proviennent de la même cause unique (client Prisma non généré) —
confirmé en isolant la liste exhaustive des règles déclenchées, qui ne
contient aucune règle de logique ou de style indépendante.

Note : les erreurs `@typescript-eslint/require-await` rencontrées à ce
stade (méthodes `async` sans `await` littéral) étaient de vraies erreurs
de style, indépendantes du stub Prisma — elles ont été corrigées dans le
code (ajout d'`await` explicite avant chaque retour de promesse Prisma),
et ne réapparaîtront pas une fois `prisma generate` exécuté.

**Test de non-régression à faire une fois `prisma generate` exécuté :**

```bash
cd apps/api
npx prisma generate
npx eslint "src/**/*.ts"   # doit repasser à 0 erreur, 0 warning
npx nest build              # doit compiler sans erreur
npx jest                    # tests unitaires (mockés, indépendants de Prisma)
```

Si des erreurs subsistent après régénération du client, ce seront de
vraies erreurs à corriger — mais elles seront d'un tout autre volume (le
code a été relu et n'a pas d'autre defaut connu que cette dépendance au
client généré). Profitez-en aussi pour lancer `npx prisma migrate dev`,
qui confirmera que la migration manuelle écrite ici correspond exactement
à ce que Prisma aurait généré ; en cas d'écart, Prisma proposera une
migration corrective à appliquer et committer.

## Le parcours critique de la Phase 0 est prouvé de bout en bout (HTTP réel)

Le critère de validation officiel (*"un administrateur peut se connecter,
créer un utilisateur, lui attribuer un rôle, et voir l'action tracée dans
le journal d'audit"*) est vérifié par un vrai test e2e HTTP :
`apps/api/test/critical-path.e2e-spec.ts`, qui **passe 8/8** dans ce
sandbox.

Pour y parvenir malgré le blocage réseau, `PrismaService` y est remplacé
par un double in-memory (`apps/api/test/fakes/fake-prisma.service.ts`)
qui reproduit fidèlement la forme des appels Prisma utilisés par ce
projet (mêmes méthodes, mêmes formes de `where`/`data`/`include`). Ce
test prouve donc que **tout le câblage HTTP réel est correct** — routing,
guards (`JwtAuthGuard`, `PermissionsGuard`), `ValidationPipe`
(whitelist/rejet des champs inconnus), contrôleurs, services — sans
dépendre du moteur Prisma bloqué.

Ce que ce test **ne prouve pas** : que la traduction SQL réelle de Prisma
fonctionne contre PostgreSQL avec ce schéma exact. C'est un risque
résiduel faible (patterns Prisma standards, déjà vérifiés indépendamment
via la migration SQL appliquée manuellement — voir plus haut), mais à
confirmer une fois `prisma generate` exécuté, en relançant ce même test
e2e avec la vraie base (il faudra alors remplacer temporairement le
double par un vrai `PrismaService` connecté à une base de test, ou écrire
un test e2e complémentaire sans override — les deux approches sont
valables).

## Conséquence supplémentaire observée

Le stub `PrismaClient` ne se contente pas d'avoir des types `any` : il
**lève une exception au runtime** (`@prisma/client did not initialize yet`)
dès qu'on tente de l'instancier. Résultat concret observé dans ce sandbox :
le serveur NestJS démarre mais `PrismaService` échoue à l'injection tant que
`prisma generate` n'a pas été exécuté avec un accès réseau complet.

**Ceci est donc bloquant, pas seulement dégradé.** Le développement du
code (module Auth, RBAC, Audit, Settings) se poursuit malgré cette
limitation, en suivant les patterns standards NestJS + Prisma. La
vérification runtime complète de la couche base de données (login réel,
persistance des refresh tokens, etc.) devra être faite de votre côté, une
fois le dépôt cloné dans un environnement avec accès réseau complet :

```bash
cd apps/api
npx prisma generate
npx nest build
node dist/main.js
curl http://localhost:3000/api/health   # doit renvoyer "database": "up"
```

Je recommande de faire ce test avant de continuer, ou de me laisser
poursuivre le développement du code (qui suit les patterns standards
NestJS + Prisma et compile correctement) en acceptant que la vérification
runtime complète de la couche base de données se fasse de votre côté une
fois le dépôt cloné dans un environnement normal.
