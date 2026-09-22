# MTM Immobilier — Plateforme numérique intégrée

Monorepo du projet MTM Immobilier : backend API (NestJS), back-office
(Angular) et futur site public.

> **État actuel : Phase 1 — Cœur commercial finalisé et audité** (Jalons J1.1 à J1.6 du
> planning d'exécution). Le socle technique Phase 0 est terminé. Les modules
> terrains, site public, cartographie, mandats, CRM et ventes/réservations/paiements/commissions/GED
> sont implémentés. Voir `docs/PHASE_0.md` pour le rapport de clôture de la Phase 0.

## Structure du monorepo

```
apps/
├── api/              # Backend NestJS + Prisma + PostgreSQL
├── backoffice/        # Interface interne Angular
└── public-web/        # Site public — React + Vite (accueil, catalogue, fiche terrain, réalisations, contact...)
```

## Stack technique

- **Backend** : NestJS, TypeScript, PostgreSQL, Prisma ORM, REST, Swagger, Jest
- **Frontend back-office (ERP)** : voir détail ci-dessous
- **Infra** : Docker / Docker Compose, GitHub Actions

### Frontend back-office — outils imposés

| Outil | Usage dans MTM |
|---|---|
| Angular | Application ERP / back-office |
| Angular Material | Composants UI principaux de l'ERP |
| Angular CDK | Primitives avancées : drag & drop, overlay, accessibility, etc. |
| AG Grid | Tableaux de données complexes de l'ERP |
| Lucide Angular | Icônes de l'ERP |
| Apache ECharts | Graphiques, statistiques et dashboards |
| ngx-echarts | Intégration ECharts dans Angular |

Ces choix sont imposés et ne doivent pas être substitués par d'autres
bibliothèques équivalentes (ex: pas de PrimeNG, pas de Chart.js, pas de
Font Awesome à la place de Lucide) sans validation explicite.

## Prérequis

- Node.js ≥ 20
- npm ≥ 10
- Docker & Docker Compose

## Démarrage rapide (développement)

```bash
# 1. Copier le fichier d'environnement
cp .env.example .env

# 2. Démarrer les services (PostgreSQL, API, back-office)
npm run docker:up

# 3. Installer les dépendances (si travail hors Docker pour l'API/back-office)
npm install

# 4. Appliquer les migrations et le seed
npm run api:build   # puis voir apps/api/README.md pour les commandes Prisma
```

Voir `apps/api/README.md` et `apps/backoffice/README.md` pour le détail de
chaque application, `docs/DOCKER.md` pour l'usage détaillé de Docker, et
`docs/FRONTEND_STACK.md` pour les bibliothèques imposées du back-office,
et `docs/CI.md` pour le détail du pipeline d'intégration continue, et
`docs/BACKUP.md` pour les sauvegardes et la procédure de restauration.

## Environnements

Trois environnements, conformément à la section 27 du cahier des charges :
**développement** (poste local), **test** et **production**. Chacun a ses
propres variables d'environnement (jamais commitées — voir `.env.example`).

Les deux environnements hébergés sont pilotés par la branche Git : rien à
déclencher à la main, un `git push` suffit.

| | Test | Production |
| --- | --- | --- |
| Branche | `develop` | `main` |
| API | `https://mtm-2-v2wo.onrender.com` (Render, Oregon) | `https://mtm-api-zm5i.onrender.com` (Render, Frankfurt) |
| Back-office | `https://mtm-4.onrender.com` | `https://mtm-backoffice.pages.dev` (Cloudflare Pages) |
| Site public | `https://mtm-public-web.onrender.com` | `https://mtm-public-web.pages.dev` (Cloudflare Pages) |
| Base (Neon) | projet `mtm`, us-east-2, données d'essai | projet `mtm-production`, eu-central-1 |
| Images (Cloudinary) | dossier `mtm-staging/` | dossier `mtm-prod/` |
| E-mails | Brevo, port 2525 | Brevo, port 2525 |
| Variable `APP_ENV` | `staging` | `production` |

Deux réglages non évidents, appris en production : Render **filtre la sortie
SMTP sur le port 587**, d'où le port 2525 (proposé par Brevo pour ce cas) ;
et `NPM_CONFIG_PRODUCTION=false` est nécessaire au build, sinon npm
n'installe pas les dépendances de développement dont la compilation a besoin
(TypeScript, @types, CLI Prisma, ts-node pour le seed).

L'environnement de test est constitué des services Render créés à la main
lors des premiers essais ; on les garde tels quels, il suffit de leur faire
suivre la branche `develop` (*Settings → Branch* sur chacun des trois) et de
donner au back-office de test la commande de build
`npm run backoffice:build:staging` — sans cela, il serait construit avec
l'URL de l'API de **production**.

Règles qui vont avec :

- **On ne pousse jamais directement sur `main`.** On travaille sur `develop`,
  on vérifie sur l'environnement de test, puis on fusionne `develop` dans
  `main` : c'est cette fusion qui déclenche la mise en production.
- **Les secrets ne sont jamais partagés entre les deux.** `JWT_ACCESS_SECRET`
  et `JWT_REFRESH_SECRET` sont générés séparément par Render : sinon un jeton
  émis sur l'environnement de test ouvrirait la production.
- **Les bases ne se parlent pas.** Aucun essai n'est fait sur la base de
  production ; pour reproduire un cas réel en test, on copie la base de
  production vers celle de test, jamais l'inverse.
- **Les images non plus** : `CLOUDINARY_FOLDER` préfixe tous les envois, donc
  une photo d'essai ne peut pas apparaître sur le site public, même si les
  deux environnements partagent le même compte Cloudinary.

### Base PostgreSQL hébergée (Neon)

La base de développement est sur Neon (offre gratuite, réveil à froid de
plusieurs secondes, ~300 ms par requête). Deux réglages évitent des erreurs
500 aléatoires (`Transaction not found`, `Timed out fetching a new connection
from the connection pool`) :

- `DATABASE_URL` doit inclure `connect_timeout=30&pool_timeout=30` (à ajouter
  aussi sur l'URL de production si elle est sur Neon) ;
- les transactions interactives Prisma ont un délai étendu dans
  `PrismaService` (`maxWait` 15 s, `timeout` 60 s).

## Déploiement sur Render

`render.yaml` décrit trois services (Blueprint Render) : l'API (`mtm-api`),
le back-office (`mtm-backoffice`, site statique Angular) et le site public
(`mtm-public-web`, site statique Vite). Les deux sites statiques ont une
règle de réécriture `/* → /index.html` (applications monopages).

Pour ajouter le site public à un compte Render existant :

1. **Dashboard Render → New → Blueprint** sur ce dépôt (ou *Sync* du
   Blueprint existant) : le service `mtm-public-web` est créé avec
   `npm run public-web:build` et publie `apps/public-web/dist`.
   La variable `VITE_API_URL` (URL de l'API, préfixe `/api` inclus) est lue
   **au moment du build** : la modifier impose un nouveau déploiement.
2. Sur le service **API**, compléter les variables d'environnement :
   - `CORS_ORIGIN` : URLs du back-office **et** du site public, séparées par
     des virgules, sans barre oblique finale ;
   - `PUBLIC_WEB_URL` : URL du site public (liens d'invitation à l'espace
     client) ;
   - `API_PUBLIC_URL` : URL publique de l'API avec `/api` (liens signés vers
     les documents) ;
   - `REFRESH_COOKIE_SAME_SITE=none` : front et API sont sur des sous-domaines
     distincts d'`onrender.com` (sites différents) ; sans cela le cookie de
     session n'est jamais envoyé et la connexion ne survit pas à un
     rechargement (`POST /api/auth/refresh → 403`) ;
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` :
     **le même compte Cloudinary que celui où les photos ont été envoyées**.
     La base référence les fichiers par identifiant ; avec un autre compte,
     toutes les images répondent 404.
   L'API redémarre automatiquement après modification.
3. Vérifier depuis un autre appareil : catalogue des terrains, formulaire de
   contact, espace client (connexion + documents).

### Base de données

`DATABASE_URL` est saisie dans le tableau de bord Render (base Neon gérée) :
elle n'est pas versionnée. À chaque déploiement, la *release command* joue
`prisma migrate deploy` puis `prisma db seed` :

- **`migrate deploy`** applique les migrations de `apps/api/prisma/migrations`.
  Toute évolution du schéma doit donc passer par une migration
  (`npx prisma migrate dev --name ...`) et non par `prisma db push`, sinon la
  base de production ne recevra jamais le changement.
- **`db seed`** est idempotent (tous les `upsert` ont un `update: {}`) : il
  ajoute les rôles, permissions et paramètres manquants — par exemple une
  nouvelle permission comme `crm:exporter` — sans écraser l'existant, ni les
  mots de passe, ni les données.

Si une base existante a été créée avec `prisma db push` (sans historique de
migrations), la marquer une fois comme à jour avant le premier
`migrate deploy` : `npx prisma migrate resolve --applied <nom_migration>`.

## Déploiement des deux sites sur Cloudflare Pages

Les deux interfaces sont des applications monopages : elles n'ont besoin que
d'un hébergeur de fichiers statiques. Cloudflare Pages convient bien (bande
passante non facturée, déploiement de prévisualisation par branche, domaines
personnalisés gratuits), et le dépôt contient déjà ce qu'il faut :
`public/_redirects` (toute URL inconnue est servie par `index.html`, sinon
`/terrains/:id` renvoie 404 au rafraîchissement) et `public/_headers`
(en-têtes de sécurité, cache long sur les fichiers au nom haché, page
d'entrée toujours revalidée).

Réglages d'un projet Pages, à créer deux fois (*Workers & Pages → Create →
Pages → Connect to Git*), en laissant le *Root directory* sur `/` :

| Réglage | Site public | Back-office |
| --- | --- | --- |
| Production branch | `main` | `main` |
| Build command | `npm run public-web:build:cloudflare` | `npm run backoffice:build:cloudflare` |
| Build output directory | `apps/public-web/dist` | `apps/backoffice/dist/backoffice/browser` |
| Variable `NODE_VERSION` | `22` | `22` |
| Variable `VITE_API_URL` | URL de l'API, `/api` inclus | — (voir ci-dessous) |

Ces commandes passent par `scripts/build-frontend.mjs`, qui lit la branche
déployée (`CF_PAGES_BRANCH`, fournie par Pages) : `main` construit la
production, toute autre branche construit la version de test. C'est ce qui
permet à un seul projet Pages de servir les deux environnements.

Les deux applications ne lisent pas leur URL d'API au même moment :

- le **site public** lit `VITE_API_URL` au build. Pages distingue les
  variables *Production* et *Preview* : mettre l'API de production dans la
  première, l'API de test dans la seconde ;
- le **back-office** compile l'URL depuis ses fichiers versionnés
  `src/environments/environment.prod.ts` (production) et
  `environment.staging.ts` (test) — `apiUrl` et `publicWebUrl` y sont à jour
  avant tout changement de domaine.

Pages déploie aussi automatiquement chaque branche autre que `main` à une
adresse `https://<branche>.<projet>.pages.dev`. Ce n'est pas l'environnement
de test officiel (il est sur Render), mais c'est pratique pour prévisualiser
une branche de travail : mettre l'API de test dans la variable *Preview*
`VITE_API_URL`, et son adresse dans le `CORS_ORIGIN` de l'API de test.

Côté API de production : ajouter les deux adresses Pages à `CORS_ORIGIN`
(séparées par des virgules, sans barre oblique finale) et celle du site
public à `PUBLIC_WEB_URL`, sinon le navigateur bloque tous les appels.

Sans Blueprint, créer manuellement un *Static Site* avec : *Root Directory*
`.`, *Build Command* `npm run public-web:build`, *Publish Directory*
`apps/public-web/dist`, la variable `VITE_API_URL` et la règle de
réécriture `/*` → `/index.html` (onglet *Redirects/Rewrites*).

## Mise en place de la production (ordre à suivre)

Une seule fois, pour créer l'environnement de production à côté de celui de
test qui existe déjà.

1. **Branche `develop`** — alignée sur `main`, puis protéger `main` dans
   GitHub : il ne reçoit plus que des fusions venant de `develop`.
2. **Base de production (Neon)** — créer un *projet* séparé (pas une branche
   du projet de test : on veut deux bases qui ne peuvent pas se toucher),
   dans la région la plus proche des visiteurs. Ne rien y importer : le
   premier déploiement joue les migrations puis le seed, qui crée les rôles,
   les permissions et le compte administrateur. Les vraies données (terrains,
   utilisateurs, contenus) sont ensuite saisies dans le back-office.
3. **Services de test (Render, existants)** — sur chacun des trois, passer
   la branche suivie à `develop` ; sur le back-office de test, remplacer la
   commande de build par `npm run backoffice:build:staging` ; sur l'API de
   test, ajouter `APP_ENV=staging` et `CLOUDINARY_FOLDER=mtm-staging`.
4. **Service API de production (Render)** — créer le Blueprint depuis ce
   dépôt : il crée `mtm-api` (branche `main`). Renseigner les variables
   marquées `sync: false` (`DATABASE_URL`, `CORS_ORIGIN`, `PUBLIC_WEB_URL`,
   `API_PUBLIC_URL`, les trois clés Cloudinary) et `SEED_ADMIN_PASSWORD` le
   temps du premier déploiement. Reporter l'URL obtenue dans
   `apps/backoffice/src/environments/environment.prod.ts`.
5. **Sites de production (Cloudflare Pages)** — les deux projets décrits
   plus haut, branche de production `main`.
6. **Vérifier l'environnement de test** de bout en bout (connexion,
   catalogue, création d'un terrain avec photo, espace client) : tant qu'il
   n'est pas correct, la production ne l'est pas non plus.
7. **Première mise en production** : fusionner `develop` dans `main`.
   Surveiller le journal de la *release command* — c'est là que
   `prisma migrate deploy` puis le seed s'exécutent.
8. **Après le premier déploiement** : se connecter avec le compte
   administrateur, changer son mot de passe, activer la double
   authentification, puis retirer `SEED_ADMIN_PASSWORD` des variables Render
   (le seed ne l'exige que tant que le compte n'existe pas).
9. **Nom de domaine** — une fois la production vérifiée. Mettre le domaine
   sur Cloudflare, puis `www` et `admin` sur les projets Pages, `api` sur le
   service Render. Mettre alors à jour `environment.prod.ts`, les variables
   `VITE_API_URL`, `CORS_ORIGIN`, `PUBLIC_WEB_URL`, `API_PUBLIC_URL`, et
   repasser `REFRESH_COOKIE_SAME_SITE` à `lax` puisque tout sera sous le même
   domaine.

## Phase actuelle

Voir `docs/PHASE_0.md` pour le détail du périmètre, des livrables et des
critères de validation de la Phase 0 (Jalon J0.1).

## E-mails transactionnels

L'API envoie des e-mails via SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS`, `MAIL_FROM` — voir `.env.example`) : réinitialisation de mot de
passe, invitation à l'espace client, notification à l'équipe des demandes de
contact et de réservation venant du site public (`CONTACT_NOTIFY_EMAIL`, sinon
le bloc de contenu `contact.email`).

- Sans SMTP en **développement**, les e-mails sont journalisés dans la console
  et le jeton de réinitialisation est renvoyé par l'API pour permettre la
  recette.
- Sans SMTP en **production**, `GET /api/health` répond `status: error`
  (`mail: down`) : la réinitialisation de mot de passe serait une impasse pour
  les utilisateurs. Configurer SMTP fait partie des prérequis de déploiement.

## Tests e2e (API)

`npm run test:e2e` (dans `apps/api`) exécute les parcours de bout en bout sur
une **vraie base PostgreSQL** — routage, guards, validation, services et SQL
généré par Prisma sont réels, sans doublure.

- Sans configuration, un PostgreSQL **embarqué** est démarré sur un port libre
  dans un répertoire temporaire, puis détruit : ni Docker ni installation
  requis.
- Avec `E2E_DATABASE_URL` (la CI, ou `docker-compose.test.yml` en local), cette
  base est utilisée. Elle doit être **locale et nommée `*_test`** : les suites
  la vident avant chaque scénario. Toute autre base est refusée et les suites
  sont ignorées avec un avertissement. `DATABASE_URL` (base de développement)
  n'est jamais lue par les e2e.
