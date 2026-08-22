#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
deploy_script="$(cd "$script_dir/.." && pwd)/spw-immutable-release.sh"
root="$(mktemp -d .deploy-foundation-test.XXXXXX)"
trap 'rm -rf -- "$root"' EXIT

export SPW_DEPLOY_TEST_MODE=1
export SPW_SKIP_DEPENDENCY_INSTALL=1
export WBD_ROOT="$root/srv/wbd"
export WBD_ENV_FILE="$root/etc/wbd/production.env"
export WBD_BACKUP_DIR="$root/var/backups/wbd-mariadb"
export WBD_SERVICE=wbd-workspace.service
export WBD_READY_URL=https://workspace.sportpaleis.nl/readyz
export WBD_READY_RESOLVE=workspace.sportpaleis.nl:443:127.0.0.1
export WBD_BACKUP_MAX_AGE_SECONDS=90000

old_id=SPW-OLD-20260821
candidate_id=SPW-CANDIDATE-20260821
commit=1111111111111111111111111111111111111111
tag=SPW-CANDIDATE-TAG-20260821
fixture="$root/fixture"
artifact="$root/$candidate_id.tar.gz"
external_manifest="$root/$candidate_id.manifest.json"

mkdir -p "$WBD_ROOT/releases/$old_id/website" "$WBD_ROOT/shared" "$WBD_BACKUP_DIR" \
  "$fixture/app/scripts" "$fixture/app/dist-workspace/assets" "$fixture/deployment"
printf 'old\n' > "$WBD_ROOT/releases/$old_id/website/version.txt"
cat > "$WBD_ROOT/releases/$old_id/RELEASE-MANIFEST.json" <<EOF
{"schemaVersion":2,"releaseId":"$old_id","commit":"0000000000000000000000000000000000000000","tag":"$old_id","files":[]}
EOF
printf '%s\n' "$WBD_ROOT/releases/$old_id" > "$WBD_ROOT/current"
mkdir -p "$(dirname "$WBD_ENV_FILE")"
printf 'NODE_ENV=production\nRELEASE_ID=%s\nSECRET=preserved\n' "$old_id" > "$WBD_ENV_FILE"
printf 'backup\n' > "$WBD_BACKUP_DIR/wbd-mariadb-20260821T000000Z.sql.enc"
(cd "$WBD_BACKUP_DIR" && sha256sum wbd-mariadb-20260821T000000Z.sql.enc > wbd-mariadb-20260821T000000Z.sql.enc.sha256)

printf '{"name":"fixture","private":true,"version":"1.0.0","lockfileVersion":3,"packages":{}}\n' > "$fixture/app/package-lock.json"
printf '{"name":"fixture","private":true,"version":"1.0.0"}\n' > "$fixture/app/package.json"
printf 'candidate\n' > "$fixture/app/version.txt"
printf 'export {};\n' > "$fixture/app/scripts/workspace-runtime.mjs"
printf 'export {};\n' > "$fixture/app/scripts/production-migrate.mjs"
printf '<!doctype html>workspace\n' > "$fixture/app/dist-workspace/workspace.html"
printf '<!doctype html>sportpaleis\n' > "$fixture/app/dist-workspace/sportpaleis.html"
printf 'asset\n' > "$fixture/app/dist-workspace/assets/app.js"
cat > "$fixture/deployment/wbd-workspace.service" <<'EOF'
[Service]
WorkingDirectory=/srv/wbd/current/website
ExecStart=/usr/bin/node /srv/wbd/current/website/scripts/workspace-runtime.mjs
EOF
node - "$fixture" "$candidate_id" "$commit" "$tag" <<'NODE'
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const [root, releaseId, commit, tag] = process.argv.slice(2);
const files = [
  "app/package-lock.json", "app/package.json", "app/version.txt",
  "app/scripts/workspace-runtime.mjs", "app/scripts/production-migrate.mjs",
  "app/dist-workspace/workspace.html", "app/dist-workspace/sportpaleis.html",
  "app/dist-workspace/assets/app.js", "deployment/wbd-workspace.service",
].map((name) => {
  const bytes = fs.readFileSync(path.join(root, name));
  return { path: name, bytes: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") };
});
fs.writeFileSync(path.join(root, "RELEASE-MANIFEST.json"), JSON.stringify({ schemaVersion: 2, releaseId, commit, tag, files }, null, 2));
NODE
tar -C "$fixture" -czf "$artifact" app deployment RELEASE-MANIFEST.json
artifact_hash="$(sha256sum "$artifact" | awk '{print $1}')"
cat > "$external_manifest" <<EOF
{"releaseId":"$candidate_id","commit":"$commit","tag":"$tag","artifact":"$(basename "$artifact")","artifactSha256":"$artifact_hash"}
EOF

# Een structureel incompleet raw artifact moet vóór staging, rollbackmateriaal en
# deployplan fail-closed stoppen. De actieve release blijft daarbij onaangeraakt.
bad_layout_fixture="$root/fixture-bad-layout"
bad_layout_artifact="$root/$candidate_id.bad-layout.tar.gz"
bad_layout_manifest="$root/$candidate_id.bad-layout.manifest.json"
cp -a "$fixture" "$bad_layout_fixture"
rm -f "$bad_layout_fixture/app/scripts/workspace-runtime.mjs"
tar -C "$bad_layout_fixture" -czf "$bad_layout_artifact" app deployment RELEASE-MANIFEST.json
bad_layout_hash="$(sha256sum "$bad_layout_artifact" | awk '{print $1}')"
cat > "$bad_layout_manifest" <<EOF
{"releaseId":"$candidate_id","commit":"$commit","tag":"$tag","artifact":"$(basename "$bad_layout_artifact")","artifactSha256":"$bad_layout_hash"}
EOF
if $deploy_script prepare --artifact "$bad_layout_artifact" --manifest "$bad_layout_manifest" --expected-current "$old_id" >"$root/bad-layout.out" 2>&1; then
  printf 'incompleet raw artifact werd ten onrechte geaccepteerd\n' >&2
  exit 1
fi
grep -q 'vereist artifactpad ontbreekt: app/scripts/workspace-runtime.mjs' "$root/bad-layout.out"
[[ "$(basename "$(cat "$WBD_ROOT/current")")" == "$old_id" ]]
[[ ! -e "$WBD_ROOT/releases/$candidate_id" ]]
[[ ! -e "$WBD_ROOT/shared/deploy-plans/$candidate_id.json" ]]
[[ ! -e "$WBD_ROOT/shared/deploy-rollbacks/$candidate_id-prechange.tar.gz" ]]

output="$($deploy_script prepare --artifact "$artifact" --manifest "$external_manifest" --expected-current "$old_id")"
grep -q 'PREPARE=PASS' <<<"$output"
grep -q 'HUMAN_GO_REQUIRED=YES' <<<"$output"
[[ "$(basename "$(cat "$WBD_ROOT/current")")" == "$old_id" ]]
grep -q "RELEASE_ID=$old_id" "$WBD_ENV_FILE"
plan="$WBD_ROOT/shared/deploy-plans/$candidate_id.json"
[[ -f "$plan" && -f "${plan}.sha256" ]]
[[ -f "$WBD_ROOT/shared/deploy-rollbacks/$candidate_id-prechange.tar.gz" ]]
[[ -f "$WBD_ROOT/releases/$candidate_id/website/scripts/workspace-runtime.mjs" ]]
[[ -f "$WBD_ROOT/releases/$candidate_id/website/package.json" ]]
[[ ! -e "$WBD_ROOT/releases/$candidate_id/app" ]]

export SPW_TEST_READINESS_STATUS=PASS
$deploy_script switch --plan "$plan" --human-go "$candidate_id" >/dev/null
[[ "$(basename "$(cat "$WBD_ROOT/current")")" == "$candidate_id" ]]
grep -q "RELEASE_ID=$candidate_id" "$WBD_ENV_FILE"
grep -q 'SECRET=preserved' "$WBD_ENV_FILE"

# Stale plannen worden geweigerd voordat current of RELEASE_ID kan wijzigen.
# Automatische applicatierollback na een rode readiness.
second_id=SPW-CANDIDATE-FAIL-20260821
second_fixture="$root/fixture-fail"
second_artifact="$root/$second_id.tar.gz"
second_manifest="$root/$second_id.manifest.json"
cp -a "$fixture" "$second_fixture"
node - "$second_fixture/RELEASE-MANIFEST.json" "$second_id" <<'NODE'
const fs = require("fs");
const [file, releaseId] = process.argv.slice(2);
const value = JSON.parse(fs.readFileSync(file, "utf8"));
value.releaseId = releaseId;
value.tag = releaseId;
fs.writeFileSync(file, JSON.stringify(value, null, 2));
NODE
tar -C "$second_fixture" -czf "$second_artifact" app deployment RELEASE-MANIFEST.json
second_hash="$(sha256sum "$second_artifact" | awk '{print $1}')"
cat > "$second_manifest" <<EOF
{"releaseId":"$second_id","commit":"$commit","tag":"$second_id","artifact":"$(basename "$second_artifact")","artifactSha256":"$second_hash"}
EOF
$deploy_script prepare --artifact "$second_artifact" --manifest "$second_manifest" --expected-current "$candidate_id" >/dev/null
second_plan="$WBD_ROOT/shared/deploy-plans/$second_id.json"

# Een gewijzigde centrale state maakt het plan stale en blokkeert vóór switch.
cp "$WBD_ENV_FILE" "$root/production.env.before-stale"
printf '# unexpected change\n' >> "$WBD_ENV_FILE"
set +e
$deploy_script switch --plan "$second_plan" --human-go "$second_id" >/dev/null 2>&1
status=$?
set -e
[[ "$status" -ne 0 ]]
[[ "$(basename "$(cat "$WBD_ROOT/current")")" == "$candidate_id" ]]
cp "$root/production.env.before-stale" "$WBD_ENV_FILE"

export SPW_TEST_FAIL_RELEASE="$second_id"
set +e
$deploy_script switch --plan "$second_plan" --human-go "$second_id" >/dev/null 2>&1
status=$?
set -e
[[ "$status" -ne 0 ]]
[[ "$(basename "$(cat "$WBD_ROOT/current")")" == "$candidate_id" ]]
grep -q "RELEASE_ID=$candidate_id" "$WBD_ENV_FILE"
grep -q 'result=ROLLED_BACK' "$WBD_ROOT/shared/deploy-evidence/$second_id/deployment.txt"

# Ook een fout tussen env-update en symlink-update herstelt de oude env/state.
unset SPW_TEST_FAIL_RELEASE
export SPW_TEST_FAIL_ATOMIC_RELEASE="$second_id"
set +e
$deploy_script switch --plan "$second_plan" --human-go "$second_id" >/dev/null 2>&1
status=$?
set -e
[[ "$status" -ne 0 ]]
[[ "$(basename "$(cat "$WBD_ROOT/current")")" == "$candidate_id" ]]
grep -q "RELEASE_ID=$candidate_id" "$WBD_ENV_FILE"
unset SPW_TEST_FAIL_ATOMIC_RELEASE

# Een mismatchende Human GO wordt fail-closed geweigerd.
set +e
$deploy_script switch --plan "$second_plan" --human-go WRONG-RELEASE >/dev/null 2>&1
status=$?
set -e
[[ "$status" -ne 0 ]]

printf 'IMMUTABLE_RELEASE_FOUNDATION_TESTS=PASS\n'
printf 'PREPARE_WITHOUT_SWITCH=PASS\n'
printf 'ATOMIC_SWITCH=PASS\n'
printf 'AUTOMATIC_APPLICATION_ROLLBACK=PASS\n'
printf 'INTERMEDIATE_SWITCH_FAILURE_ROLLBACK=PASS\n'
printf 'STALE_AND_HUMAN_GO_GUARDS=PASS\n'
