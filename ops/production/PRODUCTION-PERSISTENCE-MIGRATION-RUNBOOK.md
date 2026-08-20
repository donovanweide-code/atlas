# Production persistence and migration runbook

Status: pre-deployment release candidate. Nothing in this runbook authorizes a deployment, DNS/TLS change, account creation, or production migration.

## Boundaries

- Workspace uses its own MariaDB database and least-privilege runtime user.
- Atlas uses a separate MariaDB database and runtime user. In this release Atlas is boundary-only: no connectors, jobs, workers, or autonomous features.
- Only the dedicated migrator credential may execute DDL. Runtime credentials need `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on their own database and no cross-database grants.
- Production startup verifies both migration checksums and fails closed. It never falls back to the development file store.
- Production bootstrap contains approved organization/catalog/provenance/DATA_GAP configuration and creates zero users and zero orders.

## Configuration and secrets

Start from `website/.env.production.example`, but store the real environment file outside the repository with owner-only permissions. Never copy credentials into a shell history, release manifest, log, or support record.

The permanent runtime users and the temporary migrator user are different principals. Remove or disable migrator access after the controlled migration. Production users are created later through a separately approved account-provisioning step; there are no placeholder accounts.

## Status check

Before a candidate can be called deployable, run the provenance guard with its generated manifest, immutable artifact, previous known-good rollback artifact and the independently recorded rollback SHA-256:

```text
npm run verify:production-release -- <manifest> <artifact> <rollback-artifact> <rollback-sha256>
```

The guard fails closed when the immutable source tag is not recoverable from the configured central Git remote, the commit/tree/build/asset manifest is incomplete, the release artifact hash differs, or the rollback artifact is absent or corrupt. Do not switch the production symlink after a failed or omitted provenance guard.

From the unpacked release directory, with `NODE_ENV=production` and the database plus masked migrator environment variables loaded locally:

```text
npm run migrate:production -- workspace --status
npm run migrate:production -- atlas --status
```

Every listed migration must be `applied` with the committed checksum. `pending`, checksum mismatch, or a connection/permission error is a deployment stop.

## Controlled apply order

1. Confirm a current VPS backup and independent database export/restore path.
2. Confirm the application is not yet publicly routed.
3. Apply Atlas boundary migrations: `npm run migrate:production -- atlas`.
4. Apply Workspace migrations: `npm run migrate:production -- workspace`.
5. Repeat both `--status` checks.
6. Start the candidate only after a separate HUMAN FINAL DEPLOYMENT GO.

Migrations are versioned, checksum-locked, additive, and do not drop or recreate production data.

## Rollback boundary

There is deliberately no automatic destructive down-migration. If startup or smoke validation fails:

1. stop the candidate service;
2. keep both databases and migration records intact;
3. return the application symlink/service reference to the previous immutable release when one exists;
4. inspect logs without exposing secrets;
5. restore a database backup only after an explicit human recovery decision and only through the validated restore procedure.

Dropping tables, deleting rows, recreating databases, or restoring over current production data requires separate explicit GO.

## First-start acceptance

- Atlas migration checksum valid and boundary reachable.
- Workspace migration checksum valid.
- Workspace runtime state initializes with zero users/orders.
- Persistence survives a process restart.
- Mail mode is capture-only; uploads, Direct Print, Summa, and hardware output are disabled.
- Public and Workspace base URLs are production URLs, not localhost.
- Debug is disabled and readiness is not green when either database is unavailable.
