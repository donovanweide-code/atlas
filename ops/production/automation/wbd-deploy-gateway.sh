#!/usr/bin/env bash
set -Eeuo pipefail

role="${1:?forced-command rol ontbreekt}"
prepare_root=/usr/local/libexec/wbd-deployment/wbd-deploy-prepare-root
switch_root=/usr/local/libexec/wbd-deployment/wbd-deploy-switch-root
incoming=/srv/wbd/incoming
original="${SSH_ORIGINAL_COMMAND:-}"

release_ok() { [[ "$1" =~ ^SPW-[A-Z0-9][A-Z0-9._-]{0,123}$ ]]; }
hash_ok() { [[ "$1" =~ ^[a-f0-9]{64}$ ]]; }
run_id_ok() { [[ "$1" =~ ^[0-9]{1,20}$ ]]; }
deny() { printf 'DENIED: %s\n' "$1" >&2; exit 64; }
audit() { logger -p authpriv.notice -t wbd-deploy-automation -- "role=$role user=${USER:-unknown} command=$1"; }

IFS=' ' read -r command arg1 arg2 arg3 arg4 extra <<<"$original"
[[ -z "${extra:-}" ]] || deny "te veel argumenten"

case "$role:$command" in
  prepare:upload-artifact|prepare:upload-manifest)
    release_ok "${arg1:-}" || deny "ongeldige release-ID"
    hash_ok "${arg2:-}" || deny "ongeldige SHA-256"
    [[ "${arg3:-}" =~ ^[0-9]{1,9}$ ]] || deny "ongeldige bestandsgrootte"
    (( arg3 > 0 && arg3 <= 268435456 )) || deny "bestandsgrootte buiten grens"
    suffix=tar.gz
    [[ "$command" == upload-manifest ]] && suffix=manifest.json
    destination="$incoming/$arg1.$suffix"
    temporary="$incoming/.$arg1.$suffix.upload.$$"
    [[ ! -e "$temporary" ]] || deny "onvolledige upload bestaat al"
    if [[ -f "$destination" && ! -L "$destination" ]]; then
      [[ "$(stat -c %s "$destination")" == "$arg3" ]] || deny "bestaande uploadgrootte wijkt af"
      [[ "$(sha256sum "$destination" | awk '{print $1}')" == "$arg2" ]] || deny "bestaande uploadchecksum wijkt af"
      audit "$command release=$arg1 sha256=$arg2 bytes=$arg3 already_present=yes"
      printf 'UPLOAD=PASS\nALREADY_PRESENT=YES\nRELEASE=%s\nSHA256=%s\n' "$arg1" "$arg2"
      exit 0
    fi
    [[ ! -e "$destination" ]] || deny "uploadbestemming is ongeldig"
    umask 077
    head -c "$arg3" >"$temporary"
    [[ "$(stat -c %s "$temporary")" == "$arg3" ]] || { rm -f -- "$temporary"; deny "upload is afgebroken"; }
    [[ "$(sha256sum "$temporary" | awk '{print $1}')" == "$arg2" ]] || { rm -f -- "$temporary"; deny "uploadchecksum wijkt af"; }
    mv -T "$temporary" "$destination"
    audit "$command release=$arg1 sha256=$arg2 bytes=$arg3"
    printf 'UPLOAD=PASS\nRELEASE=%s\nSHA256=%s\n' "$arg1" "$arg2"
    ;;
  prepare:backup)
    [[ -z "${arg1:-}" ]] || deny "backup accepteert geen argumenten"
    audit backup
    printf 'backup\n' | sudo -n "$prepare_root"
    ;;
  prepare:prepare)
    release_ok "${arg1:-}" || deny "ongeldige release-ID"
    release_ok "${arg2:-}" || deny "ongeldige current release-ID"
    hash_ok "${arg3:-}" || deny "ongeldige artifact-SHA"
    hash_ok "${arg4:-}" || deny "ongeldige manifest-SHA"
    audit "prepare release=$arg1 expected_current=$arg2 artifact_sha256=$arg3 manifest_sha256=$arg4"
    printf 'prepare\n%s\n%s\n%s\n%s\n' "$arg1" "$arg2" "$arg3" "$arg4" | sudo -n "$prepare_root"
    ;;
  prepare:verify)
    release_ok "${arg1:-}" || deny "ongeldige release-ID"
    hash_ok "${arg2:-}" || deny "ongeldige deployplan-SHA"
    [[ -z "${arg3:-}" ]] || deny "verify accepteert twee argumenten"
    audit "verify release=$arg1 plan_sha256=$arg2"
    printf 'verify\n%s\n%s\n' "$arg1" "$arg2" | sudo -n "$prepare_root"
    ;;
  prepare:status)
    [[ -z "${arg1:-}" ]] || deny "status accepteert geen argumenten"
    audit status
    printf 'status\n' | sudo -n "$prepare_root"
    ;;
  switch:preflight)
    release_ok "${arg1:-}" || deny "ongeldige release-ID"
    hash_ok "${arg2:-}" || deny "ongeldige deployplan-SHA"
    release_ok "${arg3:-}" || deny "ongeldige current release-ID"
    run_id_ok "${arg4:-}" || deny "ongeldige workflow-run-ID"
    audit "preflight release=$arg1 plan_sha256=$arg2 expected_current=$arg3 run_id=$arg4"
    # Root helper consumes release, plan SHA and workflow run ID as the
    # common envelope; expected-current is the operation-specific value.
    printf 'preflight\n%s\n%s\n%s\n%s\n' "$arg1" "$arg2" "$arg4" "$arg3" | sudo -n "$switch_root"
    ;;
  switch:switch)
    release_ok "${arg1:-}" || deny "ongeldige release-ID"
    hash_ok "${arg2:-}" || deny "ongeldige deployplan-SHA"
    run_id_ok "${arg3:-}" || deny "ongeldige workflow-run-ID"
    [[ "$arg4" == "$arg1" ]] || deny "Human GO wijkt af van release-ID"
    audit "switch release=$arg1 plan_sha256=$arg2 run_id=$arg3 human_go=$arg4"
    printf 'switch\n%s\n%s\n%s\n%s\n' "$arg1" "$arg2" "$arg3" "$arg4" | sudo -n "$switch_root"
    ;;
  switch:status)
    [[ -z "${arg1:-}" ]] || deny "status accepteert geen argumenten"
    audit status
    printf 'status\n' | sudo -n "$switch_root"
    ;;
  switch:evidence)
    release_ok "${arg1:-}" || deny "ongeldige release-ID"
    [[ -z "${arg2:-}" ]] || deny "evidence accepteert één argument"
    audit "evidence release=$arg1"
    printf 'evidence\n%s\n' "$arg1" | sudo -n "$switch_root"
    ;;
  *) deny "commando niet toegestaan voor deze identity" ;;
esac
