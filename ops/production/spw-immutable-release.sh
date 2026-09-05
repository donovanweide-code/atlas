#!/usr/bin/env bash
set -Eeuo pipefail

readonly CANONICAL_WBD_ROOT="/srv/wbd"
readonly CANONICAL_ENV_FILE="/etc/wbd/production.env"
readonly CANONICAL_BACKUP_DIR="/var/backups/wbd-mariadb"
readonly CANONICAL_SERVICE="wbd-workspace.service"
readonly CANONICAL_READY_URL="https://workspace.sportpaleis.nl/readyz"
readonly CANONICAL_READY_RESOLVE="workspace.sportpaleis.nl:443:127.0.0.1"

WBD_ROOT="${WBD_ROOT:-$CANONICAL_WBD_ROOT}"
ENV_FILE="${WBD_ENV_FILE:-$CANONICAL_ENV_FILE}"
BACKUP_DIR="${WBD_BACKUP_DIR:-$CANONICAL_BACKUP_DIR}"
SERVICE="${WBD_SERVICE:-$CANONICAL_SERVICE}"
READY_URL="${WBD_READY_URL:-$CANONICAL_READY_URL}"
READY_RESOLVE="${WBD_READY_RESOLVE:-$CANONICAL_READY_RESOLVE}"
BACKUP_MAX_AGE_SECONDS="${WBD_BACKUP_MAX_AGE_SECONDS:-90000}"
TEST_MODE="${SPW_DEPLOY_TEST_MODE:-0}"

RELEASES_DIR="$WBD_ROOT/releases"
SHARED_DIR="$WBD_ROOT/shared"
CURRENT_LINK="$WBD_ROOT/current"
ROLLBACK_DIR="$SHARED_DIR/deploy-rollbacks"
PLAN_DIR="$SHARED_DIR/deploy-plans"
EVIDENCE_DIR="$SHARED_DIR/deploy-evidence"
LOCK_FILE="$SHARED_DIR/.spw-release-deploy.lock"

LAST_FAILURE_REASON=""
SWITCH_PREACTIVATION=0
SWITCH_EVIDENCE_RELEASE=""
SWITCH_EVIDENCE_PLAN=""
SWITCH_STEP="UNSET"
SWITCH_GATE="UNSET"
SWITCH_GATE_REASON="Pre-activation gate faalde."

log() { printf '%s\n' "$*"; }
fail() { LAST_FAILURE_REASON="$*"; printf 'ERROR: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Gebruik:
  spw-immutable-release.sh inspect
  spw-immutable-release.sh prepare --artifact FILE --manifest FILE --expected-current RELEASE_ID --assurance-evidence FILE
  spw-immutable-release.sh switch --plan FILE --human-go RELEASE_ID

prepare bouwt een actuele rollbackset en staged de kandidaat, maar wijzigt
/srv/wbd/current, RELEASE_ID en de actieve service niet.

switch vereist een expliciet overeenkomende Human-GO-release-ID. Bij een
mislukte restart/readiness-check wordt de vorige applicatierelease automatisch
hersteld. Een database-restore is nooit automatisch.
EOF
}

require_production_boundary() {
  if [[ "$TEST_MODE" == "1" ]]; then return; fi
  [[ "$(id -u)" == "0" ]] || fail "root is vereist voor productie-prepare/switch."
  [[ "$WBD_ROOT" == "$CANONICAL_WBD_ROOT" ]] || fail "afwijkende WBD-root geweigerd."
  [[ "$ENV_FILE" == "$CANONICAL_ENV_FILE" ]] || fail "afwijkend productie-envbestand geweigerd."
  [[ "$BACKUP_DIR" == "$CANONICAL_BACKUP_DIR" ]] || fail "afwijkende backupdirectory geweigerd."
  [[ "$SERVICE" == "$CANONICAL_SERVICE" ]] || fail "afwijkende service geweigerd."
  [[ "$READY_URL" == "$CANONICAL_READY_URL" ]] || fail "afwijkende readiness-URL geweigerd."
  [[ "$READY_RESOLVE" == "$CANONICAL_READY_RESOLVE" ]] || fail "afwijkende readiness-route geweigerd."
}

require_command() { command -v "$1" >/dev/null 2>&1 || fail "vereist commando ontbreekt: $1"; }

acquire_lock() {
  if [[ "$TEST_MODE" == "1" ]]; then return; fi
  exec 9>"$LOCK_FILE"
  flock -n 9 || fail "een andere deployment is actief."
}

validate_release_id() {
  [[ "$1" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]] || fail "ongeldige release-ID: $1"
}

sha256_file() { sha256sum "$1" | awk '{print tolower($1)}'; }

env_release_id() {
  awk -F= '$1=="RELEASE_ID" {sub(/^RELEASE_ID=/, ""); print; exit}' "$ENV_FILE"
}

current_release_path() {
  if [[ "$TEST_MODE" == "1" ]]; then
    [[ -f "$CURRENT_LINK" ]] || fail "$CURRENT_LINK testpointer ontbreekt."
    cat "$CURRENT_LINK"
    return
  fi
  [[ -L "$CURRENT_LINK" ]] || fail "$CURRENT_LINK is geen symlink."
  readlink -f "$CURRENT_LINK"
}

current_release_id() {
  basename "$(current_release_path)"
}

verify_current_consistency() {
  local current_id env_id manifest
  current_id="$(current_release_id)"
  env_id="$(env_release_id)"
  [[ -n "$env_id" ]] || fail "RELEASE_ID ontbreekt in productie-env."
  [[ "$current_id" == "$env_id" ]] || fail "current ($current_id) en RELEASE_ID ($env_id) wijken af."
  manifest="$(current_release_path)/RELEASE-MANIFEST.json"
  [[ -f "$manifest" ]] || fail "actueel release-manifest ontbreekt."
  node - "$manifest" "$current_id" <<'NODE'
const fs = require("fs");
const [manifestPath, expected] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.releaseId !== expected) throw new Error("actueel manifest/release-ID wijkt af");
NODE
}

latest_backup() {
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'wbd-mariadb-*.sql.enc' -printf '%T@ %p\n' \
    | sort -nr | head -n 1 | cut -d' ' -f2-
}

verify_backup() {
  local backup modified age expected actual
  backup="$(latest_backup)"
  [[ -n "$backup" && -f "$backup" ]] || fail "geen actuele versleutelde MariaDB-backup gevonden."
  [[ -f "${backup}.sha256" ]] || fail "backup-sidecar ontbreekt."
  modified="$(stat -c %Y "$backup")"
  age="$(( $(date +%s) - modified ))"
  (( age >= 0 && age <= BACKUP_MAX_AGE_SECONDS )) || fail "backup is te oud: ${age}s."
  expected="$(awk 'NR==1 {print tolower($1)}' "${backup}.sha256")"
  actual="$(sha256_file "$backup")"
  [[ "$actual" == "$expected" ]] || fail "backupchecksum wijkt af."
  printf '%s|%s|%s\n' "$backup" "$actual" "$age"
}

validate_tar_entries() {
  local artifact="$1" entry listing
  while IFS= read -r entry; do
    [[ -n "$entry" ]] || continue
    [[ "$entry" != /* && "$entry" != *'\'* ]] || fail "onveilig tarpad: $entry"
    case "/$entry/" in *'/../'*|*'/./'*) fail "onveilig tarpad: $entry";; esac
  done < <(tar -tzf "$artifact")
  while IFS= read -r listing; do
    case "${listing:0:1}" in -|d) ;; *) fail "niet-regulier taritem geweigerd: $listing";; esac
  done < <(tar -tvzf "$artifact")
}

manifest_field() {
  node - "$1" "$2" <<'NODE'
const fs = require("fs");
const [file, field] = process.argv.slice(2);
const value = field.split(".").reduce((current, key) => current?.[key], JSON.parse(fs.readFileSync(file, "utf8")));
if (value === undefined || value === null) process.exit(3);
process.stdout.write(String(value));
NODE
}

normalize_plan_path() {
  if [[ "$TEST_MODE" == "1" ]] && command -v cygpath >/dev/null 2>&1; then
    cygpath -u "$1"
  else
    printf '%s\n' "$1"
  fi
}

verify_external_artifact() {
  local artifact="$1" manifest="$2" expected_name expected_hash actual_hash
  [[ -f "$artifact" && -f "$manifest" ]] || fail "artifact of extern manifest ontbreekt."
  expected_name="$(manifest_field "$manifest" artifact)"
  expected_hash="$(manifest_field "$manifest" artifactSha256 | tr '[:upper:]' '[:lower:]')"
  [[ "$(basename "$artifact")" == "$expected_name" ]] || fail "artifactnaam wijkt af van manifest."
  actual_hash="$(sha256_file "$artifact")"
  [[ "$actual_hash" == "$expected_hash" ]] || fail "artifactchecksum wijkt af."
  validate_tar_entries "$artifact"
}

verify_production_shaped_assurance() {
  local evidence="$1" manifest="$2" artifact="$3" artifact_hash release_id commit assurance_hash contract_hash contract_entry contract_tmp verified_hash
  [[ -n "$evidence" && -f "$evidence" ]] || fail "verplichte production-shaped assurance-evidence ontbreekt."
  release_id="$(manifest_field "$manifest" releaseId)"
  commit="$(manifest_field "$manifest" commit)"
  artifact_hash="$(manifest_field "$manifest" artifactSha256 | tr '[:upper:]' '[:lower:]')"
  assurance_hash="$(manifest_field "$manifest" productionShapedAssurance.sha256 | tr '[:upper:]' '[:lower:]')"
  contract_hash="$(manifest_field "$manifest" productionShapedAssurance.contractSha256 | tr '[:upper:]' '[:lower:]')"
  contract_entry="$(manifest_field "$manifest" productionShapedAssurance.contract)"
  [[ "$contract_entry" == "app/config/sportpaleis-production-shaped-assurance-v3.json" ]] || fail "assurancecontractpad is niet geallowlist."
  contract_tmp="$(mktemp)"
  if ! tar -xOzf "$artifact" "$contract_entry" >"$contract_tmp"; then rm -f -- "$contract_tmp"; fail "versioned assurancecontract ontbreekt uit artifact."; fi
  [[ "$(sha256_file "$contract_tmp")" == "$contract_hash" ]] || { rm -f -- "$contract_tmp"; fail "assurancecontracthash wijkt af."; }
  if ! verified_hash="$(node - "$evidence" "$release_id" "$commit" "$artifact_hash" "$assurance_hash" "$contract_hash" "$contract_tmp" <<'NODE'
const crypto = require("crypto");
const fs = require("fs");
const [file, releaseId, commit, artifactSha256, assuranceSha256, contractSha256, contractFile] = process.argv.slice(2);
const evidence = JSON.parse(fs.readFileSync(file, "utf8"));
const contract = JSON.parse(fs.readFileSync(contractFile, "utf8"));
if (evidence.schemaVersion !== 3 || evidence.status !== "PASS" || evidence.releaseId !== releaseId) throw new Error("production-shaped assurance is niet PASS voor deze release");
if (evidence.identity?.candidateCommit !== commit || evidence.identity?.candidateArtifactSha256 !== artifactSha256) throw new Error("assurance candidatebinding wijkt af");
if (!/^[a-f0-9]{64}$/u.test(String(evidence.identity?.restoreBackupSha256 ?? ""))) throw new Error("assurance restorebinding ontbreekt");
if (evidence.identity?.assuranceEntrypointSha256 !== assuranceSha256) throw new Error("assurance testversie wijkt af");
if (evidence.identity?.assuranceContractSha256 !== contractSha256) throw new Error("assurance drempelcontract wijkt af");
if (evidence.identity?.assuranceContract !== contract.contractId || contract.schemaVersion !== 3) throw new Error("assurance contractidentiteit wijkt af");
if (evidence.load?.httpErrors !== 0 || evidence.load?.serverErrors !== 0) throw new Error("assurance bevat HTTP-fouten");
const required = contract.requiredInvariants;
if (!required.every((key) => evidence.invariants?.[key] === true) || !Object.values(evidence.invariants ?? {}).every((value) => value === true)) throw new Error("assurance-invariant is niet groen");
const limits = contract.limits;
if (evidence.load?.p95Ms > limits.allRoutesP95Ms || evidence.load?.maxMs > limits.allRoutesMaxMs || evidence.load?.byRoute?.["/api/sportpaleis/v1/bootstrap"]?.p95Ms > limits.bootstrapP95Ms || evidence.load?.byRoute?.["/api/sportpaleis/v1/bootstrap"]?.maxMs > limits.bootstrapMaxMs) throw new Error("assurance latencygrens is overschreden");
for (const [surface, maximum] of Object.entries(limits.bootstrapSurfaceMaxBytes ?? {})) if (!(evidence.load?.bootstrapSurfaceBytes?.[surface] > 0) || evidence.load.bootstrapSurfaceBytes[surface] > maximum) throw new Error(`assurance payloadgrens is overschreden voor ${surface}`);
if (evidence.runtime?.eventLoopP95Ms > limits.eventLoopP95Ms || evidence.runtime?.eventLoopMaxMs > limits.eventLoopMaxMs || evidence.runtime?.rssHighWaterBytes > limits.rssHighWaterBytes || evidence.runtime?.rssRecoveredWithinBudget !== true || evidence.runtime?.steadyStateMemoryStable !== true) throw new Error("assurance runtimegrens is overschreden");
if (evidence.pool?.connectionLimit !== limits.databaseConnectionLimit || evidence.pool?.acquireTimeouts !== limits.databaseAcquireTimeouts) throw new Error("assurance databasepoolgrens is overschreden");
if (contract.minimumLoad?.concurrentFullBootstraps < 4 || contract.minimumLoad?.libraryPreviews < 300 || contract.minimumLoad?.revisionPolls < 100 || limits.eventLoopMaxMs > 1000 || limits.eventLoopP95Ms > 100 || limits.rssHighWaterBytes > 1073741824) throw new Error("versioned assurancecontract versoepelt een bestaande harde grens");
const heights = new Set((evidence.practice?.largeFreeProduction ?? []).map(({ heightMm }) => heightMm));
if (!(contract.minimumLoad?.largeFreeProductionHeightsMm ?? []).every((height) => heights.has(height))) throw new Error("assurance grote Vrije-productiepraktijk ontbreekt");
const body = fs.readFileSync(file);
process.stdout.write(crypto.createHash("sha256").update(body).digest("hex"));
NODE
  )"; then rm -f -- "$contract_tmp"; fail "production-shaped assurance-evidence faalt de versioned brokergrens."; fi
  rm -f -- "$contract_tmp"
  printf '%s' "$verified_hash"
}

verify_artifact_layout_contract() {
  local artifact="$1" listing
  listing="$(tar -tzf "$artifact")"
  for required in \
    app/package.json \
    app/package-lock.json \
    app/scripts/workspace-runtime.mjs \
    app/scripts/production-migrate.mjs \
    app/scripts/sportpaleis-production-shaped-assurance.mjs \
    app/scripts/sportpaleis-domain-rollback-bridge.mjs \
    app/config/sportpaleis-production-shaped-assurance-v3.json \
    app/dist-workspace/workspace.html \
    app/dist-workspace/sportpaleis.html \
    deployment/wbd-workspace.service \
    RELEASE-MANIFEST.json; do
    grep -Fxq "$required" <<<"$listing" || fail "vereist artifactpad ontbreekt: $required"
  done
  grep -q '^app/dist-workspace/assets/' <<<"$listing" || fail "gebouwde Workspace-assets ontbreken in artifact."
  ! grep -q '^website/' <<<"$listing" || fail "artifact bevat onverwacht reeds een website/-layout."
}

normalize_production_layout() {
  local stage="$1"
  [[ -d "$stage/app" ]] || fail "artifact-root app/ ontbreekt vóór layoutnormalisatie."
  [[ ! -e "$stage/website" ]] || fail "website/ bestaat al vóór layoutnormalisatie."
  mv "$stage/app" "$stage/website"
}

verify_release_tree() {
  local release_path="$1" expected_id="$2" expected_commit="$3" expected_tag="$4" layout="${5:-artifact}"
  node - "$release_path/RELEASE-MANIFEST.json" "$release_path" "$expected_id" "$expected_commit" "$expected_tag" "$layout" <<'NODE'
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const [manifestPath, root, releaseId, commit, tag, layout] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.releaseId !== releaseId || manifest.commit !== commit || manifest.tag !== tag) {
  throw new Error("embedded manifest wijkt af van externe provenance");
}
const productionPath = (sourcePath) => layout === "production" && sourcePath.startsWith("app/")
  ? `website/${sourcePath.slice(4)}`
  : sourcePath;
for (const file of manifest.files ?? []) {
  if (!file.path || path.isAbsolute(file.path) || file.path.split("/").includes("..")) throw new Error(`onveilig manifestpad: ${file.path}`);
  const absolute = path.join(root, productionPath(file.path));
  const bytes = fs.readFileSync(absolute);
  const actual = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actual !== String(file.sha256).toLowerCase()) throw new Error(`releasebestand wijkt af: ${file.path}`);
}
const expected = new Set(["RELEASE-MANIFEST.json", ...(manifest.files ?? []).map((file) => productionPath(file.path.replaceAll("\\", "/")))]);
function walk(directory, prefix = "") {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (relative === "website/node_modules" || relative.startsWith("website/node_modules/")) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, relative);
    else if (entry.isFile() && !expected.has(relative)) throw new Error(`onverwacht releasebestand: ${relative}`);
    else if (!entry.isFile() && !entry.isDirectory()) throw new Error(`niet-regulier releaseitem: ${relative}`);
  }
}
walk(root);
if (layout === "production") {
  const required = [
    "website/scripts/workspace-runtime.mjs",
    "website/scripts/production-migrate.mjs",
    "website/package.json",
    "website/package-lock.json",
    "website/dist-workspace/workspace.html",
    "website/dist-workspace/sportpaleis.html",
    "deployment/wbd-workspace.service",
  ];
  for (const relative of required) {
    if (!fs.statSync(path.join(root, relative)).isFile()) throw new Error(`vereiste productielayout ontbreekt: ${relative}`);
  }
  if (!fs.readdirSync(path.join(root, "website/dist-workspace/assets")).length) throw new Error("gebouwde Workspace-assets ontbreken");
  if (fs.existsSync(path.join(root, "app"))) throw new Error("raw app/-root bleef achter na normalisatie");
  const unit = fs.readFileSync(path.join(root, "deployment/wbd-workspace.service"), "utf8");
  if (!unit.includes("WorkingDirectory=/srv/wbd/current/website")
    || !unit.match(/ExecStart=.*\/srv\/wbd\/current\/website\/scripts\/workspace-runtime\.mjs/u)) {
    throw new Error("gepackagede service-unit wijkt af van canonical website/-layout");
  }
}
NODE
}

remove_stage() {
  local stage="$1" name
  name="$(basename "$stage")"
  [[ "$stage" == "$RELEASES_DIR/"* && "$name" == .*'.stage.'* ]] || fail "onveilig stage-cleanuppad geweigerd."
  rm -rf -- "$stage"
}

install_locked_dependencies() {
  local app_dir="$1"
  if [[ "$TEST_MODE" == "1" && "${SPW_SKIP_DEPENDENCY_INSTALL:-0}" == "1" ]]; then return; fi
  (
    cd "$app_dir"
    npm ci --omit=dev --ignore-scripts --no-audit --no-fund
  )
}

normalize_release_permissions() {
  local release_path="$1"
  if [[ "$TEST_MODE" == "1" ]]; then return; fi
  chown -R root:wbdapp "$release_path"
  find "$release_path" -type d -exec chmod 0750 {} +
  find "$release_path" -type f -exec chmod 0640 {} +
}

create_rollback_set() {
  local candidate_id="$1" previous_path="$2" rollback env_copy rollback_hash env_hash
  rollback="$ROLLBACK_DIR/${candidate_id}-prechange.tar.gz"
  env_copy="$ROLLBACK_DIR/${candidate_id}-prechange-production.env"
  [[ ! -e "$rollback" && ! -e "${rollback}.sha256" && ! -e "$env_copy" && ! -e "${env_copy}.sha256" ]] \
    || fail "rollbackset voor kandidaat bestaat al; hergebruik/overschrijven geweigerd."
  tar -C "$previous_path" -czf "${rollback}.tmp" .
  mv "${rollback}.tmp" "$rollback"
  rollback_hash="$(sha256_file "$rollback")"
  printf '%s  %s\n' "$rollback_hash" "$(basename "$rollback")" > "${rollback}.sha256"
  cp --preserve=mode,ownership,timestamps "$ENV_FILE" "${env_copy}.tmp"
  mv "${env_copy}.tmp" "$env_copy"
  env_hash="$(sha256_file "$env_copy")"
  printf '%s  %s\n' "$env_hash" "$(basename "$env_copy")" > "${env_copy}.sha256"
  printf '%s|%s|%s|%s\n' "$rollback" "$rollback_hash" "$env_copy" "$env_hash"
}

write_plan() {
  local plan="$1" release_id="$2" commit="$3" tag="$4" artifact_hash="$5"
  local previous_path="$6" previous_id="$7" current_manifest_hash="$8" env_hash="$9"
  local backup_info="${10}" rollback_info="${11}" candidate_path="${12}" assurance_path="${13:-}" assurance_hash="${14:-}"
  local backup_path backup_hash backup_age rollback rollback_hash env_copy env_copy_hash
  IFS='|' read -r backup_path backup_hash backup_age <<<"$backup_info"
  IFS='|' read -r rollback rollback_hash env_copy env_copy_hash <<<"$rollback_info"
  node - "$plan.tmp" "$release_id" "$commit" "$tag" "$artifact_hash" "$candidate_path" \
    "$previous_path" "$previous_id" "$current_manifest_hash" "$env_hash" \
    "$backup_path" "$backup_hash" "$backup_age" "$rollback" "$rollback_hash" "$env_copy" "$env_copy_hash" "$assurance_path" "$assurance_hash" <<'NODE'
const fs = require("fs");
const [out, releaseId, commit, tag, artifactSha256, candidatePath, previousPath, previousReleaseId,
  currentManifestSha256, productionEnvSha256, backupPath, backupSha256, backupAgeSeconds,
  rollbackArtifact, rollbackSha256, environmentSnapshot, environmentSnapshotSha256,
  assuranceEvidence, assuranceEvidenceSha256] = process.argv.slice(2);
fs.writeFileSync(out, `${JSON.stringify({
  schemaVersion: 1,
  releaseId, commit, tag, artifactSha256, candidatePath,
  previous: { releaseId: previousReleaseId, path: previousPath, manifestSha256: currentManifestSha256 },
  productionEnvSha256,
  backup: { path: backupPath, sha256: backupSha256, ageSecondsAtPreparation: Number(backupAgeSeconds) },
  rollback: { artifact: rollbackArtifact, sha256: rollbackSha256, environmentSnapshot, environmentSnapshotSha256 },
  productionShapedAssurance: { evidence: assuranceEvidence, sha256: assuranceEvidenceSha256, required: true },
  preparedAt: new Date().toISOString(),
  switchAuthorized: false,
  databaseRestoreAutomatic: false,
}, null, 2)}\n`);
NODE
  mv "$plan.tmp" "$plan"
  chmod 0600 "$plan"
  printf '%s  %s\n' "$(sha256_file "$plan")" "$(basename "$plan")" > "${plan}.sha256"
}

verify_plan() {
  local plan="$1" expected_hash actual_hash
  [[ -f "$plan" && -f "${plan}.sha256" ]] || fail "deployplan of checksum ontbreekt."
  expected_hash="$(awk 'NR==1 {print tolower($1)}' "${plan}.sha256")"
  actual_hash="$(sha256_file "$plan")"
  [[ "$actual_hash" == "$expected_hash" ]] || fail "deployplanchecksum wijkt af."
}

replace_release_id() {
  local release_id="$1" source="$2" destination="$3"
  node - "$source" "$destination.tmp" "$release_id" <<'NODE'
const fs = require("fs");
const [source, destination, releaseId] = process.argv.slice(2);
const input = fs.readFileSync(source, "utf8");
if (!/^RELEASE_ID=.*$/m.test(input)) throw new Error("RELEASE_ID ontbreekt in environment");
fs.writeFileSync(destination, input.replace(/^RELEASE_ID=.*$/m, `RELEASE_ID=${releaseId}`), { mode: fs.statSync(source).mode });
NODE
  if [[ "$TEST_MODE" != "1" ]]; then chown --reference="$source" "$destination.tmp"; fi
  chmod --reference="$source" "$destination.tmp"
  mv -T "$destination.tmp" "$destination"
}

atomic_link() {
  local target="$1" temp="$WBD_ROOT/.current.next.$$"
  [[ "$target" == "$RELEASES_DIR/"* && -d "$target" ]] || fail "ongeldig switchdoel."
  if [[ "$TEST_MODE" == "1" ]]; then
    [[ "${SPW_TEST_FAIL_ATOMIC_RELEASE:-}" != "$(basename "$target")" ]] || return 1
    printf '%s\n' "$target" > "$temp"
    mv -Tf "$temp" "$CURRENT_LINK"
    return
  fi
  ln -s "$target" "$temp"
  mv -Tf "$temp" "$CURRENT_LINK"
}

service_restart() {
  if [[ "$TEST_MODE" == "1" ]]; then return; fi
  systemctl restart "$SERVICE"
}

run_candidate_migrations() {
  local candidate_path="$1"
  if [[ "$TEST_MODE" == "1" ]]; then
    [[ "${SPW_TEST_MIGRATION_STATUS:-PASS}" == "PASS" ]]
    return
  fi
  [[ -f "$candidate_path/website/scripts/production-migrate.mjs" ]] \
    || fail "kandidaat-migratie-entrypoint ontbreekt."
  (
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    NODE_ENV=production node "$candidate_path/website/scripts/production-migrate.mjs" workspace
  )
}

service_stop() {
  if [[ "$TEST_MODE" == "1" ]]; then return; fi
  systemctl stop "$SERVICE"
}

readiness_probe() {
  local expected_release="$1"
  if [[ "$TEST_MODE" == "1" && -n "${SPW_TEST_READINESS_SEQUENCE_DIR:-}" ]]; then
    local sequence_file="$SPW_TEST_READINESS_SEQUENCE_DIR/$expected_release" token
    [[ -f "$sequence_file" ]] || return 10
    IFS= read -r token < "$sequence_file" || return 10
    tail -n +2 "$sequence_file" > "${sequence_file}.tmp"
    mv "${sequence_file}.tmp" "$sequence_file"
    case "$token" in
      CONNECT_ERROR) return 10;;
      502|503) printf '%s|\n' "$token";;
      READY) printf '200|{"status":"ready","releaseId":"%s"}\n' "$expected_release";;
      READY:*) printf '200|{"status":"ready","releaseId":"%s"}\n' "${token#READY:}";;
      *) printf '%s|\n' "$token";;
    esac
    return
  fi

  local response body status
  response="$(curl -sS --connect-timeout 1 --max-time 2 --resolve "$READY_RESOLVE" \
    -w $'\n%{http_code}' "$READY_URL")" || return 10
  status="${response##*$'\n'}"
  body="${response%$'\n'*}"
  printf '%s|%s\n' "$status" "$body"
}

verify_readiness_with_retry() {
  local expected_release="$1" window_seconds="$2" backoff_seconds="$3" max_attempts="${4:-0}"
  local deadline=$((SECONDS + window_seconds)) attempts=0 probe probe_status http_status response
  while :; do
    attempts=$((attempts + 1))
    if probe="$(readiness_probe "$expected_release")"; then
      probe_status=0
    else
      probe_status=$?
    fi

    if [[ "$probe_status" -eq 0 ]]; then
      http_status="${probe%%|*}"
      response="${probe#*|}"
      if [[ "$http_status" == "200" ]]; then
        if node -e 'const value=JSON.parse(process.argv[1]); if(value.status!=="ready"||value.releaseId!==process.argv[2]) process.exit(1)' \
          "$response" "$expected_release"; then
          return
        fi
        return 1
      fi
      [[ "$http_status" == "502" || "$http_status" == "503" ]] || return 1
    elif [[ "$probe_status" -ne 10 ]]; then
      return 1
    fi

    if (( max_attempts > 0 && attempts >= max_attempts )); then return 1; fi
    if (( SECONDS >= deadline )); then return 1; fi
    sleep "$backoff_seconds"
  done
}

verify_readiness() {
  local expected_release="$1"
  if [[ "$TEST_MODE" == "1" && -z "${SPW_TEST_READINESS_SEQUENCE_DIR:-}" ]]; then
    [[ "${SPW_TEST_FAIL_RELEASE:-}" != "$expected_release" ]] || return 1
    [[ "${SPW_TEST_READINESS_STATUS:-PASS}" == "PASS" ]] || return 1
    [[ -z "${SPW_TEST_READY_RELEASE:-}" || "$SPW_TEST_READY_RELEASE" == "$expected_release" ]] || return 1
    return
  fi
  if [[ "$TEST_MODE" == "1" ]]; then
    verify_readiness_with_retry "$expected_release" 30 0 "${SPW_TEST_READINESS_MAX_ATTEMPTS:-10}"
  else
    verify_readiness_with_retry "$expected_release" 30 1
  fi
}

verify_redirect_contract() {
  local status="$1" location="$2" expected_location="$3"
  [[ "$status" == "308" ]] || return 1
  [[ "$location" == "$expected_location" ]] || return 1
}

verify_exact_canonical_redirect() {
  local source_path="$1" expected_location="$2" headers status location
  headers="$(mktemp)"
  status="$(curl -sS --max-time 12 --resolve "$READY_RESOLVE" -D "$headers" -o /dev/null -w '%{http_code}' "https://workspace.sportpaleis.nl$source_path")" || {
    rm -f -- "$headers"
    return 1
  }
  location="$(awk 'BEGIN { IGNORECASE=1 } /^Location:/ { sub(/\r$/, ""); sub(/^[^:]+:[[:space:]]*/, ""); value=$0 } END { print value }' "$headers")"
  rm -f -- "$headers"
  verify_redirect_contract "$status" "$location" "$expected_location"
}

verify_http_200() {
  local path="$1" status
  status="$(curl -sS --max-time 12 --resolve "$READY_RESOLVE" -o /dev/null -w '%{http_code}' "https://workspace.sportpaleis.nl$path")" || return 1
  [[ "$status" == "200" ]]
}

verify_post_switch_smoke() {
  if [[ "$TEST_MODE" == "1" ]]; then
    [[ "${SPW_TEST_POST_SWITCH_SMOKE_STATUS:-PASS}" == "PASS" ]]
    return
  fi

  verify_http_200 "/healthz"
  verify_http_200 "/sportpaleis-sw.js"
  while IFS='|' read -r source_path canonical_path; do
    verify_exact_canonical_redirect "$source_path" "$canonical_path"
    verify_http_200 "$canonical_path"
  done <<'ROUTES'
/workspace/sportpaleis/overzicht|/overzicht
/workspace/sportpaleis/productie|/productie
/workspace/sportpaleis/productie/elementen|/productie/elementen
/workspace/sportpaleis/orders/team|/orders/team
/workspace/sportpaleis/productie/historie|/productie/historie
ROUTES
}

write_evidence() {
  local release_id="$1" plan="$2" result="$3" step="${4:-}" failed_gate="${5:-}" reason="${6:-}" remote_exit_code="${7:-}"
  local directory="$EVIDENCE_DIR/$release_id" plan_hash="UNAVAILABLE"
  [[ -f "$plan" ]] && plan_hash="$(sha256_file "$plan")"
  mkdir -p "$directory"
  {
    printf 'release=%s\n' "$release_id"
    printf 'plan_sha256=%s\n' "$plan_hash"
    printf 'result=%s\n' "$result"
    [[ -n "$step" ]] && printf 'step=%s\n' "$step"
    [[ -n "$failed_gate" ]] && printf 'failed_gate=%s\n' "$failed_gate"
    [[ -n "$reason" ]] && printf 'reason=%s\n' "$reason"
    [[ -n "$remote_exit_code" ]] && printf 'remote_exit_code=%s\n' "$remote_exit_code"
    printf 'recorded_at=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "$directory/deployment.txt.tmp"
  mv "$directory/deployment.txt.tmp" "$directory/deployment.txt"
  chmod 0640 "$directory/deployment.txt"
}

set_switch_gate() {
  SWITCH_STEP="$1"
  SWITCH_GATE="$2"
  SWITCH_GATE_REASON="$3"
  printf 'STEP=%s\nGATE=%s\n' "$SWITCH_STEP" "$SWITCH_GATE"
}

switch_exit_evidence() {
  local exit_code=$?
  trap - EXIT
  if [[ "$exit_code" -ne 0 && "$SWITCH_PREACTIVATION" == "1" ]]; then
    local reason="${LAST_FAILURE_REASON:-$SWITCH_GATE_REASON}"
    write_evidence "$SWITCH_EVIDENCE_RELEASE" "$SWITCH_EVIDENCE_PLAN" PRECHECK_FAILED \
      "$SWITCH_STEP" "$SWITCH_GATE" "$reason" "$exit_code" || true
    printf 'STEP=%s\nFAILED_GATE=%s\nREASON=%s\nREMOTE_EXIT_CODE=%s\n' \
      "$SWITCH_STEP" "$SWITCH_GATE" "$reason" "$exit_code" >&2
  fi
  exit "$exit_code"
}

rollback_application() {
  local plan="$1" previous_path previous_id env_snapshot
  local candidate_path bridge bridge_evidence
  previous_path="$(normalize_plan_path "$(manifest_field "$plan" previous.path)")"
  previous_id="$(manifest_field "$plan" previous.releaseId)"
  candidate_path="$(normalize_plan_path "$(manifest_field "$plan" candidatePath)")"
  env_snapshot="$(normalize_plan_path "$(manifest_field "$plan" rollback.environmentSnapshot)")"
  [[ -d "$previous_path" && -f "$env_snapshot" ]] || fail "automatische rollbackbron ontbreekt."
  bridge="$candidate_path/website/scripts/sportpaleis-domain-rollback-bridge.mjs"
  if [[ -f "$bridge" ]]; then
    service_stop
    bridge_evidence="$EVIDENCE_DIR/$(manifest_field "$plan" releaseId)/legacy-rollback-materialization.json"
    if ! (set -a; source "$ENV_FILE"; set +a; WBD_RELEASEBROKER_LOCK_HELD=true NODE_ENV=production node "$bridge") > "$bridge_evidence.tmp"; then
      rm -f -- "$bridge_evidence.tmp"
      service_restart || true
      fail "CRITICAL: domeinstaat kon niet atomair naar de legacy rollbackbron worden gematerialiseerd."
    fi
    mv "$bridge_evidence.tmp" "$bridge_evidence"
    chmod 0640 "$bridge_evidence"
  fi
  cp --preserve=mode,ownership,timestamps "$env_snapshot" "$ENV_FILE.rollback.tmp"
  mv -T "$ENV_FILE.rollback.tmp" "$ENV_FILE"
  atomic_link "$previous_path"
  service_restart
  verify_readiness "$previous_id" || fail "CRITICAL: rollback uitgevoerd maar readiness bleef rood."
}

command_inspect() {
  require_production_boundary
  verify_current_consistency
  local backup_info
  backup_info="$(verify_backup)"
  log "CURRENT_RELEASE=$(current_release_id)"
  log "CURRENT_PATH=$(current_release_path)"
  log "ENV_SHA256=$(sha256_file "$ENV_FILE")"
  log "BACKUP=$backup_info"
  log "INSPECT=PASS"
}

command_prepare() {
  require_production_boundary
  local artifact="" manifest="" expected_current="" assurance_evidence=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --artifact) artifact="$2"; shift 2;;
      --manifest) manifest="$2"; shift 2;;
      --expected-current) expected_current="$2"; shift 2;;
      --assurance-evidence) assurance_evidence="$2"; shift 2;;
      *) fail "onbekend prepare-argument: $1";;
    esac
  done
  [[ -n "$artifact" && -n "$manifest" && -n "$expected_current" ]] || fail "prepare-argumenten ontbreken."
  validate_release_id "$expected_current"
  verify_current_consistency
  [[ "$(current_release_id)" == "$expected_current" ]] || fail "actuele release wijkt af van preflightverwachting."
  verify_external_artifact "$artifact" "$manifest"
  verify_artifact_layout_contract "$artifact"
  local assurance_source_hash assurance_copy assurance_copy_hash
  assurance_source_hash="$(verify_production_shaped_assurance "$assurance_evidence" "$manifest" "$artifact")"

  local release_id commit tag artifact_hash candidate_path stage previous_path previous_id
  local backup_info rollback_info plan current_manifest_hash env_hash
  release_id="$(manifest_field "$manifest" releaseId)"
  commit="$(manifest_field "$manifest" commit)"
  tag="$(manifest_field "$manifest" tag)"
  artifact_hash="$(manifest_field "$manifest" artifactSha256 | tr '[:upper:]' '[:lower:]')"
  validate_release_id "$release_id"
  candidate_path="$RELEASES_DIR/$release_id"
  stage="$RELEASES_DIR/.${release_id}.stage.$$"
  plan="$PLAN_DIR/${release_id}.json"
  [[ ! -e "$candidate_path" && ! -e "$stage" && ! -e "$plan" ]] || fail "kandidaat of deployplan bestaat al."

  mkdir -p "$RELEASES_DIR" "$ROLLBACK_DIR" "$PLAN_DIR" "$EVIDENCE_DIR"
  acquire_lock
  backup_info="$(verify_backup)"
  previous_path="$(current_release_path)"
  previous_id="$(basename "$previous_path")"
  current_manifest_hash="$(sha256_file "$previous_path/RELEASE-MANIFEST.json")"
  env_hash="$(sha256_file "$ENV_FILE")"

  mkdir "$stage"
  trap 'remove_stage "$stage"' ERR
  tar -xzf "$artifact" -C "$stage"
  verify_release_tree "$stage" "$release_id" "$commit" "$tag" artifact
  normalize_production_layout "$stage"
  verify_release_tree "$stage" "$release_id" "$commit" "$tag" production
  install_locked_dependencies "$stage/website"
  verify_release_tree "$stage" "$release_id" "$commit" "$tag" production
  normalize_release_permissions "$stage"
  mv "$stage" "$candidate_path"
  trap - ERR

  mkdir -p "$EVIDENCE_DIR/$release_id"
  assurance_copy="$EVIDENCE_DIR/$release_id/predeploy-production-shaped-assurance.json"
  [[ ! -e "$assurance_copy" ]] || fail "immutable assurance-evidence bestaat al."
  cp "$assurance_evidence" "$assurance_copy.tmp"
  mv "$assurance_copy.tmp" "$assurance_copy"
  chmod 0640 "$assurance_copy"
  assurance_copy_hash="$(sha256_file "$assurance_copy")"
  [[ "$assurance_copy_hash" == "$assurance_source_hash" ]] || fail "assurance-evidence wijzigde tijdens prepare."

  rollback_info="$(create_rollback_set "$release_id" "$previous_path")"
  write_plan "$plan" "$release_id" "$commit" "$tag" "$artifact_hash" "$previous_path" "$previous_id" \
    "$current_manifest_hash" "$env_hash" "$backup_info" "$rollback_info" "$candidate_path" "$assurance_copy" "$assurance_copy_hash"
  verify_plan "$plan"
  verify_current_consistency
  [[ "$(current_release_id)" == "$expected_current" ]] || fail "prepare wijzigde onverwacht de actieve release."
  log "PREPARE=PASS"
  log "PLAN=$plan"
  log "PLAN_SHA256=$(sha256_file "$plan")"
  log "CANDIDATE=$candidate_path"
  log "ACTIVE_UNCHANGED=$expected_current"
  log "HUMAN_GO_REQUIRED=YES"
}

command_switch() {
  require_production_boundary
  local plan="" human_go=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --plan) plan="$2"; shift 2;;
      --human-go) human_go="$2"; shift 2;;
      *) fail "onbekend switch-argument: $1";;
    esac
  done
  [[ -n "$plan" && -n "$human_go" ]] || fail "switch vereist --plan en --human-go."
  validate_release_id "$human_go"
  set_switch_gate CORE_PREFLIGHT PLAN_CHECKSUM "Deployplan of checksum is ongeldig."
  verify_plan "$plan"
  local release_id candidate_path previous_path previous_id expected_env_hash expected_manifest_hash
  local rollback rollback_hash env_snapshot env_snapshot_hash
  local assurance_evidence assurance_hash
  release_id="$(manifest_field "$plan" releaseId)"
  validate_release_id "$release_id"
  SWITCH_EVIDENCE_RELEASE="$release_id"
  SWITCH_EVIDENCE_PLAN="$plan"
  SWITCH_PREACTIVATION=1
  trap switch_exit_evidence EXIT
  set_switch_gate CORE_PREFLIGHT HUMAN_GO_MATCH "Human GO komt niet overeen met het checksum-locked deployplan."
  [[ "$human_go" == "$release_id" ]] || fail "Human GO komt niet overeen met deployplan."
  set_switch_gate CORE_PREFLIGHT CANDIDATE_PATH "Kandidaatpad uit het deployplan is ongeldig."
  candidate_path="$(normalize_plan_path "$(manifest_field "$plan" candidatePath)")"
  set_switch_gate CORE_PREFLIGHT PREVIOUS_PATH "Vorige releasepad uit het deployplan is ongeldig."
  previous_path="$(normalize_plan_path "$(manifest_field "$plan" previous.path)")"
  previous_id="$(manifest_field "$plan" previous.releaseId)"
  expected_env_hash="$(manifest_field "$plan" productionEnvSha256)"
  expected_manifest_hash="$(manifest_field "$plan" previous.manifestSha256)"
  rollback="$(normalize_plan_path "$(manifest_field "$plan" rollback.artifact)")"
  rollback_hash="$(manifest_field "$plan" rollback.sha256)"
  env_snapshot="$(normalize_plan_path "$(manifest_field "$plan" rollback.environmentSnapshot)")"
  env_snapshot_hash="$(manifest_field "$plan" rollback.environmentSnapshotSha256)"
  assurance_evidence="$(normalize_plan_path "$(manifest_field "$plan" productionShapedAssurance.evidence)")"
  assurance_hash="$(manifest_field "$plan" productionShapedAssurance.sha256)"
  local actual_current
  set_switch_gate CORE_PREFLIGHT CURRENT_RELEASE "Actieve release wijkt af van het deployplan."
  actual_current="$(current_release_path)"
  [[ "$actual_current" == "$previous_path" ]] || fail "stale plan: current is gewijzigd (actueel=$actual_current, verwacht=$previous_path)."
  set_switch_gate CORE_PREFLIGHT CURRENT_MANIFEST "Manifest van de actieve release wijkt af van het deployplan."
  [[ "$(sha256_file "$previous_path/RELEASE-MANIFEST.json")" == "$expected_manifest_hash" ]] || fail "stale plan: huidig manifest is gewijzigd."
  set_switch_gate CORE_PREFLIGHT PRODUCTION_ENV "Productie-environment wijkt af van het deployplan."
  [[ "$(sha256_file "$ENV_FILE")" == "$expected_env_hash" ]] || fail "stale plan: productie-env is gewijzigd."
  set_switch_gate CORE_PREFLIGHT ROLLBACK_ARTIFACT "Rollbackartifact wijkt af van het deployplan."
  [[ "$(sha256_file "$rollback")" == "$rollback_hash" ]] || fail "rollbackartifact is gewijzigd."
  set_switch_gate CORE_PREFLIGHT ENVIRONMENT_SNAPSHOT "Rollback-environmentsnapshot wijkt af van het deployplan."
  [[ "$(sha256_file "$env_snapshot")" == "$env_snapshot_hash" ]] || fail "rollback-envsnapshot is gewijzigd."
  set_switch_gate CORE_PREFLIGHT PRODUCTION_SHAPED_ASSURANCE "Production-shaped assurance-evidence ontbreekt of is gewijzigd."
  [[ -f "$assurance_evidence" && "$(sha256_file "$assurance_evidence")" == "$assurance_hash" ]] || fail "production-shaped assurance-evidence is gewijzigd."
  set_switch_gate CORE_PREFLIGHT BACKUP_FRESHNESS "Actuele backup of backupchecksum voldoet niet."
  verify_backup >/dev/null
  set_switch_gate CORE_PREFLIGHT CURRENT_CONSISTENCY "Actieve symlink en RELEASE_ID zijn niet consistent."
  verify_current_consistency

  set_switch_gate CORE_PREFLIGHT DEPLOYMENT_LOCK "Een andere deployment houdt de lock vast."
  acquire_lock
  set_switch_gate CORE_PREFLIGHT CANDIDATE_MIGRATIONS "Additieve kandidaat-migraties zijn niet volledig toegepast."
  run_candidate_migrations "$candidate_path"
  SWITCH_PREACTIVATION=0
  set_switch_gate ACTIVATION ATOMIC_SWITCH "Kandidaatactivering is gestart."
  local switch_status=0
  set +e
  replace_release_id "$release_id" "$ENV_FILE" "$ENV_FILE"
  switch_status=$?
  if [[ "$switch_status" -eq 0 ]]; then atomic_link "$candidate_path"; switch_status=$?; fi
  if [[ "$switch_status" -eq 0 ]]; then service_restart; switch_status=$?; fi
  if [[ "$switch_status" -eq 0 ]]; then verify_readiness "$release_id"; switch_status=$?; fi
  if [[ "$switch_status" -eq 0 ]]; then verify_post_switch_smoke; switch_status=$?; fi
  if [[ "$switch_status" -eq 0 ]]; then write_evidence "$release_id" "$plan" PASS; switch_status=$?; fi
  set -e
  if [[ "$switch_status" -eq 0 ]]; then
    trap - EXIT
    log "SWITCH=PASS"
    log "ACTIVE_RELEASE=$release_id"
    return
  fi
  log "SWITCH_READINESS_OR_SMOKE=FAIL; AUTOMATIC_APPLICATION_ROLLBACK=STARTED" >&2
  rollback_application "$plan"
  write_evidence "$release_id" "$plan" ROLLED_BACK
  trap - EXIT
  fail "kandidaatswitch/readiness/smoke faalde; vorige applicatierelease is automatisch hersteld."
}

main() {
  require_command node
  require_command sha256sum
  require_command tar
  if [[ "$TEST_MODE" != "1" ]]; then require_command flock; fi
  local command="${1:-}"
  [[ -n "$command" ]] || { usage; exit 2; }
  shift
  case "$command" in
    inspect) command_inspect "$@";;
    prepare) command_prepare "$@";;
    switch) command_switch "$@";;
    -h|--help|help) usage;;
    *) usage; fail "onbekend commando: $command";;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
