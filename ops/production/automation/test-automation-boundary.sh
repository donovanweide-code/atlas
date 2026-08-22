#!/usr/bin/env bash
set -Eeuo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for script in \
  "$root/wbd-deploy-gateway.sh" \
  "$root/wbd-deploy-prepare-root.sh" \
  "$root/wbd-deploy-switch-root.sh" \
  "$root/bootstrap-wbd-deployment-automation.sh"; do
  bash -n "$script"
done

grep -Fq 'prepare:switch' "$root/wbd-deploy-gateway.sh" && { printf 'prepare bevat onverwachte switchroute\n' >&2; exit 1; } || true
grep -Fq 'switch:upload-' "$root/wbd-deploy-gateway.sh" && { printf 'switch bevat onverwachte uploadroute\n' >&2; exit 1; } || true
grep -Fq 'wbdprepare ALL=(root) NOPASSWD: /usr/local/libexec/wbd-deployment/wbd-deploy-prepare-root' "$root/91-wbd-deployment-automation.sudoers"
grep -Fq 'wbdswitch ALL=(root) NOPASSWD: /usr/local/libexec/wbd-deployment/wbd-deploy-switch-root' "$root/91-wbd-deployment-automation.sudoers"
! grep -Eq 'NOPASSWD:[[:space:]]*(ALL|/bin/(ba)?sh|/usr/bin/(ba)?sh)' "$root/91-wbd-deployment-automation.sudoers"
grep -Fq 'DisableForwarding yes' "$root/61-wbd-deployment-automation.sshd.conf"
grep -Fq 'PermitTTY no' "$root/61-wbd-deployment-automation.sshd.conf"
grep -Fq 'ForceCommand /usr/local/libexec/wbd-deployment/wbd-deploy-gateway prepare' "$root/61-wbd-deployment-automation.sshd.conf"
grep -Fq 'ForceCommand /usr/local/libexec/wbd-deployment/wbd-deploy-gateway switch' "$root/61-wbd-deployment-automation.sshd.conf"
grep -Fq '"$arg1" "$arg2" "$arg4" "$arg3"' "$root/wbd-deploy-gateway.sh"
! grep -R -Eq 'database.*restore|mariadb.*restore|mysql.*restore' "$root" --include='*.sh'

printf 'SYNTAX=PASS\nROLE_SEPARATION=PASS\nSUDO_BOUNDARY=PASS\nSSH_BOUNDARY=PASS\nAUTOMATIC_DATABASE_RESTORE=ABSENT\n'
