# Workspace DNS/TLS pre-deployment plan

Status: PREPARED_ONLY. No DNS record, certificate, reverse-proxy route or application service has been activated.

## Canonical route

- Hostname: `workspace.webuildanddesign.nl`
- Intended application origin: the WBD production VPS
- Intended public protocol: HTTPS only after certificate issuance and validation
- Intended internal runtime: `127.0.0.1:3000`

## DNS change set requiring final HUMAN DEPLOYMENT GO

| Record | Current value | Proposed value | Rollback value | TTL |
| --- | --- | --- | --- | --- |
| A | `85.10.159.158` | `149.210.228.199` | `85.10.159.158` | 300 |
| AAAA | `2a01:7c8:f0:10e2::8c42:d0a3` | `2a01:7c8:aaba:20:5054:ff:fe8e:6555` | `2a01:7c8:f0:10e2::8c42:d0a3` | 300 |

The current records point to existing shared hosting. Changing them moves only the `workspace` host; the apex WBD website, preview, Experience and mail records are not part of this change set.

## Activation sequence after final GO

1. Verify the immutable release ID, artifact hash, database migration plan and rollback package.
2. Install the application service in a closed/not-ready state on localhost.
3. Validate the Nginx candidate syntax and host-header routing locally.
4. Change only the A and AAAA records shown above.
5. Confirm both address families resolve to the VPS.
6. Obtain and validate a trusted certificate for `workspace.webuildanddesign.nl`.
7. Enable HTTPS, redirect HTTP to HTTPS and validate Secure cookies, CSRF/origin checks, health and readiness.
8. Run post-switch smoke, role, data and rollback checks before admitting pilot use.

## Rollback

1. Close readiness and stop new writes.
2. Restore the A and AAAA rollback values above with TTL 300.
3. Confirm public resolution has returned to the previous shared-hosting target.
4. Keep the VPS release and database unchanged for incident evidence; do not destroy or overwrite them.
5. Document any writes made after switch and reconcile them before another attempt.

## Current gate

TLS/route is technically specified but not active. Certificate issuance cannot be proven until the hostname resolves to the VPS or an alternative controlled ACME challenge is explicitly approved. The application release also remains blocked until the production MariaDB persistence adapter and empty production bootstrap are implemented and tested.

