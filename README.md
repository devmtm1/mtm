# MTM Immobilier — Plateforme numérique intégrée

Monorepo du projet MTM Immobilier : backend API (NestJS), back-office
(Angular) et futur site public.

> **État actuel : Phase 0 — Fondations techniques terminée** (Jalon J0.1
> du planning d'exécution). Aucune fonctionnalité métier n'est développée
> à ce stade. Voir `docs/PHASE_0.md` pour le rapport de clôture complet,
> les anomalies connues et les actions restant à faire avant validation
> écrite et passage à la Phase 1.

## Structure du monorepo

```
apps/
├── api/              # Backend NestJS + Prisma + PostgreSQL
├── backoffice/        # Interface interne Angular
└── public-web/        # Site public — non développé (Phase 1+)
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
