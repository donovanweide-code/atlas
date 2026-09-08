# Generic capability foundation — central checkpoint

This is a tested integration checkpoint, not a combined release authorization. Planning reconciliation, final session security, intake and LIVE acceptance are separate remaining gates.

## Model and precedence

The generic catalog declares domain, action, scope, risk and object-grant eligibility. Presets are persisted policy data. Users reference a preset and sparse allow/deny overrides. Tenant policy has an explicit enabled set and deny set; teams, temporary grants and explicit object shares can add bounded access.

Order: inactive/unmapped user → component disabled → tenant deny → individual deny → individual allow → preset → team → temporary grant. Explicit object grants can provide access without module access, but never override a deny or expose another user's private object. Administrative, critical and destructive authority cannot be obtained through an object share.

Every resolution reports its source and policy version. No privilege cache is retained by the engine. A persisted permission change increments the version, records actor/old/new/source/result and rejects concurrent updates with a visible version conflict. Temporary grants also report their next start/expiry boundary.

## Runtime integration

The existing Sportpaleis service has an explicit method-to-capability map. Tests require every personal-session entry point to have a mapping; customer proposal tokens and the existing temporary-review classifier retain their separate authorities. A configured policy supersedes legacy role assertions for mapped operations. Critical payloads such as production defaults require additional authority. Changing legacy roles through the old user endpoint is blocked after migration.

Capabilities are checked before service access and against the transaction draft before writes. The existing MariaDB revision-CAS rejects stale prepared commits. This is not yet a claim that final session-revocation/expiry reconciliation is complete; that gate follows Planning as instructed.

Policy uses the existing Workspace store, including the existing generic platform domain in the MariaDB adapter. No additional authprovider, identity model, database table or production file fallback was introduced. Production middleware/persistence continues to be the actual authority.

The management screen supports preset choice, grouped overrides, source explanations, reset and a read-only preview of the target's effective access. It never issues a target session or impersonation token. Navigation and route visibility follow current effective permissions. Reload after a config update uses the same login and build.

## Existing capture dependency

Existing order progression requires a captured receipt. `orders.record_communication` covers that operation without granting external mail or inbox access. It is accepted only if the configured transport identifies as `capture` and declares `externalNetworkEnabled === false`. Any other transport requires `mail.send` and remains denied when Mail is disabled.

MailFoundation has an optional authorization decision callback. Unmigrated tenants keep their existing policy; the Sportpaleis instance uses the active capability authority after migration. No external sending or new Mail feature is activated. Existing mailbox ingest remains an internal scheduler concern. Final session protection of the capture store is part of the pending auth reconciliation.

## Tenant migration

`app/config/sportpaleis-permission-rollout.mjs` contains the four explicit identity bindings. These are absent from the generic core. The read-only migration planner refuses unknown active identities, changed expected legacy bindings, another tenant or an existing policy. It never writes automatically.

Donovan → Developer/Admin; Kevin → Owner/Manager without technical authority; Patrick → Production & Operations; Erik → Production. Employee is a personal-account preset. Planning/Mail/Intake/Teamwear are enabled only when their supplied component readiness gates permit it. Initial Intake grants are limited to Donovan and Patrick. No session policy is inferred from capabilities.

## Evidence

- 59 current tests PASS: capability/domain/service/migration plus six critical production suites.
- 51 existing Mail foundation regression tests PASS; this is regression evidence, not external Mail release readiness.
- Four focused MariaDB-adapter tests PASS: policy durability/revoke across two runtime instances, auth/bootstrap read-only, stale-write rejection and prepared commit revision drift. The database protocol tests use the existing in-memory MariaDB test harness, not a LIVE database.
- Workspace build PASS.
- Actual built Workspace browser checks: desktop 1440×960, 1280×800, tablet 768×1024, 390×844, 320×844. Summary, user choice, read-only preview and overflow checked. Local evidence lives under `website/.codex-tmp/central-permission-browser/`.
- Browser test changes a Teamwear right, reloads the second personal user's Workspace, checks navigation/API access, then restores and verifies denial. No build, deployment or login is performed between those changes.
- Permission compilation samples: p50 0.0189 ms, p95 0.0294 ms (2,000 local engine-only samples during regression). Authenticated HTTP and combined Planning/Intake p95 remain to be measured.

No external review URL or LIVE smoke is claimed here. Original Planning/auth candidates remain untouched. New sending/connectors and Teamwear Next remain deferred until their own component gates are met.
