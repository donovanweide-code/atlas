#!/usr/bin/env bash
set -Eeuo pipefail

tool=/usr/local/libexec/wbd-deployment/spw-immutable-release.sh
incoming=/srv/wbd/incoming
inputs=/srv/wbd/shared/deploy-inputs
plan_dir=/srv/wbd/shared/deploy-plans

release_ok() { [[ "$1" =~ ^SPW-[A-Z0-9][A-Z0-9._-]{0,123}$ ]]; }
current_release_ok() { [[ "$1" =~ ^(SPW|WBD)-[A-Z0-9][A-Z0-9._-]{0,123}$ ]]; }
hash_ok() { [[ "$1" =~ ^[a-f0-9]{64}$ ]]; }
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
verify_plan_state() {
  local release="$1" expected_sha="$2" plan="$plan_dir/$release.json"
  [[ -f "$plan" && -f "$plan.sha256" ]] || fail "deployplan ontbreekt"
  [[ "$(sha "$plan")" == "$expected_sha" ]] || fail "deployplan-SHA wijkt af"
  [[ "$(plan_value "$plan" releaseId)" == "$release" ]] || fail "release-ID wijkt af"
  local candidate rollback rollback_sha env_snapshot env_sha backup backup_sha
  candidate="$(plan_value "$plan" candidatePath)"
  rollback="$(plan_value "$plan" rollback.artifact)"
  rollback_sha="$(plan_value "$plan" rollback.sha256)"
  env_snapshot="$(plan_value "$plan" rollback.environmentSnapshot)"
  env_sha="$(plan_value "$plan" rollback.environmentSnapshotSha256)"
  backup="$(plan_value "$plan" backup.path)"
  backup_sha="$(plan_value "$plan" backup.sha256)"
  [[ "$candidate" == "/srv/wbd/releases/$release" && -d "$candidate" ]] || fail "staged kandidaat ontbreekt"
  [[ -f "$rollback" && "$(sha "$rollback")" == "$rollback_sha" ]] || fail "rollbackartifact wijkt af"
  [[ -f "$env_snapshot" && "$(sha "$env_snapshot")" == "$env_sha" ]] || fail "environment snapshot wijkt af"
  [[ -f "$backup" && "$(sha "$backup")" == "$backup_sha" ]] || fail "plan-backup wijkt af"
  "$tool" inspect >/dev/null
  printf 'PREPARE=PASS\nRELEASE=%s\nDEPLOYPLAN_SHA256=%s\n' "$release" "$expected_sha"
}

IFS= read -r command || fail "opdracht ontbreekt"
case "$command" in
  backup)
    systemctl start wbd-mariadb-backup.service
    systemctl is-active --quiet mariadb.service || fail "MariaDB is niet actief"
    "$tool" inspect
    printf 'BACKUP=PASS\n'
    ;;
  status)
    "$tool" inspect
    ;;
  prepare)
    IFS= read -r release; IFS= read -r expected_current; IFS= read -r artifact_sha; IFS= read -r manifest_sha
    release_ok "$release" && current_release_ok "$expected_current" || fail "ongeldige release-ID"
    hash_ok "$artifact_sha" && hash_ok "$manifest_sha" || fail "ongeldige SHA-256"
    artifact="$incoming/$release.tar.gz"; manifest="$incoming/$release.manifest.json"
    [[ -f "$artifact" && ! -L "$artifact" && "$(sha "$artifact")" == "$artifact_sha" ]] || fail "artifact wijkt af"
    [[ -f "$manifest" && ! -L "$manifest" && "$(sha "$manifest")" == "$manifest_sha" ]] || fail "manifest wijkt af"
    install -d -o root -g root -m 0700 "$inputs/$release"
    install -o root -g root -m 0600 "$artifact" "$inputs/$release/$release.tar.gz"
    install -o root -g root -m 0600 "$manifest" "$inputs/$release/$release.manifest.json"
    "$tool" prepare --artifact "$inputs/$release/$release.tar.gz" --manifest "$inputs/$release/$release.manifest.json" --expected-current "$expected_current"
    ;;
  verify)
    IFS= read -r release; IFS= read -r plan_sha
    release_ok "$release" && hash_ok "$plan_sha" || fail "ongeldige verificatie-input"
    verify_plan_state "$release" "$plan_sha"
    ;;
  *) fail "prepare-root opdracht geweigerd" ;;
esac
