# public-web

Site public MTM Immobilier, implemente avec React, TypeScript, Vite, Tailwind
CSS et Lucide React.

## Developpement

Depuis la racine du monorepo :

```bash
npm run public-web:dev
```

Le site est disponible sur `http://localhost:5173`.

## Donnees publiques

Le catalogue appelle `GET /api/terrains/public`. Cette API ne renvoie que les
terrains disponibles et exclut les donnees internes (prix d'acquisition,
marges, commissions, notes et proprietaires). En l'absence d'API disponible,
le site utilise des donnees locales de demonstration pour permettre le travail
UI.

La variable `VITE_API_URL` permet de remplacer l'URL par defaut
(`http://localhost:3001/api`).
