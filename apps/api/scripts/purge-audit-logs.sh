#!/usr/bin/env bash
# Purge les journaux d'audit plus anciens que la durée de conservation.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
if [[ -z "${DATABASE_URL:-}" && -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Erreur : DATABASE_URL n'est pas défini." >&2
  exit 1
fi

RETENTION_DAYS="${AUDIT_RETENTION_DAYS:-365}"
if ! [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] || [[ "$RETENTION_DAYS" -lt 1 ]]; then
  echo "Erreur : AUDIT_RETENTION_DAYS doit être un entier positif." >&2
  exit 1
fi

PG_URL="$(echo "$DATABASE_URL" | sed -E 's/[?&]schema=[^&]*//')"
CUTOFF="$(date -u -d "-${RETENTION_DAYS} days" '+%Y-%m-%d %H:%M:%S+00' 2>/dev/null || date -u -v-"${RETENTION_DAYS}"d '+%Y-%m-%d %H:%M:%S+00')"

if [[ "${DRY_RUN:-false}" == "true" ]]; then
  psql "$PG_URL" -v ON_ERROR_STOP=1 -c \
    "SELECT count(*) AS audit_logs_to_delete FROM audit_logs WHERE \"createdAt\" < TIMESTAMP WITH TIME ZONE '$CUTOFF';"
  exit 0
fi

psql "$PG_URL" -v ON_ERROR_STOP=1 -c \
  "DELETE FROM audit_logs WHERE \"createdAt\" < TIMESTAMP WITH TIME ZONE '$CUTOFF';"
