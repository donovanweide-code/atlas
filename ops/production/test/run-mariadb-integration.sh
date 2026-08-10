#!/usr/bin/env bash
set -Eeuo pipefail
set +x

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this isolated integration harness as root." >&2
  exit 1
fi
if [[ $# -ne 1 || ! -f $1 ]]; then
  echo "Usage: run-mariadb-integration.sh <source-archive.tgz>" >&2
  exit 1
fi

archive=$(readlink -f "$1")
test_root=$(mktemp -d /tmp/wbd-mariadb-integration.XXXXXXXX)
suffix=$(openssl rand -hex 4)
workspace_db="wbd_test_ws_${suffix}"
atlas_db="wbd_test_atlas_${suffix}"
workspace_user="wbdtw_${suffix}"
atlas_user="wbdta_${suffix}"
migrator_user="wbdtm_${suffix}"
workspace_password=$(openssl rand -hex 24)
atlas_password=$(openssl rand -hex 24)
migrator_password=$(openssl rand -hex 24)

cleanup() {
  mariadb <<SQL
DROP DATABASE IF EXISTS \`${workspace_db}\`;
DROP DATABASE IF EXISTS \`${atlas_db}\`;
DROP USER IF EXISTS '${workspace_user}'@'localhost';
DROP USER IF EXISTS '${atlas_user}'@'localhost';
DROP USER IF EXISTS '${migrator_user}'@'localhost';
DROP USER IF EXISTS '${workspace_user}'@'127.0.0.1';
DROP USER IF EXISTS '${atlas_user}'@'127.0.0.1';
DROP USER IF EXISTS '${migrator_user}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
  rm -rf -- "$test_root"
}
trap cleanup EXIT

tar -xzf "$archive" -C "$test_root"
cd "$test_root/website"
npm ci --omit=dev --ignore-scripts --no-audit --no-fund >/dev/null

mariadb <<SQL
CREATE DATABASE \`${workspace_db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE \`${atlas_db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '${workspace_user}'@'localhost' IDENTIFIED BY '${workspace_password}';
CREATE USER '${atlas_user}'@'localhost' IDENTIFIED BY '${atlas_password}';
CREATE USER '${migrator_user}'@'localhost' IDENTIFIED BY '${migrator_password}';
CREATE USER '${workspace_user}'@'127.0.0.1' IDENTIFIED BY '${workspace_password}';
CREATE USER '${atlas_user}'@'127.0.0.1' IDENTIFIED BY '${atlas_password}';
CREATE USER '${migrator_user}'@'127.0.0.1' IDENTIFIED BY '${migrator_password}';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`${workspace_db}\`.* TO '${workspace_user}'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`${atlas_db}\`.* TO '${atlas_user}'@'localhost';
GRANT ALL PRIVILEGES ON \`${workspace_db}\`.* TO '${migrator_user}'@'localhost';
GRANT ALL PRIVILEGES ON \`${atlas_db}\`.* TO '${migrator_user}'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`${workspace_db}\`.* TO '${workspace_user}'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`${atlas_db}\`.* TO '${atlas_user}'@'127.0.0.1';
GRANT ALL PRIVILEGES ON \`${workspace_db}\`.* TO '${migrator_user}'@'127.0.0.1';
GRANT ALL PRIVILEGES ON \`${atlas_db}\`.* TO '${migrator_user}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

MYSQL_PWD="$workspace_password" mariadb --protocol=TCP -h 127.0.0.1 -u "$workspace_user" "$workspace_db" -e "SELECT 1" >/dev/null

export MARIADB_INTEGRATION=true
export WORKSPACE_DB_HOST=127.0.0.1
export WORKSPACE_DB_PORT=3306
export WORKSPACE_DB_NAME="$workspace_db"
export WORKSPACE_DB_USER="$workspace_user"
export WORKSPACE_DB_PASSWORD="$workspace_password"
export ATLAS_DB_HOST=127.0.0.1
export ATLAS_DB_PORT=3306
export ATLAS_DB_NAME="$atlas_db"
export ATLAS_DB_USER="$atlas_user"
export ATLAS_DB_PASSWORD="$atlas_password"
export WBD_MIGRATOR_USER="$migrator_user"
export WBD_MIGRATOR_PASSWORD="$migrator_password"

node --test tests/production-persistence-mariadb.integration.mjs
echo "MARIADB_INTEGRATION=PASS"
