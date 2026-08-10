#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

backup_dir=/var/backups/wbd-mariadb
latest_backup=$(find "${backup_dir}" -maxdepth 1 -type f -name 'wbd-mariadb-*.sql.enc' -printf '%T@ %p\n' \
  | sort -nr \
  | head -n 1 \
  | cut -d' ' -f2-)

if [[ -z ${latest_backup} || ! -s ${latest_backup} ]]; then
  echo "No encrypted WBD MariaDB backup available." >&2
  exit 1
fi

sha256sum --check "${latest_backup}.sha256"

restore_workspace=wbd_restore_workspace
restore_atlas=wbd_restore_atlas
plain_tmp=$(mktemp /tmp/wbd-restore.XXXXXX.sql)
rewritten_tmp=$(mktemp /tmp/wbd-restore-rewritten.XXXXXX.sql)

cleanup() {
  mariadb --protocol=socket -e "DROP DATABASE IF EXISTS \`${restore_workspace}\`; DROP DATABASE IF EXISTS \`${restore_atlas}\`;" >/dev/null 2>&1 || true
  rm -f "${plain_tmp}" "${rewritten_tmp}"
}
trap cleanup EXIT
chmod 0600 "${plain_tmp}" "${rewritten_tmp}"

openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in "${latest_backup}" -out "${plain_tmp}" -pass file:/etc/wbd/backup.key

sed \
  -e 's/`wbd_workspace`/`wbd_restore_workspace`/g' \
  -e 's/`wbd_atlas`/`wbd_restore_atlas`/g' \
  "${plain_tmp}" >"${rewritten_tmp}"

mariadb --protocol=socket <"${rewritten_tmp}"

workspace_found=$(mariadb --protocol=socket --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='${restore_workspace}'")
atlas_found=$(mariadb --protocol=socket --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='${restore_atlas}'")

if [[ ${workspace_found} != 1 || ${atlas_found} != 1 ]]; then
  echo "Isolated restore validation failed." >&2
  exit 1
fi

printf 'RESTORE_TEST=PASS\n'
printf 'SOURCE_BACKUP=%s\n' "$(basename "${latest_backup}")"
printf 'WORKSPACE_SCHEMA_RESTORED=%s\n' "${restore_workspace}"
printf 'ATLAS_SCHEMA_RESTORED=%s\n' "${restore_atlas}"
printf 'CLEANUP=AUTOMATIC\n'
