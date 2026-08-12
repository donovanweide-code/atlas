# WBD production access register

Status: active human recovery access; all temporary deployment access revoked after the 2026-08-12 Sportpaleis production deployment.

Target: `wbd-platform-prod` (`149.210.228.199`)

## Identities

| Account | Ownership and purpose | Public-key fingerprint | Authentication | Privilege | Status |
| --- | --- | --- | --- | --- | --- |
| `wbdadmin` | Permanent, human-controlled WBD/Donovan production recovery | `SHA256:ce+eZH8kJDlo1LWl9swrGcGgTPWSDHo+TKsvilU5YBA` | Ed25519 public key; account password locked | `sudo` through `/etc/sudoers.d/90-wbdadmin` | Active |
| `wbdops` | Pre-existing production access identity; preserve until ownership and lifecycle are separately reconciled | `SHA256:HFSv3Cd7H6FyjvtCcW4HgjDD2F8OWyGF/QOLN4LrqWw` | Ed25519 public key | No `sudo` group observed on 2026-08-12 | Active, pre-existing |
| `wbddeploy` | Temporary RC-005/Sportpaleis deployment identity | `SHA256:B3THiznBDc8kWVCo8Xzj59eZFEiHsEMFBuSkRQv0xFY` | Separate Ed25519 public key; account password locked | Temporary `sudo` through `/etc/sudoers.d/91-wbddeploy-temporary` | Revoked after rollback |
| `wbddeploy` | Temporary `SPW-FINAL-PILOT-REMEDIATION-001-20260812` deployment identity | `SHA256:LFqT1B8qnWe3hQDACmwXJwWYdyoioNZTQDbhHW+GuGc` | Separate Ed25519 public key; account password locked | Time-boxed `sudo` through `/etc/sudoers.d/91-wbddeploy-temporary` | Revoked after production PASS; rejected with exit 255; local copies removed |

The permanent private key belongs in Donovan-controlled encrypted storage outside Git, project documentation, Workspace data and Codex output. Temporary deployment private keys must never replace the permanent recovery key and must be destroyed after revocation.

## Effective SSH boundary

- `PermitRootLogin no`
- `PasswordAuthentication no`
- `KbdInteractiveAuthentication no`
- `PubkeyAuthentication yes`
- Allowed permanent identities after temporary-key revocation: `wbdops`, `wbdadmin`
- `wbdadmin` uses a locked local password and a passphrase-protected human-held private key.

## Temporary deployment access

1. Obtain explicit Human GO for one deployment/recovery scope.
2. Generate a distinct Ed25519 keypair; never reuse the human recovery key.
3. Record only the public fingerprint, purpose, owner, start time and planned revocation.
4. Create a locked temporary account and install only its public key with `700`/`600` directory/file permissions.
5. Add only the privileges required by the approved runbook. If broad sudo is unavoidable, time-box it to the single deployment and remove it immediately afterwards.
6. Add the account to `AllowUsers`, validate with `visudo -cf /etc/sudoers` and `sshd -t`, then prove key-only login and non-interactive privilege before any production change.
7. After completion or rollback, remove the temporary sudoers file, remove the account/home public key, remove it from `AllowUsers`, validate SSH again and prove the revoked key is rejected.
8. Remove every local temporary private-key copy using a recoverable/controlled deletion procedure and retain no key material in logs or reports.

## Human recovery procedure

1. From Donovan's secured workstation, connect as `wbdadmin` and verify the expected server host key plus the public fingerprint above.
2. Confirm `hostname` is `wbd-platform-prod`; then validate `sudo -n true` before recovery work.
3. If normal SSH is unavailable, use the TransIP Linux Rescue workflow only after confirming a current recoverable backup and the exact target disk/hostname. Do not reinstall the VPS and do not reset passwords without separate Human GO.
4. Mount the existing root filesystem, back up account/SSH files, repair only the approved public-key boundary, and validate `visudo` plus `sshd` before leaving rescue.
5. Exit rescue with the TransIP control-panel **Herstarten** action. A guest `reboot` keeps the network-rescue boot path active and is not the supported exit route.

## Rotation

1. Donovan generates and stores a new passphrase-protected human key locally.
2. Install the new public key alongside the current one and record its fingerprint.
3. Prove a complete new-key login and sudo path from the human workstation.
4. Remove the old public key only after that proof, validate SSH configuration and record the rotation timestamp.
5. Rotate temporary keys per deployment; never retain them as a fallback.

## Break-glass and rollback evidence

- Current encrypted database backup: `/var/backups/wbd-mariadb/wbd-mariadb-20260812T012701Z.sql.enc`
- Database backup SHA-256: `B71918B7FA2CEAFE67CEC7F020FE22CCF41AE978D536BB02DA2241714A1AFAC7`
- Off-provider encrypted copy: `C:\Users\donov\WBD-Recovery\Project-002\2026-08-12\wbd-mariadb-20260812T012701Z.sql.enc`; same SHA-256 verified.
- Pre-change origin rollback archive: `/srv/wbd/shared/deploy-rollbacks/SPW-FINAL-PILOT-REMEDIATION-001-20260812-prechange.tar.gz`
- Origin rollback SHA-256: `EB8866690632DAE6C161C721D1D88BAA9D2ED39876E09B873EB0EC09DE41DFFA`
- Previous backup and rollback artefacts remain retained as historical evidence.
- Rescue-time account and SSH backups carry suffix `.pre-wbd-access-20260812` on the VPS root filesystem.

No plaintext password, private key, PIN or database credential belongs in this register.
