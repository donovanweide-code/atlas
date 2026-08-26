# WBD Release & Recovery Engine V1

Status: production-shaped platform foundation. Installation or activation on a production host is a consequential infrastructure action and is not authorized by this repository state alone.

## Operator contract

A normal release has two owner actions:

1. Review the compact release summary.
2. Press GO.

Everything before GO is inspection/preparation. Everything after GO is the checksum-locked activation plan, verification, and automatic application rollback. A destructive migration, credential rotation, unexpected scope, or recovery outside the contract creates a new material decision and never inherits the normal GO.

Every prepare, activation, and automatic recovery holds the shared production deployment lock used by the existing immutable release foundation. A parallel tenant release therefore blocks the engine as `ENVIRONMENT_LOCK`; a second run for the same tenant/application is `CONCURRENT_RELEASE`. Immediately before activation the engine re-reads health, readiness, release, and commit. Drift invalidates the prepared plan immutably and requires a newly proven forward-only candidate; stale plans can never be switched.

## Boundaries

- `release-engine-service.mjs` is the durable server-side runner. It uses a protected Unix socket; it has no SSH, PowerShell, arbitrary-command, or artifact-build endpoint.
- `wbd-release` is a dedicated non-login machine identity. The service itself cannot mutate `/srv/wbd`, `/etc/wbd`, systemd, or databases.
- `wbd-release-engine-operation` is the root-owned allowlisted broker. It accepts only fixed verbs and validates IDs, hashes, plan hashes, paths, services, migrations, and smoke adapters. Mutating verbs are handed to an ephemeral root-owned systemd execution unit so the unprivileged engine service can remain under `ProtectSystem=strict`; the runner never receives direct write access to releases, runtime configuration, or service control.
- Human break-glass access remains independent. It is not granted to `wbd-release` and is not part of the normal release path.
- Contracts and artifacts arrive in the central server-side release inbox through the existing candidate/build boundary. A personal laptop or SSH identity is not a runtime dependency.

## State machine

`CANDIDATE -> INSPECTING -> BLOCKED | PREPARED -> AWAITING_HUMAN_GO -> ACTIVATING -> VERIFYING -> LIVE`

Post-switch failure moves to `ROLLING_BACK -> ROLLED_BACK`. Events form an append-only SHA-256 hash chain. Each tenant/application has one concurrency lock. Idempotency keys prevent duplicate steps. A runner restart resumes only safe work; an uncertain post-switch restart state rolls back instead of guessing.

## Pure inspection

Schema inspection uses only `SELECT` against `INFORMATION_SCHEMA` and the migration ledger. It never invokes the legacy migration runner's mutating `--status` path. Ledger state and physical schema are compared independently:

- ledger + exact schema: applied;
- neither: pending;
- exact schema without ledger: collision unless a matching engine-owned `APPLYING` intent proves an interrupted DDL step;
- ledger without exact schema, partial schema, or checksum mismatch: collision.

MariaDB DDL is explicitly modelled as non-transactional. The intent journal makes the narrow DDL/ledger crash window safely resumable without silently blessing an unrelated table.

## Recovery

Preparation requires an encrypted backup with a valid checksum, both Workspace and Atlas scopes, a schema snapshot, recent isolated restore evidence tied to the backup, and a verified restore entrypoint. Additive migrations can run only after this gate. Automatic rollback changes application release and restores the exact environment snapshot; database restore remains break-glass/material recovery.

## Environment and secrets

One contract defines required keys, aliases, secret bindings, owner/mode, and runtime access. `WBD_MIGRATOR_*` and the legacy `MIGRATOR_DB_*` names are explicitly mapped. The unprivileged runner receives presence/provenance only; privileged inspection retains values in-process and never serializes them. Diagnostics redact credential fields, URLs with credentials, private keys, and tokens.

## Web Push acceptance

`contracts/WBD-MAIL-WEB-PUSH-FORWARD-R2-MOBILE-20260826.release-contract.json` binds the reconciled immutable candidate:

- commit `8adb34b65186331b23594facf69e94152b50ead1`;
- artifact SHA-256 `c6466404b70b48c11186dfef235f0a2c32b28948fc1d5ccaa7d34b16db51a581`;
- current R2 Mobile Navigation baseline `bff77acd108212c8d0062c549cccc63f53ccf932`;
- migrations 003–006 as additive/backward-compatible, with physical target schemas;
- Mail, Web Push non-delivering, Workspace, owner-boundary, and Sportpaleis smokes;
- user opt-in/default OFF and pre/post push-delivery counters.

No Web Push artifact is rebuilt by the engine.

The earlier `WBD-MAIL-WEB-PUSH-FOUNDATION-20260825` contract is retained only as immutable history. Its R2 baseline is stale and it is not eligible for prepare or activation.

## Owner Workspace seam

The internal socket API exposes:

- `GET /v1/releases/<release-id>` — state, current/candidate release, risk, pending migrations, backup, rollback, diagnostic, and human action;
- `POST .../prepare` — exact contract-hash only;
- `POST .../go` — exact release ID, plan hash, canonical `actorId`, optional Unicode `actorDisplayName`, request ID, and `GO`. Display text is never accepted as machine identity;
- `POST .../resume` — no operation input.

This is the API/state seam for a later `Owner Workspace -> Releases` view. It does not expose arbitrary commands.

If a pre-switch request is blocked, a fresh prepare preserves the prior plan byte-for-byte under `plans/superseded/`, appends new audit events without rewriting existing hashes, and emits a new checksum-locked plan for a new Human GO.

## Installation checkpoint

The next consequential action is a single reviewed platform installation: create the limited machine identity/groups, install the immutable engine package and contract, install/validate the broker and sudoers rule, install the restore-verification entrypoint, create protected state/inbox directories, and enable the service. After that, the engine itself performs Web Push inspect/prepare and stops at `AWAITING_HUMAN_GO`.
