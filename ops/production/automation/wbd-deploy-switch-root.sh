#!/usr/bin/env bash
set -Eeuo pipefail

tool=/usr/local/libexec/wbd-deployment/spw-immutable-release.sh
plan_dir=/srv/wbd/shared/deploy-plans
evidence_dir=/srv/wbd/shared/deploy-evidence

release_ok() { [[ "$1" =~ ^SPW-[A-Z0-9][A-Z0-9._-]{0,123}$ ]]; }
current_release_ok() { [[ "$1" =~ ^(SPW|WBD)-[A-Z0-9][A-Z0-9._-]{0,123}$ ]]; }
hash_ok() { [[ "$1" =~ ^[a-f0-9]{64}$ ]]; }
run_id_ok() { [[ "$1" =~ ^[0-9]{1,20}$ ]]; }
fail() { printf 'ERROR: %s\n' "$1" >&2; exit 1; }
sha() { sha256sum "$1" | awk '{print $1}'; }
plan_value() {
  node - "$1" "$2" <<'NODE'
const fs = require('fs');
const [file, dotted] = process.argv.slice(2);
let value = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const key of dotted.split('.')) value = value[key];
process.stdout.write(String(value));
NODE
}
read_common() {
  IFS= read -r release; IFS= read -r plan_sha; IFS= read -r run_id
  release_ok "$release" && hash_ok "$plan_sha" && run_id_ok "$run_id" || fail "ongeldige switch-input"
  plan="$plan_dir/$release.json"
  [[ -f "$plan" && -f "$plan.sha256" && "$(sha "$plan")" == "$plan_sha" ]] || fail "deployplan wijkt af"
  [[ "$(plan_value "$plan" releaseId)" == "$release" ]] || fail "release-ID wijkt af"
}
preflight() {
  local expected_current="$1" current_path current_id rollback rollback_sha env_snapshot env_sha candidate
  current_release_ok "$expected_current" || fail "ongeldige current release-ID"
  current_path="$(readlink -f /srv/wbd/current)"; current_id="$(basename "$current_path")"
  [[ "$current_id" == "$expected_current" && "$(plan_value "$plan" previous.path)" == "$current_path" ]] || fail "current release wijkt af"
  candidate="$(plan_value "$plan" candidatePath)"
  [[ "$candidate" == "/srv/wbd/releases/$release" && -f "$candidate/website/scripts/workspace-runtime.mjs" ]] || fail "kandidaat is niet staged"
  rollback="$(plan_value "$plan" rollback.artifact)"; rollback_sha="$(plan_value "$plan" rollback.sha256)"
  env_snapshot="$(plan_value "$plan" rollback.environmentSnapshot)"; env_sha="$(plan_value "$plan" rollback.environmentSnapshotSha256)"
  [[ -f "$rollback" && "$(sha "$rollback")" == "$rollback_sha" ]] || fail "rollbackartifact wijkt af"
  [[ -f "$env_snapshot" && "$(sha "$env_snapshot")" == "$env_sha" ]] || fail "environment snapshot wijkt af"
  "$tool" inspect >/dev/null
  printf 'SWITCH_PREFLIGHT=PASS\nRELEASE=%s\nDEPLOYPLAN_SHA256=%s\nWORKFLOW_RUN_ID=%s\n' "$release" "$plan_sha" "$run_id"
}

IFS= read -r command || fail "opdracht ontbreekt"
case "$command" in
  status) "$tool" inspect ;;
  evidence)
    IFS= read -r release
    release_ok "$release" || fail "ongeldige release-ID"
    evidence="$evidence_dir/$release/deployment.txt"
    [[ -f "$evidence" ]] || fail "deployment-evidence ontbreekt"
    cat "$evidence"
    ;;
  preflight)
    read_common
    IFS= read -r expected_current
    preflight "$expected_current"
    ;;
  switch)
    read_common
    IFS= read -r human_go
    [[ "$human_go" == "$release" ]] || fail "Human GO wijkt af"
    expected_current="$(plan_value "$plan" previous.releaseId)"
    preflight "$expected_current" >/dev/null
    logger -p authpriv.notice -t wbd-deploy-automation -- "activation=approved release=$release plan_sha256=$plan_sha workflow_run_id=$run_id"
    "$tool" switch --plan "$plan" --human-go "$human_go"
    ;;
  *) fail "switch-root opdracht geweigerd" ;;
esac
