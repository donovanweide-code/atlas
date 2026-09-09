# R2 artifact gate findings and bounded repairs

R2 source 22490486e212ba3d1b81f49daf5cf239f10b68b1, archive SHA256 2b705b9db8f8f372196ce41840707920b8fac76cdba1642e4cd5c8ecfa45be55. Tested on isolated restore of backup SHA256 360be0bff709b02f573a198876276ead8a3ecf7dd6ebc81b9468d0f699c76775. No LIVE mutation.

The actual cutover and artifact recovery/roll-forward passed: 146 orders, 84 jobs and 64 proposals retain their hashes. A separate post-Planning artifact test completed a task through the fixture user's real service login and verified that the task, its completion event, operational and security state survive recovery 573fab4 and roll-forward to R2 unchanged.

R2 production-shaped assurance ran all five soak cycles and 2,514 requests with zero HTTP/server errors. Security, immutable business hashes, expiry/revocation, crash/restart, physical-step concurrency, idempotency and transaction rollback passed. Performance/payload gates failed: request p95 5,002 ms (limit 1,000), bootstrap p95 3,810.01 ms (2,000), event-loop p95 778.04 ms (100). Payloads: overview 3,631,046 (3,500,000), orders 3,523,423 (3,500,000), production 6,032,711 (5,250,000) bytes. No thresholds changed.

Bounded repairs in the successor:

- Temporary-review capability checks now use the existing createMutableWbdReviewDeveloperAccessProjection, as authenticate already does, instead of cloning the whole datastore. The same review authority is invoked on every check and under the mutation lock. A regression test forbids reading business records during the review check and proves revoked review sessions still fail.
- Public bootstrap order responses omit productionExecutionSnapshot and productionExecutionHistory after computing current production truth and status from the full authoritative order. These fields have no executable frontend consumers. Full order/detail APIs and internal full bootstrap retain them; database records and history are untouched. Read-only analysis found 2.72 MB of execution snapshots across the restored order collection.
- Both mandatory assurance entry points now participate in the artifact dependency graph. R2 owner assurance could not import its missing wbd-owner-domain-mariadb-store.mjs; the graph test now explicitly requires that module and its state dependency.

14 targeted capability/service/session/dependency tests passed before the bootstrap projection adjustment. Resulting artifact gates must be rerun; these repairs alone are not release proof.

An independent deployment blocker remains: installed shared releasebroker SHA256 7d66e335e92011713ea0b6dceaed71e18995a3e6157e5f976538c48c6cf5452d and installed contract validator SHA256 019da672139b9ae50b4602e089fd750c9084920235d5ff0396129e8daa47a34d do not admit the domain cutover adapter or DOMAIN_AUTHORITY_VERIFIED. The installed validator was exercised read-only: current contract valid, proposed cutover adapter rejected as not allowlisted. Neither shared deployment authority was modified or bypassed.
