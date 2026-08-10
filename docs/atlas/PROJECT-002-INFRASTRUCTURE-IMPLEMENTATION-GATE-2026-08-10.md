# Project 002 — Infrastructure implementation and deployment gate

Date: 2026-08-10  
Scope: approved Option A infrastructure, bounded Workspace + Atlas production boundary, no Sportpaleis deployment  
Decision: infrastructure PASS; application deployment gate remains CLOSED

## Provider and cost record

- TransIP VPS provider ID: `460339`
- VPS name: `wbd-platform-prod`
- IPv4: `149.210.228.199`
- IPv6: `2a01:7c8:aaba:20:5054:ff:fe8e:6555`
- OS: Ubuntu 24.04.4 LTS
- Capacity: 2 shared vCPU, 4 GB RAM, 100 GB NVMe
- VPS: EUR 20.00/month excluding VAT
- Automatic VPS backup: EUR 5.00/month excluding VAT
- Offsite VPS backup: EUR 10.00/month excluding VAT
- Actual approved new monthly cost: EUR 35.00 excluding VAT
- Existing WBD Webhosting Pro remains EUR 15.99/month excluding VAT
- Total expected WBD/TransIP monthly cost: EUR 50.99 excluding VAT
- One-time cost: EUR 0.00
- Object Store and other paid add-ons: not activated

TransIP showed the automatic daily/four-hourly and weekly backup service as active, with a first daily backup at 2026-08-10 15:53 and a first weekly backup at 2026-08-10 15:45. The separately purchased offsite backup was active and showed `Back-up locatie wordt bepaald`; no unapproved provider action was taken.

## Server baseline evidence

The repeatable baseline check passed 18 of 18 controls:

1. timezone Europe/Amsterdam;
2. hostname `wbd-platform-prod`;
3. hardened SSH configuration;
4. root SSH login disabled;
5. password SSH login disabled;
6. UFW active;
7. Nginx active;
8. MariaDB active;
9. fail2ban active;
10. unattended security upgrades active;
11. database backup timer active;
12. encrypted backup present;
13. Workspace database present;
14. Atlas database present;
15. Node.js 22 active;
16. local health endpoint passes;
17. readiness remains intentionally closed;
18. MariaDB listens only on localhost.

Resource snapshot after baseline:

- RAM: 3868 MB total, 606 MB used, 3261 MB available;
- disk: 96 GB filesystem, 2.8 GB used, 94 GB available (3% used);
- public listeners: SSH 22 and Nginx 80;
- MariaDB: `127.0.0.1:3306` only;
- no application service and no public 443 listener yet.

Public infrastructure-only probes:

- `http://149.210.228.199/healthz`: HTTP 200;
- `http://149.210.228.199/readyz`: HTTP 503 with `application_not_deployed`.

## Database and least privilege

- MariaDB version: 10.11;
- Workspace database: `wbd_workspace`;
- Atlas database: `wbd_atlas`;
- separate runtime users for Workspace and Atlas;
- runtime users limited to SELECT/INSERT/UPDATE/DELETE;
- separate migrator user for DDL;
- credentials stored only in root-owned server configuration outside Git;
- no credential value is included in this record.

The databases and users are READY as infrastructure. They do not make the current application release production-ready by themselves.

## Backup and restore evidence

- daily encrypted MariaDB logical dumps scheduled at 02:20 Europe/Amsterdam with a randomized delay;
- local retention: 14 days;
- source backup: `wbd-mariadb-20260810T135221Z.sql.enc`;
- encrypted source size: 1968 bytes;
- SHA-256: `6C0D2CA4C82D143FD1DB8B0311AECEA97ED713A8D2E021296D722E049857FF21`;
- checksum on the VPS: PASS;
- isolated restore into temporary Workspace and Atlas schemas: PASS;
- temporary restore schemas removed after validation;
- off-provider encrypted copy: `C:\Users\donov\WBD-Recovery\Project-002\2026-08-10\`;
- decryption key stored separately at `C:\Users\donov\.wbd-secrets\Project-002\mariadb-backup.key`;
- both local locations restricted to the current Windows user.

No Sportpaleis production data was required or used for this restore test.

## DNS, TLS and routing

The non-activated route candidate is in `ops/production/nginx-workspace-predeployment.conf`. Its syntax was successfully validated with Nginx on the VPS. The complete change and rollback plan is in `ops/production/WORKSPACE-DNS-TLS-PLAN.md`.

Current records, unchanged:

- A: `85.10.159.158`, TTL 300;
- AAAA: `2a01:7c8:f0:10e2::8c42:d0a3`, TTL 300.

Prepared values, not activated:

- A: `149.210.228.199`;
- AAAA: `2a01:7c8:aaba:20:5054:ff:fe8e:6555`.

A trusted certificate has not been requested because the final DNS/deployment switch is not authorized. TLS/routing is PREPARED, not active.

## Software validation

- Node regression suite: 457/457 PASS;
- WBD invoice Python tests: 5/5 PASS;
- public production build and public-only boundary verification: PASS;
- Workspace production build and Workspace-only boundary verification: PASS;
- production dependency audit: 0 known vulnerabilities;
- Nginx route candidate syntax: PASS.

The large Workspace bundle warning is non-blocking for correctness but should remain an observed performance risk after the production persistence gate is solved.

## Release reconciliation and hard blocker

The working tree contains 376 status entries: 33 tracked modifications and 343 untracked entries. Local credential files, environment files, runtime pilot data, mail-foundation data and build output are excluded by Git ignore rules. No tracked key, certificate or known local password file was found.

An immutable application release candidate was deliberately not created. Two existing production blockers are proven in source:

1. `website/scripts/workspace-runtime.mjs` constructs `SportpaleisFileStore` for the Sportpaleis API runtime. The approved architecture explicitly rejects promotion of the local JSON file store to production and requires MariaDB repositories, transactions, migrations and idempotency before the pilot.
2. `website/scripts/sportpaleis-pilot-foundation.mjs` initializes `orders: initialOrders()`, which produces the review/test orders prohibited by the clean-production gate.

The local demo-login itself is correctly fail-closed in production: it can only be enabled in local, non-production mode. That does not remove the two blockers above.

Creating a commit/tag from the current tree would therefore falsely label a non-production-safe runtime as an immutable release candidate. No release commit, tag, deployment artifact or production data import was created.

## Required smallest next workstream before final deployment GO

This is a blocking application-readiness step, not permission to execute it automatically:

1. implement the already-approved Node-to-MariaDB production repository boundary using the existing schema/migration contracts;
2. add an idempotent empty production bootstrap with no sample orders, demo accounts or review mail/hardware output;
3. provision only explicitly approved pilot identities through local secret handoff;
4. run migrations and repository integration tests against an isolated MariaDB instance;
5. prove concurrency, idempotency, RBAC, audit, backup and restore using the MariaDB adapter;
6. run a negative production-package audit;
7. reconcile and stage only the canonical source/config/migrations/tests/operations documentation;
8. create the immutable commit, tag, release ID, artifact hash and rollback package;
9. return to the final deployment gate before DNS, TLS issuance or application activation.

## Gate result

INFRASTRUCTURE IMPLEMENTATION: PASS  
VPS HEALTH: PASS  
SECURITY BASELINE: PASS  
BACKUP: PASS  
OFFSITE BACKUP: PASS  
RESTORE TEST: PASS  
WORKSPACE DATABASE: READY  
ATLAS DATABASE: READY  
TLS / ROUTING: NOT READY (prepared, not active)  
IMMUTABLE RELEASE CANDIDATE: NOT READY  
ACTUAL NEW MONTHLY COST: EUR 35.00 excluding VAT  
UNAPPROVED PAID SERVICES ACTIVATED: NO  
SPORTPALEIS DEPLOYED: NO  
FINAL DEPLOYMENT GO RECOMMENDED: NO

