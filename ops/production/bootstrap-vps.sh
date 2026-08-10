#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get -y dist-upgrade
apt-get install -y \
  ca-certificates curl fail2ban gnupg jq logrotate mariadb-client \
  mariadb-server nginx openssl rsync tar ufw unattended-upgrades

install -d -m 0755 /usr/share/keyrings
node_key_tmp=$(mktemp)
trap 'rm -f "${node_key_tmp}"' EXIT
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key -o "${node_key_tmp}"
gpg --batch --yes --dearmor -o /usr/share/keyrings/nodesource.gpg "${node_key_tmp}"
cat >/etc/apt/sources.list.d/nodesource.list <<'EOF'
deb [signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main
EOF
apt-get update
apt-get install -y nodejs

timedatectl set-timezone Europe/Amsterdam
hostnamectl set-hostname wbd-platform-prod
if grep -qE '^127\.0\.1\.1[[:space:]]' /etc/hosts; then
  sed -i -E 's/^127\.0\.1\.1[[:space:]].*$/127.0.1.1 wbd-platform-prod/' /etc/hosts
else
  printf '127.0.1.1 wbd-platform-prod\n' >>/etc/hosts
fi

if ! id wbdapp >/dev/null 2>&1; then
  useradd --system --home-dir /srv/wbd --create-home --shell /usr/sbin/nologin wbdapp
fi

install -d -o root -g root -m 0755 /srv/wbd
install -d -o wbdapp -g wbdapp -m 0750 \
  /srv/wbd/releases \
  /srv/wbd/shared \
  /srv/wbd/shared/config \
  /srv/wbd/shared/log
install -d -o root -g root -m 0700 /etc/wbd
install -d -o root -g root -m 0700 /var/backups/wbd-mariadb

cat >/etc/ssh/sshd_config.d/60-wbd-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
X11Forwarding no
AllowUsers wbdops
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
sshd -t
if systemctl is-active --quiet ssh.service; then
  systemctl reload ssh.service
elif systemctl is-active --quiet ssh.socket; then
  systemctl restart ssh.socket
fi

cat >/etc/fail2ban/jail.d/wbd-sshd.conf <<'EOF'
[sshd]
enabled = true
maxretry = 4
findtime = 10m
bantime = 1h
EOF
systemctl enable --now fail2ban

cat >/etc/apt/apt.conf.d/52wbd-unattended-upgrades-local <<'EOF'
APT::Periodic::Enable "1";
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
Unattended-Upgrade::Automatic-Reboot "false";
EOF
systemctl enable --now unattended-upgrades

cat >/etc/mysql/mariadb.conf.d/60-wbd-hardening.cnf <<'EOF'
[mariadb]
bind-address = 127.0.0.1
skip-name-resolve
max_connections = 80
slow_query_log = 1
long_query_time = 1
slow_query_log_file = /var/log/mysql/mariadb-slow.log
EOF
systemctl enable --now mariadb
systemctl restart mariadb

if [[ ! -f /etc/wbd/production.env ]]; then
  umask 0077
  workspace_password=$(openssl rand -hex 32)
  atlas_password=$(openssl rand -hex 32)
  migrator_password=$(openssl rand -hex 32)
  cat >/etc/wbd/production.env <<EOF
WORKSPACE_DB_NAME=wbd_workspace
WORKSPACE_DB_USER=wbd_workspace_app
WORKSPACE_DB_PASSWORD=${workspace_password}
ATLAS_DB_NAME=wbd_atlas
ATLAS_DB_USER=wbd_atlas_app
ATLAS_DB_PASSWORD=${atlas_password}
MIGRATOR_DB_USER=wbd_migrator
MIGRATOR_DB_PASSWORD=${migrator_password}
EOF
  unset workspace_password atlas_password migrator_password
fi
chown root:wbdapp /etc/wbd/production.env
chmod 0640 /etc/wbd/production.env

set -a
# shellcheck disable=SC1091
source /etc/wbd/production.env
set +a
mariadb --protocol=socket <<SQL
CREATE DATABASE IF NOT EXISTS \`${WORKSPACE_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS \`${ATLAS_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${WORKSPACE_DB_USER}'@'localhost' IDENTIFIED BY '${WORKSPACE_DB_PASSWORD}';
ALTER USER '${WORKSPACE_DB_USER}'@'localhost' IDENTIFIED BY '${WORKSPACE_DB_PASSWORD}';
CREATE USER IF NOT EXISTS '${ATLAS_DB_USER}'@'localhost' IDENTIFIED BY '${ATLAS_DB_PASSWORD}';
ALTER USER '${ATLAS_DB_USER}'@'localhost' IDENTIFIED BY '${ATLAS_DB_PASSWORD}';
CREATE USER IF NOT EXISTS '${MIGRATOR_DB_USER}'@'localhost' IDENTIFIED BY '${MIGRATOR_DB_PASSWORD}';
ALTER USER '${MIGRATOR_DB_USER}'@'localhost' IDENTIFIED BY '${MIGRATOR_DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`${WORKSPACE_DB_NAME}\`.* TO '${WORKSPACE_DB_USER}'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`${ATLAS_DB_NAME}\`.* TO '${ATLAS_DB_USER}'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, CREATE VIEW, SHOW VIEW, TRIGGER, EVENT ON \`${WORKSPACE_DB_NAME}\`.* TO '${MIGRATOR_DB_USER}'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, CREATE VIEW, SHOW VIEW, TRIGGER, EVENT ON \`${ATLAS_DB_NAME}\`.* TO '${MIGRATOR_DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
unset WORKSPACE_DB_PASSWORD ATLAS_DB_PASSWORD MIGRATOR_DB_PASSWORD

if [[ ! -f /etc/wbd/backup.key ]]; then
  umask 0077
  openssl rand -hex 32 >/etc/wbd/backup.key
fi
chown root:root /etc/wbd/backup.key
chmod 0600 /etc/wbd/backup.key

cat >/usr/local/sbin/wbd-mariadb-backup <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail
backup_dir=/var/backups/wbd-mariadb
stamp=$(date -u +%Y%m%dT%H%M%SZ)
plain_tmp=$(mktemp "${backup_dir}/.${stamp}.XXXXXX.sql")
encrypted_final="${backup_dir}/wbd-mariadb-${stamp}.sql.enc"
cleanup() {
  rm -f "${plain_tmp}"
}
trap cleanup EXIT
chmod 0600 "${plain_tmp}"
mariadb-dump --protocol=socket --single-transaction --routines --events --triggers --hex-blob \
  --databases wbd_workspace wbd_atlas >"${plain_tmp}"
openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt \
  -in "${plain_tmp}" -out "${encrypted_final}" -pass file:/etc/wbd/backup.key
chmod 0600 "${encrypted_final}"
sha256sum "${encrypted_final}" >"${encrypted_final}.sha256"
chmod 0600 "${encrypted_final}.sha256"
find "${backup_dir}" -maxdepth 1 -type f -name 'wbd-mariadb-*.sql.enc' -mtime +14 -delete
find "${backup_dir}" -maxdepth 1 -type f -name 'wbd-mariadb-*.sql.enc.sha256' -mtime +14 -delete
EOF
chmod 0750 /usr/local/sbin/wbd-mariadb-backup

cat >/etc/systemd/system/wbd-mariadb-backup.service <<'EOF'
[Unit]
Description=WBD encrypted MariaDB logical backup
After=mariadb.service
Requires=mariadb.service

[Service]
Type=oneshot
User=root
Group=root
ExecStart=/usr/local/sbin/wbd-mariadb-backup
PrivateTmp=true
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/backups/wbd-mariadb
ReadOnlyPaths=/etc/wbd /var/lib/mysql /run/mysqld
EOF

cat >/etc/systemd/system/wbd-mariadb-backup.timer <<'EOF'
[Unit]
Description=Daily WBD encrypted MariaDB logical backup

[Timer]
OnCalendar=*-*-* 02:20:00 Europe/Amsterdam
RandomizedDelaySec=15m
Persistent=true
Unit=wbd-mariadb-backup.service

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now wbd-mariadb-backup.timer
systemctl start wbd-mariadb-backup.service

cat >/etc/nginx/sites-available/wbd-infrastructure <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    access_log /var/log/nginx/wbd-infrastructure-access.log;
    error_log /var/log/nginx/wbd-infrastructure-error.log warn;

    location = /healthz {
        default_type application/json;
        add_header Cache-Control "no-store" always;
        return 200 '{"status":"ok","boundary":"wbd-infrastructure"}\n';
    }

    location = /readyz {
        default_type application/json;
        add_header Cache-Control "no-store" always;
        return 503 '{"status":"not_ready","reason":"application_not_deployed"}\n';
    }

    location / {
        return 404;
    }
}
EOF
rm -f /etc/nginx/sites-enabled/default
ln -sfn /etc/nginx/sites-available/wbd-infrastructure /etc/nginx/sites-enabled/wbd-infrastructure
nginx -t
systemctl enable --now nginx
systemctl reload nginx

cat >/etc/logrotate.d/wbd-application <<'EOF'
/srv/wbd/shared/log/*.log {
    daily
    rotate 14
    missingok
    notifempty
    compress
    delaycompress
    copytruncate
    su wbdapp wbdapp
}
EOF

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH key-only operations'
ufw allow 80/tcp comment 'HTTP health and future ACME redirect'
ufw allow 443/tcp comment 'HTTPS Workspace'
ufw --force enable

systemctl enable nginx mariadb ssh fail2ban unattended-upgrades

echo "WBD VPS baseline completed."
