# Release failure map and playbooks

| Prior failure | Engine prevention | Structured result |
|---|---|---|
| Parallel Sportpaleis/WBD production release | One shared OS deployment lock around prepare, activation, and recovery | `ENVIRONMENT_LOCK`; no mutation starts |
| Two runs for the same tenant/application | Durable application lock with live-PID protection | `CONCURRENT_RELEASE` |
| Codex cannot read Donovan's SSH key | Dedicated server identity and Unix-socket runner; no SSH in normal path | Not applicable to release execution |
| Empty stderr / PowerShell pipeline parsing | Direct process exit/stdout/stderr capture with sanitized metadata | `SSH_TRANSPORT` only for a real central transport adapter |
| `basename` with an empty operand | Canonical release IDs and paths validated before broker calls | `BASELINE_DRIFT` or `ARTIFACT` |
| Environment keys disappear under `sudo --preserve-env` | Central env/secret contract; privileged inspect and migration receive bindings directly | `ENVIRONMENT` / `SECRET` |
| Candidate expects tables missing from active schema | Pure physical schema + ledger inspection and ordered migration plan before GO | `SCHEMA_MISSING`, pending migrations, or `SCHEMA_COLLISION` |
| Status command writes schema | Dedicated `INFORMATION_SCHEMA` inspector; DDL/DML scanner test | `AUDIT` if read-only invariant changes |
| Ledger differs from physical schema | Both are independently verified; no silent ledger registration | `SCHEMA_COLLISION` |
| DDL succeeds but ledger insert is interrupted | Engine-owned checksum intent journal; exact target verification before safe ledger resume | resumable `MIGRATION` or blocked collision |
| Artifact or plan changes | Contract, artifact, manifest, migration, and deployplan checksums | `ARTIFACT` |
| Production advances after prepare | Final health/readiness and active release/commit drift recheck before `ACTIVATING` | `BASELINE_DRIFT`; immutable plan marked stale; no migration or switch |
| Restart/readiness/smoke fails | Automatic application rollback, restart of prior release, rollback readiness/smokes | `ROLLED_BACK` with original diagnostic |
| Rollback itself fails | Stop all work; preserve evidence; independent break-glass only | `ROLLBACK`, state `BLOCKED` |

Every diagnostic includes stage, class, component, code, sanitized message, candidate, active release, recommended next action, and whether retry is safe. Secret values and customer data are excluded.

`ENVIRONMENT_LOCK`, `CONCURRENT_RELEASE_PROTECTION`, `BASELINE_DRIFT_RECHECK`, and `STALE_PLAN_INVALIDATION` are mandatory release gates, not operator conventions.
