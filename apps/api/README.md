# API MTM Immobilier (NestJS)

Backend unique du site public, du back-office et des futures applications
mobiles. Le contexte général, les environnements et le déploiement sont dans le
[README racine](../../README.md).

## Démarrage

```bash
cp ../../.env.example ../../.env      # puis renseigner les secrets
npm install                           # à la racine du monorepo
npx prisma migrate deploy             # applique les migrations
npx prisma db seed                    # rôles, permissions, paramètres, compte admin
npm run start:dev                     # http://localhost:3000/api
```

Le seed exige `SEED_ADMIN_PASSWORD` (12 caractères minimum) tant que le compte
administrateur n'existe pas. Il est idempotent : le relancer ajoute ce qui
manque sans rien écraser.

Swagger est disponible sur `/api/docs` hors production uniquement.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run build` | génère le client Prisma et compile |
| `npm run test` | tests unitaires (Jest) |
| `npm run test:e2e` | parcours de bout en bout sur une vraie base PostgreSQL (voir README racine) |
| `npm run lint` | ESLint |
| `npx prisma migrate dev --name <nom>` | crée une migration (jamais `db push`) |
| `npm run documents:purge` | purge de rétention des documents (désactivée par défaut) |
| `npm run audit:purge` | purge de rétention du journal d'audit |

## Règles à respecter en ajoutant du code

**Accès aux routes.** Toute route déclare qui peut l'appeler, et le garde
refuse celles qui ne le font pas :

- `@RequirePermissions('module:action')` : permission requise ;
- `@Public()` : sans authentification (formulaires et catalogue publics) ;
- `@Authenticated()` : tout utilisateur connecté, sans permission (portails
  client, propriétaire, locataire ; profil ; double authentification).

Le test `src/modules/auth/route-access.spec.ts` liste les routes muettes et
échoue tant qu'il en reste.

**Booléens reçus en texte.** Les formulaires multipart et les query strings
envoient `"false"`. L'API active `enableImplicitConversion`, qui transformerait
ce texte en `true`. Tout champ `@IsBoolean()` qui peut arriver ainsi porte
`@Transform(versBooleen)` (`src/common/utils/booleen.transform.ts`).

**Données internes.** Prix d'acquisition, marge et commission ne sortent jamais
vers le site public : le catalogue passe par la projection `publicTerrainSelect`.
Le journal d'audit enregistre les vraies valeurs, jamais la vue masquée d'un
utilisateur.

**Alertes planifiées.** Une tâche horaire ne doit tracer qu'une fois par jour
au plus la même alerte (voir `CronService.dejaSignaleAujourdhui`).

**Paramètres métier.** Taux, délais, statuts, modes de paiement : dans
`SystemSetting`, lus par `SettingsService`, jamais en dur. Exemple :
`paiements.validationParUnAutre` (contrôle à deux personnes sur la validation
des paiements, désactivé par défaut).
