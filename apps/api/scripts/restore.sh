#!/usr/bin/env bash
#
# Restauration d'une sauvegarde PostgreSQL de MTM Immobilier.
#
# Usage :
#   ./restore.sh                          # restaure la sauvegarde la plus récente
#   ./restore.sh chemin/vers/fichier.dump # restaure un fichier précis
#   ./restore.sh --force ...               # ne demande pas de confirmation
#
# ATTENTION : opération destructive. Les objets existants de la base
# cible portant le même nom sont supprimés puis recréés (--clean --if-exists).
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

CALLER_BACKUP_DIR="${BACKUP_DIR:-}"
CALLER_DATABASE_URL="${DATABASE_URL:-}"

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

# Voir backup.sh : "schema" n'est pas un paramètre d'URI reconnu par
# pg_restore (extension propre à Prisma).
PG_URL="$(echo "$DATABASE_URL" | sed -E 's/[?&]schema=[^&]*//')"
DB_NAME="$(echo "$PG_URL" | sed -E 's#.*/([^/?]+).*#\1#')"

BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/../../../backups}"
DOCKER_POSTGRES_CONTAINER="${DOCKER_POSTGRES_CONTAINER:-mtm-postgres}"

FORCE=false
DUMP_FILE=""

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    *) DUMP_FILE="$arg" ;;
  esac
done

if [ -z "$DUMP_FILE" ]; then
  DUMP_FILE="$(ls -t "$BACKUP_DIR"/mtm_immobilier_*.dump 2>/dev/null | head -n1 || true)"
  if [ -z "$DUMP_FILE" ]; then
    echo "Erreur : aucun fichier de sauvegarde trouvé dans $BACKUP_DIR et aucun chemin fourni." >&2
    exit 1
  fi
  echo "Aucun fichier spécifié : utilisation de la sauvegarde la plus récente : $DUMP_FILE"
fi

if [ ! -f "$DUMP_FILE" ]; then
  echo "Erreur : fichier introuvable : $DUMP_FILE" >&2
  exit 1
fi

if [ "$FORCE" != true ]; then
  echo "⚠️  Cette opération va écraser les données existantes de la base cible."
  echo "    Cible : $PG_URL"
  echo "    Fichier : $DUMP_FILE"
  read -r -p "Continuer ? [oui/N] " CONFIRM
  if [ "$CONFIRM" != "oui" ]; then
    echo "Annulé."
    exit 0
  fi
fi

echo "Restauration en cours..."
if command -v docker >/dev/null 2>&1 && docker inspect "$DOCKER_POSTGRES_CONTAINER" >/dev/null 2>&1; then
  docker exec -i "$DOCKER_POSTGRES_CONTAINER" pg_restore \
    --clean \
    --if-exists \
    --no-owner \
    --username="${POSTGRES_USER:-mtm_user}" \
    --dbname="$DB_NAME" < "$DUMP_FILE"
else
  pg_restore --clean --if-exists --no-owner --dbname="$PG_URL" "$DUMP_FILE"
fi

echo "Restauration terminée."
