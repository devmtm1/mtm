#!/usr/bin/env bash
#
# Sauvegarde de la base PostgreSQL de MTM Immobilier.
# Utilise pg_dump au format custom (-Fc), compressé et restaurable
# sélectivement (table par table si besoin) via pg_restore.
#
# Usage :
#   ./backup.sh                    # utilise DATABASE_URL de l'environnement
#   BACKUP_DIR=/chemin ./backup.sh # surcharge le dossier de sortie
#
# Variables lues (avec valeurs par défaut) :
#   DATABASE_URL            (requis, ou POSTGRES_* individuellement)
#   BACKUP_DIR               ./backups
#   BACKUP_RETENTION_DAYS    14
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

# Les valeurs explicitement passées par l'appelant (variables
# d'environnement) doivent primer sur celles de .env, pas l'inverse.
CALLER_BACKUP_DIR="${BACKUP_DIR:-}"
CALLER_DATABASE_URL="${DATABASE_URL:-}"

# Charge .env si présent et si DATABASE_URL n'est pas déjà dans l'environnement
if [ -z "${DATABASE_URL:-}" ] && [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

[ -n "$CALLER_BACKUP_DIR" ] && BACKUP_DIR="$CALLER_BACKUP_DIR"
[ -n "$CALLER_DATABASE_URL" ] && DATABASE_URL="$CALLER_DATABASE_URL"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Erreur : DATABASE_URL n'est pas défini (ni en variable d'environnement, ni dans .env)." >&2
  exit 1
fi

# pg_dump ne reconnaît pas le paramètre "schema" ajouté par Prisma à
# DATABASE_URL (extension propre à Prisma, absente du format d'URI
# PostgreSQL standard) : on le retire avant de l'utiliser avec les
# outils PostgreSQL natifs.
PG_URL="$(echo "$DATABASE_URL" | sed -E 's/[?&]schema=[^&]*//')"

BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/../../../backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="$BACKUP_DIR/mtm_immobilier_${TIMESTAMP}.dump"

echo "Sauvegarde en cours -> $DUMP_FILE"
pg_dump --format=custom --file="$DUMP_FILE" "$PG_URL"

DUMP_SIZE="$(du -h "$DUMP_FILE" | cut -f1)"
echo "Sauvegarde terminée ($DUMP_SIZE)."

# Nettoyage des sauvegardes plus anciennes que la rétention configurée
echo "Nettoyage des sauvegardes de plus de ${BACKUP_RETENTION_DAYS} jours..."
find "$BACKUP_DIR" -name "mtm_immobilier_*.dump" -type f -mtime "+${BACKUP_RETENTION_DAYS}" -print -delete

echo "Sauvegardes actuellement conservées :"
ls -lh "$BACKUP_DIR"/mtm_immobilier_*.dump 2>/dev/null || echo "  (aucune)"
