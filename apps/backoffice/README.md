# MTM Immobilier — Back-office

Interface interne (ERP) de la plateforme MTM Immobilier, développée en
Angular. Voir `docs/FRONTEND_STACK.md` à la racine du monorepo pour le
détail des bibliothèques imposées (Angular Material, CDK, AG Grid,
Lucide, ECharts/ngx-echarts).

> **État actuel : Phase 0.** Seul le socle technique est implémenté
> (layout, routing, authentification, gestion des permissions). Aucun
> écran métier (terrains, mandats, CRM...) n'est développé à ce stade.

## Développement

```bash
npm run start --workspace=apps/backoffice
# ou, depuis apps/backoffice :
npm start
```

Ouvrir `http://localhost:4200/`.

## Build

```bash
npm run build --workspace=apps/backoffice
```

## Tests

```bash
npm test --workspace=apps/backoffice
```

## Structure

```
src/app/
├── core/           # services, guards, interceptors transverses
├── layout/          # coquille de l'application (barre latérale, en-tête)
├── features/         # écrans par domaine (auth, users, roles, settings, audit, dashboard)
└── app.routes.ts
```
