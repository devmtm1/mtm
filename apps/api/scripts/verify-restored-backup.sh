#!/usr/bin/env bash
#
# Contrôles de cohérence d'une base restaurée depuis une sauvegarde.
#
# Une restauration qui « réussit » peut produire une base vide ou tronquée :
# ce script échoue (exit 1) si la base restaurée ne ressemble pas à la
# plateforme MTM. Il ne modifie rien (lecture seule).
#
# Usage :
#   DATABASE_URL=postgresql://... ./verify-restored-backup.sh [dossier_migrations]
#
# Contrôles :
#   1. toutes les migrations du dépôt sont enregistrées comme appliquées ;
#   2. les tables attendues existent ;
#   3. les rôles, permissions et paramètres du seed sont présents ;
#   4. au moins un administrateur actif existe (sinon la reprise serait inutilisable).
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="${1:-$SCRIPT_DIR/../prisma/migrations}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Erreur : DATABASE_URL n'est pas défini." >&2
  exit 1
fi

# Voir backup.sh : « schema » est une extension Prisma que psql ne comprend pas.
PG_URL="$(echo "$DATABASE_URL" | sed -E 's/[?&]schema=[^&]*//')"
sql() { psql "$PG_URL" --no-psqlrc --tuples-only --no-align --command "$1"; }

fail=0
check() {
  local libelle="$1" attendu="$2" obtenu="$3"
  if [ "$obtenu" = "$attendu" ]; then
    echo "  OK   $libelle ($obtenu)"
  else
    echo "  ECHEC $libelle : attendu $attendu, obtenu $obtenu" >&2
    fail=1
  fi
}
check_min() {
  local libelle="$1" minimum="$2" obtenu="$3"
  if [ "$obtenu" -ge "$minimum" ] 2>/dev/null; then
    echo "  OK   $libelle ($obtenu, minimum $minimum)"
  else
    echo "  ECHEC $libelle : au moins $minimum attendu, obtenu '$obtenu'" >&2
    fail=1
  fi
}

echo "== Contrôles de la base restaurée =="

attendues="$(find "$MIGRATIONS_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
appliquees="$(sql "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL")"
check "migrations appliquées" "$attendues" "$appliquees"

tables="$(sql "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")"
check_min "tables" 40 "$tables"

for table in users roles permissions role_permissions system_settings audit_logs terrains dossiers_vente paiements; do
  existe="$(sql "SELECT to_regclass('public.${table}') IS NOT NULL")"
  check "table ${table}" "t" "$existe"
done

check_min "rôles" 5 "$(sql "SELECT count(*) FROM roles")"
check_min "permissions" 30 "$(sql "SELECT count(*) FROM permissions")"
check_min "paramètres" 5 "$(sql "SELECT count(*) FROM system_settings")"
check_min "administrateurs actifs" 1 "$(sql "SELECT count(*) FROM users u WHERE u.\"isActive\" AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.\"roleId\" WHERE ur.\"userId\" = u.id AND r.name = 'administrateur')")"

if [ "$fail" -ne 0 ]; then
  echo "La restauration ne passe pas les contrôles de cohérence." >&2
  exit 1
fi
echo "Restauration cohérente."
