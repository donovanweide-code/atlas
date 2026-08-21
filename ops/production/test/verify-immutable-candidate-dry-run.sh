#!/usr/bin/env bash
set -Eeuo pipefail

[[ $# -eq 2 ]] || { printf 'Gebruik: verify-immutable-candidate-dry-run.sh <artifact> <extern-manifest>\n' >&2; exit 2; }
artifact="$1"
external_manifest="$2"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
deploy_script="$(cd "$script_dir/.." && pwd)/spw-immutable-release.sh"
root="$(mktemp -d .candidate-deploy-dry-run.XXXXXX)"
trap 'rm -rf -- "$root"' EXIT

export SPW_DEPLOY_TEST_MODE=1
export SPW_SKIP_DEPENDENCY_INSTALL=1
export WBD_ROOT="$root/srv/wbd"
export WBD_ENV_FILE="$root/etc/wbd/production.env"
export WBD_BACKUP_DIR="$root/var/backups/wbd-mariadb"
export WBD_BACKUP_MAX_AGE_SECONDS=90000

old_id=SPW-DRY-RUN-CURRENT-20260821
mkdir -p "$WBD_ROOT/releases/$old_id" "$WBD_ROOT/shared" "$WBD_BACKUP_DIR" "$(dirname "$WBD_ENV_FILE")"
cat > "$WBD_ROOT/releases/$old_id/RELEASE-MANIFEST.json" <<EOF
{"schemaVersion":2,"releaseId":"$old_id","commit":"0000000000000000000000000000000000000000","tag":"$old_id","files":[]}
EOF
printf '%s\n' "$WBD_ROOT/releases/$old_id" > "$WBD_ROOT/current"
printf 'NODE_ENV=production\nRELEASE_ID=%s\nSECRET=unchanged\n' "$old_id" > "$WBD_ENV_FILE"
printf 'encrypted-backup-fixture\n' > "$WBD_BACKUP_DIR/wbd-mariadb-20260821T000000Z.sql.enc"
(cd "$WBD_BACKUP_DIR" && sha256sum wbd-mariadb-20260821T000000Z.sql.enc > wbd-mariadb-20260821T000000Z.sql.enc.sha256)

output="$($deploy_script prepare --artifact "$artifact" --manifest "$external_manifest" --expected-current "$old_id")"
grep -q 'PREPARE=PASS' <<<"$output"
grep -q "ACTIVE_UNCHANGED=$old_id" <<<"$output"
grep -q 'HUMAN_GO_REQUIRED=YES' <<<"$output"
[[ "$(basename "$(cat "$WBD_ROOT/current")")" == "$old_id" ]]
grep -q "RELEASE_ID=$old_id" "$WBD_ENV_FILE"

release_id="$(node -e 'const fs=require("fs");process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).releaseId)' "$external_manifest")"
plan="$WBD_ROOT/shared/deploy-plans/$release_id.json"
[[ -f "$plan" && -f "${plan}.sha256" ]]
[[ -d "$WBD_ROOT/releases/$release_id" ]]
[[ -f "$WBD_ROOT/shared/deploy-rollbacks/$release_id-prechange.tar.gz" ]]

printf '%s\n' "$output"
printf 'REAL_CANDIDATE_DRY_RUN=PASS\n'
