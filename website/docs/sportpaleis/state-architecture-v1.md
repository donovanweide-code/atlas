# Sportpaleis structural state architecture v1

Status: implementation candidate; **not accepted and not deployed**.

## Proven old path

Production release R2.26.38 stores the complete Sportpaleis business state in one
`sp_runtime_state.state_json` value. `SportpaleisMariaDbStore.read()` decodes and
validates that value; `mutate()` locks it, decodes, validates, clones the complete
state, runs a command, validates again, serializes/compresses the complete result
and replaces the row. Bootstrap projection subsequently traverses the same complete
object. The R2.26.45 MariaDB canary measured this failure mode with four simultaneous
full bootstraps: 24-MB-class decoded state, 5,179.97 ms maximum event-loop delay,
RSS 195,989,504 -> 865,144,832 -> 777,478,144 bytes and bootstrap p95 1,980 ms.
The HTTP layer did not return a 5xx, but the runtime was not operationally bounded.

The production runtime selects the store in `scripts/workspace-runtime.mjs` and
`SportpaleisPilotService` consumes it through `read`, `readSnapshot` and `mutate`.
Authentication, bootstrap, revision, order/history, production, asset/preview and
mailbox projections all shared this root object. Preview source bytes and immutable
audit evidence were therefore resident beside routine session and order data.

## Consumer and dependency map

| Boundary | Persistent source before | Hot consumers | Candidate boundary |
| --- | --- | --- | --- |
| Identity/session/access | `state_json.users/sessions/...` | login, session, CSRF, revision, TTL review | `identity` scalar/record domain |
| Audit/evidence | `state_json.audit` | admin bootstrap, evidence | append-only `sp_workspace_audit_event` |
| Assets/fonts/SVG/Library | `state_json.production*`, articles, associations | Library, previews, source admission, production resolution | `library` scalar/record domain; source bytes excluded from bootstrap |
| Orders/order lines | `state_json.orders` | order detail/history, Bedrukken, pricing | row-wise `orders` domain records |
| History/status | nested order `eventHistory` | order history, completion/reject eligibility | immutable `sp_workspace_order_history_event` read model |
| Production projections | proposals and team/intake projections | Productie and planning | row-wise `production` records |
| PlotJobs/artifacts | `productionJobs[].snapshot.artifact` | job detail, download, retry/reject | row-wise `artifacts` records plus immutable artifact reference index |
| Mailbox/intake | `mailbatches`, intake/routing/control | Webshop intake | separate `mailbox` domain, not activated by this run |
| Platform counters/idempotency | root scalar/maps | sequence and command idempotency | small `platform` scalar domain |

`production-asset` preview routes read immutable in-memory domain records and do no
database write. Bootstrap responses remain access-scope keyed, single-flight,
serialized byte caches. Cache identity includes organization, global revision,
principal, role, scopes, feature exposure and session security metadata.

## Candidate transaction and revision model

Migration 003 is additive. It retains `sp_runtime_state` unchanged as the rollback
source and introduces domain metadata, scalar domain payloads, stable record rows,
append-only audit events, an order-history read model and immutable artifact
references. Initial backfill locks the legacy row, partitions deterministically and
commits only after canonical full-state hashes match.

A command locks the small domain metadata row, lazily clones only top-level values
it reads, validates changed values and writes only changed domain scalars and
changed/deleted record rows in one transaction. Orders and PlotJobs cannot be hard
deleted. Prior audit, order-history and artifact-reference values cannot be changed
or removed. Each changed domain receives its own revision and the transaction gets
one global revision for cache invalidation. Normal reads perform only a small meta
revision query and reuse the immutable snapshot when unchanged.

This is a strangler cutover: the legacy row remains immutable; domain backfill must
be hash-equal; reads switch to the domain snapshot; writes no longer update the
legacy blob. Before an application rollback, the locked releasebroker stops the
service and atomically materializes the exact current domain snapshot into the old
envelope. Additive tables are retained; no down migration or evidence deletion is
required.

## Owner Workspace impact

Owner Workspace does **not** import Sportpaleis state or use `sp_runtime_state`.
It does, however, independently implement the same failure-prone persistence
pattern in `WbdOwnerMariaDbStore`: every `read()` selects and validates the complete
`wbd_owner_state.state_json`; every `mutate()` locks, parses, validates, clones,
validates and rewrites that complete value. Therefore the defect class is shared,
not the tenant data.

The generic partition/hash/record/revision concepts are reusable, but Owner needs a
separate candidate, domain map, backfill, shadow comparison and assurance contract.
No Owner data migration or cutover is part of the Sportpaleis release. Mail's newer
message/thread/audit tables already demonstrate a separate hot-data boundary and
must not be folded back into an Owner state blob.

## Release blockers still applying

This document and the local domain tests are not acceptance. Deployment remains
blocked until a restored real-MariaDB dataset proves hash-equal backfill, record-
incremental writes, bounded CPU/event-loop/RSS/pool behavior, full functional
production fixtures, isolated Chrome desktop/390/320, fresh backup/restore and the
legacy rollback materialization. The known unrelated full-suite baseline failures
must also be explicitly resolved or separated by an authoritative versioned suite;
they cannot be hidden by a targeted-test count.
