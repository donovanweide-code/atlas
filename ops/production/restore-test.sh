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
evidence_dir=/srv/wbd/shared/recovery-evidence
verified_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)

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

workspace_state=$(mariadb --protocol=socket --batch --skip-column-names -e \
  "SELECT CONCAT(COUNT(*), ':', COALESCE(MAX(revision), 0), ':', COALESCE(MIN(JSON_VALID(state_json)), 0)) FROM \`${restore_workspace}\`.sp_runtime_state")
atlas_boundary=$(mariadb --protocol=socket --batch --skip-column-names -e \
  "SELECT CONCAT(COUNT(*), ':', COALESCE(MIN(JSON_VALID(state_json)), 1)) FROM \`${restore_atlas}\`.atlas_runtime_boundary")
IFS=: read -r workspace_rows workspace_revision workspace_json_valid <<<"${workspace_state}"
IFS=: read -r atlas_rows atlas_json_valid <<<"${atlas_boundary}"

if [[ ${workspace_rows} -lt 1 || ${workspace_revision} -lt 1 || ${workspace_json_valid} != 1 || ${atlas_json_valid} != 1 ]]; then
  echo "Restored datastore sanity validation failed." >&2
  exit 1
fi

cleanup
trap - EXIT
workspace_left=$(mariadb --protocol=socket --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='${restore_workspace}'")
atlas_left=$(mariadb --protocol=socket --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='${restore_atlas}'")
if [[ ${workspace_left} != 0 || ${atlas_left} != 0 || -e ${plain_tmp} || -e ${rewritten_tmp} ]]; then
  echo "Isolated restore cleanup validation failed." >&2
  exit 1
fi

install -d -m 0750 -o root -g wbdapp "${evidence_dir}"
evidence_file="${evidence_dir}/restore-verify-$(date -u +%Y%m%dT%H%M%SZ).txt"
backup_hash=$(sha256sum "${latest_backup}" | awk '{print $1}')
{
  printf 'verified_at=%s\n' "${verified_at}"
  printf 'source_backup=%s\n' "$(basename "${latest_backup}")"
  printf 'source_sha256=%s\n' "${backup_hash}"
  printf 'workspace_rows=%s\n' "${workspace_rows}"
  printf 'workspace_revision=%s\n' "${workspace_revision}"
  printf 'workspace_json_valid=%s\n' "${workspace_json_valid}"
  printf 'atlas_rows=%s\n' "${atlas_rows}"
  printf 'atlas_json_valid=%s\n' "${atlas_json_valid}"
  printf 'isolated_restore=PASS\n'
  printf 'cleanup=PASS\n'
} >"${evidence_file}"
chown root:wbdapp "${evidence_file}"
chmod 0640 "${evidence_file}"

printf 'RESTORE_TEST=PASS\n'
printf 'SOURCE_BACKUP=%s\n' "$(basename "${latest_backup}")"
printf 'WORKSPACE_REVISION=%s\n' "${workspace_revision}"
printf 'WORKSPACE_JSON_VALID=%s\n' "${workspace_json_valid}"
printf 'ATLAS_JSON_VALID=%s\n' "${atlas_json_valid}"
printf 'CLEANUP=PASS\n'
printf 'EVIDENCE_FILE=%s\n' "${evidence_file}"
