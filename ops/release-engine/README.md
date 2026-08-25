# WBD Release & Recovery Engine V1

Status: production-shaped platform foundation. Installation or activation on a production host is a consequential infrastructure action and is not authorized by this repository state alone.

## Operator contract

A normal release has two owner actions:

1. Review the compact release summary.
2. Press GO.

Everything before GO is inspection/preparation. Everything after GO is the checksum-locked activation plan, verification, and automatic application rollback. A destructive migration, credential rotation, unexpected scope, or recovery outside the contract creates a new material decision and never inherits the normal GO.

## Boundaries

- `release-engine-service.mjs` is the durable server-side runner. It uses a protected Unix socket; it has no SSH, PowerShell, arbitrary-command, or artifact-build endpoint.
- `wbd-release` is a dedicated non-login machine identity. The service itself cannot mutate `/srv/wbd`, `/etc/wbd`, systemd, or databases.
- `wbd-release-engine-operation` is the root-owned allowlisted broker. It accepts only fixed verbs and validates IDs, hashes, plan hashes, paths, services, migrations, and smoke adapters.
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

`contracts/WBD-MAIL-WEB-PUSH-FOUNDATION-20260825.release-contract.json` binds the existing immutable candidate:

- commit `e133b9d0669ffa25e7229ecea6bd69c368929648`;
- artifact SHA-256 `45fc91ed827031c6b0a09b4bf59f090fdbad617cf758ceb3d3fd246668097e4b`;
- R2 baseline `bd048e8d5c9482b348733975e1ad1a38e67ef8a6`;
- migrations 003–006 as additive/backward-compatible, with physical target schemas;
- Mail, Web Push non-delivering, Workspace, owner-boundary, and Sportpaleis smokes;
- user opt-in/default OFF and pre/post push-delivery counters.

No Web Push artifact is rebuilt by the engine.

## Owner Workspace seam

The internal socket API exposes:

- `GET /v1/releases/<release-id>` — state, current/candidate release, risk, pending migrations, backup, rollback, diagnostic, and human action;
- `POST .../prepare` — exact contract-hash only;
- `POST .../go` — exact release ID, plan hash, owner actor, request ID, and `GO`;
- `POST .../resume` — no operation input.

This is the API/state seam for a later `Owner Workspace -> Releases` view. It does not expose arbitrary commands.

## Installation checkpoint

The next consequential action is a single reviewed platform installation: create the limited machine identity/groups, install the immutable engine package and contract, install/validate the broker and sudoers rule, install the restore-verification entrypoint, create protected state/inbox directories, and enable the service. After that, the engine itself performs Web Push inspect/prepare and stops at `AWAITING_HUMAN_GO`.
