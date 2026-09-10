# Sauvegardes et restauration — MTM Immobilier

Conforme à l'exigence du backlog J0.1 : « Sauvegardes automatiques +
premier test de restauration » et à la section 27 du cahier des charges
(« Sauvegardes automatiques, tests de restauration »).

## Scripts disponibles

Tous dans `apps/api/scripts/`, exécutables (`chmod +x` déjà appliqué) :

| Script                   | Rôle                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `backup.sh`              | Sauvegarde la base (`pg_dump`, format custom compressé)                                   |
| `restore.sh`             | Restaure une sauvegarde (`pg_restore`)                                                    |
| `test-backup-restore.sh` | Test de bout en bout : sauvegarde → restaure dans une base temporaire → compare → nettoie |

## Sauvegarde manuelle

```bash
cd apps/api
./scripts/backup.sh
```

Utilise `DATABASE_URL` depuis `.env` (ou l'environnement). Le dossier de
sortie par défaut est `BACKUP_DIR` (voir `.env.example` — `/backups` en
contexte Docker, à surcharger pour un usage hors conteneur : `BACKUP_DIR=./backups ./scripts/backup.sh`).

Les sauvegardes plus anciennes que `BACKUP_RETENTION_DAYS` (14 jours par
défaut) sont automatiquement supprimées à chaque exécution.

## Sauvegarde automatique (planifiée)

**Hors Docker (cron)** :

```cron
0 3 * * * cd /chemin/vers/apps/api && ./scripts/backup.sh >> /var/log/mtm-backup.log 2>&1
```

**Avec Docker** : le service `backup` de `docker-compose.yml` exécute le
script toutes les `BACKUP_INTERVAL_SECONDS` secondes (24 heures par défaut),
conserve les dumps selon `BACKUP_RETENTION_DAYS` et les place dans le volume
Docker `mtm_backups`. En production, ce volume doit être répliqué vers un
stockage externe ou un service de sauvegarde managé : un volume local seul ne
protège pas contre la perte de l'hôte.

## Restauration

```bash
cd apps/api
./scripts/restore.sh                        # restaure la sauvegarde la plus récente (demande confirmation)
./scripts/restore.sh chemin/fichier.dump      # restaure un fichier précis
./scripts/restore.sh --force ...               # sans confirmation (scripts automatisés)
```

⚠️ Opération destructive : les objets existants de la base **cible**
(celle de `DATABASE_URL` au moment de l'exécution) sont supprimés puis
recréés à l'identique du contenu du dump.

## Test de restauration — vérifié réellement

```bash
cd apps/api
./scripts/test-backup-restore.sh
```

Ce script :

1. Sauvegarde la base actuelle (**sans la modifier**)
2. Crée une base temporaire `<nom>_restore_test`
3. Y restaure la sauvegarde
4. Compare le nombre de tables entre original et restauré
5. Supprime la base temporaire
6. Échoue explicitement (`exit 1`) si la comparaison ne correspond pas

**Résultat de la dernière exécution (environnement de développement)** :

```
Tables — original : 9 / restauré : 9
✅ Test de restauration réussi : 9 tables, structure identique.
```

Testé avec des données réelles présentes (pas une base vide) pour
valider un cycle significatif, pas un cas dégénéré.

## Limite connue

`pg_dump`/`pg_restore` ne reconnaissent pas le paramètre `?schema=public`
que Prisma ajoute à `DATABASE_URL` (extension propre à Prisma, absente du
format d'URI PostgreSQL standard) — les scripts le retirent
automatiquement avant d'appeler les outils PostgreSQL natifs. Aucune
action requise de votre part, mais bon à savoir si vous adaptez ces
scripts.

## Rétention des journaux d'audit

La durée par défaut est de 365 jours et se configure avec
`AUDIT_RETENTION_DAYS`. Le script suivant permet d'abord de simuler la purge :

```bash
cd apps/api
DRY_RUN=true ./scripts/purge-audit-logs.sh
./scripts/purge-audit-logs.sh
```

La purge est définitive et doit être planifiée selon la politique de
conservation validée par MTM. Le mode simulation doit être utilisé avant la
première exécution en production.

Avec Docker Compose, le service `audit-retention` exécute cette purge chaque
jour par défaut. L'intervalle se règle avec
`AUDIT_RETENTION_INTERVAL_SECONDS`.

## Rétention des documents (GED)

Contrairement aux journaux d'audit, les documents de la GED (titres
fonciers, contrats, quittances, justificatifs, preuves de signature...)
peuvent avoir une valeur légale ou probatoire de longue durée (sections 17
et 28 du cahier des charges). **La purge automatique est donc désactivée
par défaut** — aucun document n'est supprimé tant que MTM (et un conseil
juridique si nécessaire) n'a pas validé explicitement une durée de
conservation et la liste des types de documents concernés.

Pour activer une purge automatique sur certains types de documents,
définir dans `.env` :

```bash
DOCUMENT_RETENTION_DAYS=3650
DOCUMENT_RETENTION_PURGEABLE_TYPES=DocumentVente:justificatif,MandatDocument:correspondance
```

`DOCUMENT_RETENTION_PURGEABLE_TYPES` est une liste `Modèle:type` séparée
par des virgules (`*` pour "tous les types" d'un modèle). Modèles valides :
`TerrainDocument`, `MandatDocument`, `DocumentVente`, `DocumentCrm`. Tant
que cette variable est vide, ou que `DOCUMENT_RETENTION_DAYS` n'est pas
défini, le script ne fait rien.

Toujours simuler avant la première exécution réelle :

```bash
cd apps/api
DRY_RUN=true npm run documents:purge
npm run documents:purge
```

Chaque document purgé est d'abord tracé dans le journal d'audit
(`action: document.purge`, avec type, référence de stockage et date de
création), puis supprimé de la base et du stockage Cloudinary associé —
conformément à l'exigence de traçabilité de la rétention (section 27 du
CDC).

Avec Docker Compose, le service `document-retention` exécute cette purge
selon `DOCUMENT_RETENTION_INTERVAL_SECONDS` (24 heures par défaut), mais
reste sans effet tant que les variables ci-dessus ne sont pas définies.

## Récupération de compte

Les endpoints `POST /api/auth/password-reset/request` et
`POST /api/auth/password-reset/confirm` utilisent des tokens hachés, uniques
et expirables. Le premier endpoint ne révèle jamais si l'adresse existe.
Le token est retourné uniquement hors production pour la recette locale ; un
fournisseur email ou SMS doit être raccordé avant la mise en production.
