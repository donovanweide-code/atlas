# WBD deployment automation identity

This directory prepares a permanent least-privilege deployment path. It does
not contain private keys and must never be used to grant a general shell.

The production boundary uses two locked accounts:

- `wbdprepare`: data-only upload, encrypted backup trigger, immutable staging,
  prepare and verification;
- `wbdswitch`: checksum-locked preflight, activation, smoke, evidence and the
  existing bounded application rollback.

Both identities are restricted by `authorized_keys restrict`, an sshd
`ForceCommand`, disabled forwarding and exact no-argument sudo entrypoints.
Only root-owned installed helpers may execute the root-owned immutable release
tool. Uploaded scripts are never executed.

The switch private key belongs only in the protected GitHub environment
`sportpaleis-production`. That environment requires Donovan's approval before
the job starts or the secret becomes available. The prepare key belongs in the
separate `sportpaleis-production-prepare` environment and cannot invoke the
switch gateway.

Database backup and application rollback remain independent. Automation may
start `wbd-mariadb-backup.service`; no helper exposes database restore.

The one-time bootstrap must be run through the human-controlled `wbdadmin`
route. It records fingerprints and hashes while proving that the existing
`wbdadmin` authorized-keys file is byte-for-byte unchanged.
