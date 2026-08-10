#!/usr/bin/env bash
set -Eeuo pipefail

failures=0
check() {
  local label=$1
  shift
  if "$@" >/dev/null 2>&1; then
    printf 'PASS %s\n' "${label}"
  else
    printf 'FAIL %s\n' "${label}"
    failures=$((failures + 1))
  fi
}

check timezone test "$(timedatectl show -p Timezone --value)" = "Europe/Amsterdam"
check hostname test "$(hostname)" = "wbd-platform-prod"
check ssh_config sudo sshd -t
check root_login_disabled sudo grep -Eq '^PermitRootLogin no$' /etc/ssh/sshd_config.d/60-wbd-hardening.conf
check password_login_disabled sudo grep -Eq '^PasswordAuthentication no$' /etc/ssh/sshd_config.d/60-wbd-hardening.conf
check firewall bash -c "sudo ufw status | grep -qx 'Status: active'"
check nginx systemctl is-active --quiet nginx
check mariadb systemctl is-active --quiet mariadb
check fail2ban systemctl is-active --quiet fail2ban
check unattended_upgrades systemctl is-enabled --quiet unattended-upgrades
check backup_timer systemctl is-enabled --quiet wbd-mariadb-backup.timer
check backup_file sudo find /var/backups/wbd-mariadb -maxdepth 1 -type f -name 'wbd-mariadb-*.sql.enc' -size +0c -print -quit
check workspace_db bash -c "sudo mariadb --protocol=socket --batch --skip-column-names -e \"SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='wbd_workspace'\" | grep -qx wbd_workspace"
check atlas_db bash -c "sudo mariadb --protocol=socket --batch --skip-column-names -e \"SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='wbd_atlas'\" | grep -qx wbd_atlas"
check node22 bash -c 'node --version | grep -Eq "^v22\."'
check health_local curl -fsS http://127.0.0.1/healthz
check readiness_closed bash -c 'test "$(curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1/readyz)" = 503'
check mariadb_local_only bash -c '! ss -lnt | grep -E "(^|[[:space:]])(0\.0\.0\.0|\[::\]):3306([[:space:]]|$)"'

printf 'SUMMARY failures=%d\n' "${failures}"
exit "${failures}"
