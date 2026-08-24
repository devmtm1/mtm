# Sauvegardes et restauration — MTM Immobilier

Conforme à l'exigence du backlog J0.1 : « Sauvegardes automatiques +
premier test de restauration » et à la section 27 du cahier des charges
(« Sauvegardes automatiques, tests de restauration »).

## Scripts disponibles

Tous dans `apps/api/scripts/`, exécutables (`chmod +x` déjà appliqué) :

| Script | Rôle |
|---|---|
| `backup.sh` | Sauvegarde la base (`pg_dump`, format custom compressé) |
| `restore.sh` | Restaure une sauvegarde (`pg_restore`) |
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

**Avec Docker** : ajouter un service dédié à `docker-compose.yml` avec la
même image que `postgres`, un volume monté sur `BACKUP_DIR`, et une
commande planifiée (ex: image `postgres` + un `cron` dans le conteneur,
ou un conteneur `mcuadros/ofelia`/équivalent en superviseur externe). Non
implémenté dans cette Phase 0 — le script `backup.sh` est prêt à être
appelé par n'importe quel ordonnanceur.

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
