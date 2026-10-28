# MTM Immobilier — consignes pour Claude

Plateforme numérique de MTM Immobilier : vente de terrains et de villas, gestion
locative (au mois et à la nuit), vérifications foncières, chantiers, finances.
Clientèle prioritaire : la diaspora sénégalaise, donc des clients à distance.
Langue : français uniquement (interface, libellés, documentation, messages de
commit).

Références à lire avant tout travail important :

- `MTM_Immobilier_Cahier_des_Charges.pdf` (CDC) : le besoin, section par section ;
- `planing_execution.md` : phases et jalons (J0.1 → J4.2) ;
- `.github/copilot-instructions.md` : règles d'architecture, de code et de design ;
- `README.md` : environnements, déploiement, règles de branches ;
- `docs/` : un document par module (finances, pilotage, agenda, location courte
  durée…), audits, procès-verbal de recette (`docs/recette/PV-RECETTE.md`) ;
- `docs/manuel/` : guide d'utilisation de l'équipe (à tenir à jour).

## Monorepo

| Dossier | Rôle | Pile |
| --- | --- | --- |
| `apps/api` | API unique (site, back-office, futur mobile) | NestJS, Prisma, PostgreSQL (Neon) |
| `apps/backoffice` | ERP interne | Angular, Angular Material/CDK, AG Grid, Lucide, ECharts |
| `apps/public-web` | Site public et espace client | React, Vite, Tailwind, Leaflet |

## Branches et pull requests

- **Ne jamais pousser sur `main` ni ouvrir de pull request vers `main`.**
  `main` est la production : elle ne reçoit que la fusion de `develop`, faite par
  MTM.
- Toute pull request vise **`develop`** (environnement de test sur Render).
- Ne pas utiliser Netlify : le projet est hébergé sur Render et Cloudflare Pages.

## Méthode

1. Analyser l'existant et réutiliser : authentification, rôles et permissions,
   audit, paramètres, notifications, GED existent déjà — ne jamais les recréer.
2. Changements petits et vérifiables ; pas de refonte d'architecture sans
   justification ; pas de DDD.
3. Aucune nouvelle dépendance sans vérifier qu'une bibliothèque déjà installée
   ne suffit pas.
4. Une évolution hors planning doit être validée par MTM (CDC §33) : la
   signaler, et l'ajouter au PV de recette quand elle est livrée.
5. Mettre à jour la documentation concernée (`docs/`, `docs/manuel/` puis
   `npm run manuel`).

## Vérifications avant de considérer une tâche terminée

- API : `npm run lint`, `npm run build`, `npm run test`, et `npm run test:e2e`
  si le parcours métier change (dans `apps/api`).
- Back-office : `npm run lint`, `npm run build`, `npm test -- --watch=false`
  (dans `apps/backoffice`).
- Site public : `npx tsc -b`, `npm run lint`, `npm run test`
  (dans `apps/public-web`).
- `npm run check:csp` (racine) dès qu'une ressource externe est ajoutée.
- Pour une interface : regarder le rendu réel, sur ordinateur et sur téléphone.

## Règles de l'API

- Chaque route déclare son accès : `@RequirePermissions('module:action')`,
  `@Public()` ou `@Authenticated()` ; sinon elle est refusée
  (`route-access.spec.ts`).
- Booléens reçus en texte (multipart, query) : `@Transform(versBooleen)`.
- Données internes (prix d'acquisition, marge, commission, notes) : jamais vers
  le site public (projection `publicTerrainSelect`).
- Paramètres métier (taux, délais, statuts, tarifs) : dans `SystemSetting` via
  `SettingsService`, jamais en dur.
- Schéma : toujours une migration Prisma (`prisma migrate dev --name …`),
  jamais `db push` ; le seed reste idempotent.
- Opérations sensibles : tracées au journal d'audit ; validation par une autre
  personne que l'auteur (paiements, commissions, saisies financières) ; export
  avec motif obligatoire.
- Alerte planifiée : une seule trace par jour au plus
  (`CronService.dejaSignaleAujourdhui`).

## Design (back-office et site public)

- Couleurs du logo uniquement, via les tokens `--mtm-*` (back-office) et la
  palette Tailwind `mtm-*` (site public) : bleu marine `#1A4974` (principal),
  rouge carmin `#B52C36` (accent, actions sensibles, erreurs), bleu clair
  `#5EA8C7` (information). Aucune couleur codée en dur.
- Aplats uniquement : pas de dégradé, pas de grosses ombres, pas d'animation
  inutile ; style sobre, corporate, pas « landing page ».
- Icônes : Lucide exclusivement. Polices : Plus Jakarta Sans (texte), Outfit
  (titres).
- Libellés en français, jamais de code technique à l'écran (catalogues de
  libellés, pipe `mtmLabel` au back-office).
- Les boutons de la fiche publique d'un bien suivent le CDC §7 : « Demander une
  visite », « Demander des informations », « Réserver ».

## Données et sécurité

- Aucun secret dans le dépôt (`.env` non versionnés, voir `.env.example`).
- Aucune donnée réelle (clients, montants, pièces) dans le dépôt, les tests ou
  les captures : le dossier `test reel/` reste hors de git.
- Jamais d'essai sur la base de production.
