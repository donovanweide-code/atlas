# Sportpaleis Workspace — Pilot Foundation 006

Build: `SPW-006-20260807`  
Review environment: local isolated pilot candidate  
Date: 7 August 2026

## Source hierarchy

The complete `NEW2025-CID_Manual_BENE sep 25.pdf` is the primary design authority for colour, typography, logo and retailer rules, grids, iconography, spacing and imagery. `Alle Sport2000 Sportpaleis logo's 2026.pdf` supplies the selected concrete left-hand Sportpaleis variant. The Workspace retains that red/black SPORT 2000 emblem and bold SPORTPALEIS lettering and replaces only the lower descriptor with `WORKSPACE`. In a conflict, the CID rules win.

## Implemented pilot foundation

- Real server-side login with adaptive scrypt password hashes, opaque server sessions, CSRF, same-origin validation, secure production-cookie contract, logout and persisted brute-force throttling.
- Server-side roles for Kevin (admin), Patrick and colleague (operator), plus Donovan support outside the three customer seats. Operator admin calls return 403.
- Shared server-owned orders with server IDs, atomic writes, inter-process lock, idempotency and optimistic order revisions. Conflicts return 409 instead of overwriting silently.
- Durable audit, feedback and per-user preferences. Session storage is a read-only recovery cache, never the order source of truth.
- Atomic local backups with SHA-256 manifests, 14-copy retention and non-destructive restore validation.
- Health/readiness expose release, datastore and backup status. Hardware-send remains false.
- Direct Print preview and 440/450 mm safeguards remain available, but the physical send control stays disabled and the Illustrator → WinPlot → Summa fallback remains visible.

## Infrastructure preflight

Existing documented WBD/TransIP capability provides PHP 8.2, MariaDB/MySQL, HTTPS, private configuration outside DocumentRoot, healthchecks, versioned deployment/rollback and provider backup. All three documented Webhosting Pro site slots are already in use, and no approved Sportpaleis production boundary or DNS change exists.

Therefore no paid service, DNS change or production mutation was made. The local reference service and MySQL schema are complete candidates. Pilot activation still requires a human-approved hosting boundary, PHP/MariaDB adapter deployment, credentials handoff, deployment smoke test and isolated restore proof for Sportpaleis data.

## Cost phases

- Existing / €0 extra: repository, local validation, existing PHP/MySQL pattern, HTTPS pattern, build and health contracts, provider backup pattern.
- Absolutely needed for pilot: explicit hosting/deployment GO, an isolated database/schema on the approved boundary, secret provisioning, three customer accounts plus support account, deployed restore test and access handoff. Whether an existing slot can be safely reused must be decided by the owner.
- Later with growth: separate production service/host, expanded off-provider backup, monitoring and capacity scaling. None is activated now.

## Privacy and retention direction

Stored operational data is limited to user name, business email, role/status, order customer name, association, promised time, products, quantity, personalization text, foil colour, owner, status, feedback and audit timestamps/actions. It is needed to identify production work, coordinate operators and reconstruct changes. Admin sees user/seat/commercial controls; operators see operational workspace data; support access is separate and should be time-bound operationally.

Do not put medical, payment, identity-document or unrelated sensitive data in orders or feedback. Passwords are one-way hashes; sessions are token hashes. Production data belongs in the approved server database and encrypted/provider backup, not authoritative browser storage. Set a final deletion period with Sportpaleis before activation; proposed starting direction is active order plus operational/warranty need, then deletion or anonymisation, with shorter session/login-attempt retention and a documented deletion procedure.

## Back-up and restore

Local reference: atomic snapshot after controlled moments, manifest with byte count and SHA-256, 14-copy retention. Tests prove a snapshot can be read, hash-checked and schema-validated without replacing live state. Production target: include all `sp_*` tables, database users/permissions and private runtime configuration in the existing TransIP/WBD backup procedure; verify a restore into an isolated database before pilot use. A production Sportpaleis restore is not yet proven.

## Release decision

Visual review can proceed against the isolated build and current captures. Pilot use remains blocked until the approved server boundary is deployed and its backup, HTTPS, cookies and account handoff are validated. Production live and physical Direct Print remain out of scope.

