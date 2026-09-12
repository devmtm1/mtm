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

Trois environnements sont prévus, conformément à la section 27 du cahier
des charges : **développement**, **test**, **production**. Chaque
environnement dispose de son propre fichier de variables d'environnement
(jamais commité — voir `.env.example`).

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
