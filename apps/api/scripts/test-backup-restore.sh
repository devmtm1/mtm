#!/usr/bin/env bash
#
# Test de bout en bout du cycle sauvegarde/restauration :
#   1. Sauvegarde la base actuelle (DATABASE_URL)
#   2. Restaure cette sauvegarde dans une base temporaire dédiée
#   3. Compare le nombre de tables et le nombre exact de lignes entre les deux
#   4. Nettoie la base temporaire
#
# Usage : ./scripts/test-backup-restore.sh
#
# Ce script ne modifie jamais la base d'origine (lecture seule dessus) —
# seule la base temporaire "<db>_restore_test" est créée puis supprimée.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ -z "${DATABASE_URL:-}" ] && [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Erreur : DATABASE_URL n'est pas défini." >&2
  exit 1
fi

PG_URL="$(echo "$DATABASE_URL" | sed -E 's/[?&]schema=[^&]*//')"

# Extraction des composants de connexion pour construire l'URL de la
# base de test (même serveur/identifiants, nom de base différent).
DB_NAME="$(echo "$PG_URL" | sed -E 's#.*/([^/?]+).*#\1#')"
BASE_URL="$(echo "$PG_URL" | sed -E "s#/${DB_NAME}\$##")"
TEST_DB_NAME="${DB_NAME}_restore_test"
TEST_DB_URL="${BASE_URL}/${TEST_DB_NAME}"

TMP_DIR="$(mktemp -d)"
cleanup() {
  psql "$BASE_URL/postgres" -c "DROP DATABASE IF EXISTS ${TEST_DB_NAME};" >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "== 1. Sauvegarde de la base '$DB_NAME' =="
BACKUP_DIR="$TMP_DIR" DATABASE_URL="$DATABASE_URL" "$SCRIPT_DIR/backup.sh"
DUMP_FILE="$(ls -t "$TMP_DIR"/mtm_immobilier_*.dump | head -n1)"

echo ""
echo "== 2. Création de la base temporaire '$TEST_DB_NAME' =="
psql "$BASE_URL/postgres" -c "DROP DATABASE IF EXISTS ${TEST_DB_NAME};"
psql "$BASE_URL/postgres" -c "CREATE DATABASE ${TEST_DB_NAME};"

echo ""
echo "== 3. Restauration dans la base temporaire =="
DATABASE_URL="$TEST_DB_URL" BACKUP_DIR="$TMP_DIR" "$SCRIPT_DIR/restore.sh" --force "$DUMP_FILE"

echo ""
echo "== 4. Comparaison =="
ORIGINAL_TABLES=$(psql "$PG_URL" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d ' ')
RESTORED_TABLES=$(psql "$TEST_DB_URL" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d ' ')
count_exact_rows() {
  local database_url="$1"
  local total=0
  local table_name
  while IFS= read -r table_name; do
    local count
    count=$(psql "$database_url" -At -v ON_ERROR_STOP=1 \
      -c "SELECT count(*) FROM public.\"${table_name}\";" | tr -d ' ')
    total=$((total + count))
  done < <(psql "$database_url" -At -v ON_ERROR_STOP=1 \
    -c "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename;")
  printf '%s' "$total"
}

ORIGINAL_ROWS=$(count_exact_rows "$PG_URL")
RESTORED_ROWS=$(count_exact_rows "$TEST_DB_URL")

echo "Tables — original : $ORIGINAL_TABLES / restauré : $RESTORED_TABLES"
echo "Lignes exactes — original : $ORIGINAL_ROWS / restauré : $RESTORED_ROWS"

if [ "$ORIGINAL_TABLES" != "$RESTORED_TABLES" ]; then
  echo "❌ ÉCHEC : nombre de tables différent." >&2
  exit 1
fi

if [ "$ORIGINAL_ROWS" != "$RESTORED_ROWS" ]; then
  echo "❌ ÉCHEC : nombre de lignes différent." >&2
  exit 1
fi

echo ""
echo "== 5. Nettoyage =="
psql "$BASE_URL/postgres" -c "DROP DATABASE ${TEST_DB_NAME};"

echo ""
echo "✅ Test de restauration réussi : $ORIGINAL_TABLES tables, $ORIGINAL_ROWS lignes."
