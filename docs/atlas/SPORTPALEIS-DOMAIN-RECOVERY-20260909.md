# Domain-compatible recovery successor

Base: immutable Planning-storage recovery `7313492e0d93e0e952469f4409a538781defb66c`.
Reviewed source: domain cutover authority `5f52639`.

Only the domain store, domain authority verifier, scheduled website-sync writer and production-shaped assurance admission are updated. Their bytes and the two targeted test files match the frozen cutover authority. No Planning UX, permission UX, production feature, Teamwear, Intake or Mail changes are imported.

The scheduled writer uses the existing domain store. DOMAIN_READS backfill verifies the reviewed legacy reference and domain reconciliation receipt; it cannot overwrite newer domain data from legacy. Missing receipts and revision/hash drift fail closed. Normal reads and writes retain their existing authoritative transaction and security boundaries.

Validation: 34/34 domain authority and MariaDB-store tests passed, including stale revision rejection, immutable history, transactional rollback and domain-reference drift denial. The cutover authority separately passed a real MariaDB LIVE-copy test preserving 146 orders, 84 jobs and 64 proposals, plus security, concurrent writes, restart and recovery/roll-forward checks.

This commit is an artifact source. Artifact-level recovery and combined release gates must pass before it is selected as the LIVE rollback target. No deployment is implied by this checkpoint.
