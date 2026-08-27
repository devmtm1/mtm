# Docker — MTM Immobilier

## Services

| Service | Rôle | Port hôte |
|---|---|---|
| `postgres` | Base de données PostgreSQL 16 | 5432 |
| `api` | Backend NestJS (dev, hot-reload) | 3000 |
| `backoffice` | Back-office Angular (dev, hot-reload) | 4200 |
| `backup` | Sauvegarde PostgreSQL planifiée | aucun |

## Démarrage

```bash
cp .env.example .env
# éditer .env si besoin (mots de passe, secrets JWT en local)

docker compose up -d
docker compose ps          # vérifier que les 3 services sont "healthy"
docker compose logs -f api # suivre les logs de l'API
```

## Arrêt

```bash
docker compose down          # arrête et supprime les conteneurs (garde les volumes)
docker compose down -v       # supprime aussi les volumes (⚠️ perte des données Postgres)
```

## Notes

- Les services `api` et `backoffice` montent le code en volume : les
  modifications locales sont prises en compte sans reconstruire l'image
  (hot-reload).
- Le service `api` dépend du healthcheck `postgres` (`service_healthy`) :
  il ne démarre qu'une fois la base réellement prête, pas seulement le
  conteneur lancé.
- Le healthcheck de `api` interroge `/api/health` (endpoint mis en place
  à l'étape 3 — bootstrap NestJS).
- Le service `backup` exécute une sauvegarde toutes les 24 heures par défaut.
  Ajuster `BACKUP_INTERVAL_SECONDS` et `BACKUP_RETENTION_DAYS` dans `.env`.
- **Avant l'étape 3 (NestJS) et l'étape 10 (Angular)**, les services `api`
  et `backoffice` ne peuvent pas encore être construits : leurs
  `Dockerfile.dev` référencent un `package.json` d'application qui n'existe
  pas encore. Seul `postgres` est fonctionnel à ce stade.
- Trois environnements sont prévus (section 27 du CDC) : utiliser
  `.env`, `.env.test`, `.env.production` selon le contexte, avec
  `docker compose --env-file .env.xxx up -d`.
