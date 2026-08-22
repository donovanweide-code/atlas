#!/usr/bin/env bash
set -Eeuo pipefail

[[ "$(id -u)" == 0 ]] || { printf 'root vereist\n' >&2; exit 1; }

source_dir="${1:?bronmap ontbreekt}"
prepare_public="${2:?prepare public key ontbreekt}"
switch_public="${3:?switch public key ontbreekt}"
immutable_tool="${4:?immutable deploytool ontbreekt}"
probe_public="${5:-}"
install_root=/usr/local/libexec/wbd-deployment
evidence_root=/var/lib/wbd-deployment
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
evidence="$evidence_root/bootstrap-$stamp.txt"

for file in \
  "$source_dir/wbd-deploy-gateway.sh" \
  "$source_dir/wbd-deploy-prepare-root.sh" \
  "$source_dir/wbd-deploy-switch-root.sh" \
  "$source_dir/91-wbd-deployment-automation.sudoers" \
  "$source_dir/61-wbd-deployment-automation.sshd.conf" \
  "$prepare_public" "$switch_public" "$immutable_tool"; do
  [[ -f "$file" && ! -L "$file" ]] || { printf 'ongeldige bootstrapbron: %s\n' "$file" >&2; exit 1; }
done
if [[ -n "$probe_public" ]]; then
  [[ -f "$probe_public" && ! -L "$probe_public" ]] || { printf 'ongeldige revocation-probebron\n' >&2; exit 1; }
fi

key_line() {
  local file="$1" type
  type="$(awk 'NR==1 {print $1}' "$file")"
  [[ "$type" == ssh-ed25519 ]] || { printf 'uitsluitend Ed25519 toegestaan: %s\n' "$file" >&2; exit 1; }
  ssh-keygen -lf "$file" -E sha256 >/dev/null
  awk 'NR==1 {print $1 " " $2 " " ($3 == "" ? "wbd-deployment-automation" : $3)}' "$file"
}

prepare_key="$(key_line "$prepare_public")"
switch_key="$(key_line "$switch_public")"
probe_key=""
[[ -z "$probe_public" ]] || probe_key="$(key_line "$probe_public")"
prepare_fingerprint="$(ssh-keygen -lf "$prepare_public" -E sha256 | awk '{print $2}')"
switch_fingerprint="$(ssh-keygen -lf "$switch_public" -E sha256 | awk '{print $2}')"
[[ "$prepare_fingerprint" != "$switch_fingerprint" ]] || { printf 'prepare- en switchkey moeten verschillen\n' >&2; exit 1; }

break_glass_file=/home/wbdadmin/.ssh/authorized_keys
[[ -f "$break_glass_file" ]] || { printf 'wbdadmin authorized_keys ontbreekt\n' >&2; exit 1; }
break_glass_before="$(sha256sum "$break_glass_file" | awk '{print $1}')"

for account in wbdprepare wbdswitch; do
  if ! id "$account" >/dev/null 2>&1; then
    useradd --create-home --home-dir "/var/lib/$account" --shell /bin/bash "$account"
  fi
  passwd -l "$account" >/dev/null
  install -d -o "$account" -g "$account" -m 0700 "/var/lib/$account/.ssh"
done

install -d -o root -g root -m 0755 "$install_root"
install -d -o root -g root -m 0700 "$evidence_root"
install -d -o wbdprepare -g wbdprepare -m 0700 /srv/wbd/incoming
install -o root -g root -m 0755 "$source_dir/wbd-deploy-gateway.sh" "$install_root/wbd-deploy-gateway"
install -o root -g root -m 0755 "$source_dir/wbd-deploy-prepare-root.sh" "$install_root/wbd-deploy-prepare-root"
install -o root -g root -m 0755 "$source_dir/wbd-deploy-switch-root.sh" "$install_root/wbd-deploy-switch-root"
install -o root -g root -m 0755 "$immutable_tool" "$install_root/spw-immutable-release.sh"

printf 'restrict,command="%s prepare" %s\n' "$install_root/wbd-deploy-gateway" "$prepare_key" \
  | install -o wbdprepare -g wbdprepare -m 0600 /dev/stdin /var/lib/wbdprepare/.ssh/authorized_keys
if [[ -n "$probe_key" ]]; then
  printf 'restrict,command="%s prepare" %s\n' "$install_root/wbd-deploy-gateway" "$probe_key" \
    >> /var/lib/wbdprepare/.ssh/authorized_keys
  chown wbdprepare:wbdprepare /var/lib/wbdprepare/.ssh/authorized_keys
  chmod 0600 /var/lib/wbdprepare/.ssh/authorized_keys
fi
printf 'restrict,command="%s switch" %s\n' "$install_root/wbd-deploy-gateway" "$switch_key" \
  | install -o wbdswitch -g wbdswitch -m 0600 /dev/stdin /var/lib/wbdswitch/.ssh/authorized_keys

install -o root -g root -m 0440 "$source_dir/91-wbd-deployment-automation.sudoers" /etc/sudoers.d/91-wbd-deployment-automation
install -o root -g root -m 0644 "$source_dir/61-wbd-deployment-automation.sshd.conf" /etc/ssh/sshd_config.d/61-wbd-deployment-automation.conf
printf 'AllowUsers wbdprepare wbdswitch\n' > /etc/ssh/sshd_config.d/59-wbd-deployment-automation-allow.conf
chmod 0644 /etc/ssh/sshd_config.d/59-wbd-deployment-automation-allow.conf

visudo -cf /etc/sudoers >/dev/null
sshd -t
for account in wbdprepare wbdswitch; do
  effective="$(sshd -T -C "user=$account,host=wbd-platform-prod,addr=127.0.0.1")"
  grep -Fxq 'permittty no' <<<"$effective"
  grep -Fxq 'disableforwarding yes' <<<"$effective"
  grep -Fq "forcecommand $install_root/wbd-deploy-gateway" <<<"$effective"
done
systemctl reload ssh.service

break_glass_after="$(sha256sum "$break_glass_file" | awk '{print $1}')"
[[ "$break_glass_after" == "$break_glass_before" ]] || { printf 'wbdadmin authorized_keys veranderde onverwacht\n' >&2; exit 1; }

{
  printf 'schema=WBD_DEPLOYMENT_AUTOMATION_BOOTSTRAP_V1\n'
  printf 'timestamp=%s\n' "$stamp"
  printf 'prepare_account=wbdprepare\nprepare_fingerprint=%s\n' "$prepare_fingerprint"
  printf 'switch_account=wbdswitch\nswitch_fingerprint=%s\n' "$switch_fingerprint"
  printf 'gateway_sha256=%s\n' "$(sha256sum "$install_root/wbd-deploy-gateway" | awk '{print $1}')"
  printf 'prepare_root_sha256=%s\n' "$(sha256sum "$install_root/wbd-deploy-prepare-root" | awk '{print $1}')"
  printf 'switch_root_sha256=%s\n' "$(sha256sum "$install_root/wbd-deploy-switch-root" | awk '{print $1}')"
  printf 'immutable_tool_sha256=%s\n' "$(sha256sum "$install_root/spw-immutable-release.sh" | awk '{print $1}')"
  printf 'wbdadmin_authorized_keys_sha256=%s\n' "$break_glass_after"
  printf 'visudo=PASS\nsshd=PASS\nbreak_glass_unchanged=PASS\n'
} > "$evidence"
chmod 0600 "$evidence"
printf 'AUTOMATION_BOOTSTRAP=PASS\nPREPARE_FINGERPRINT=%s\nSWITCH_FINGERPRINT=%s\nEVIDENCE=%s\n' \
  "$prepare_fingerprint" "$switch_fingerprint" "$evidence"
