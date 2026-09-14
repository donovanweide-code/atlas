# BLAUW acceptance PASS; release BLOCKED

## Result

| Gate | Outcome |
| --- | --- |
| BLAUW authority | FOUND: existing LIVE article 141598 override, no new rule |
| WIT / ZWART / BLAUW | PASS / PASS / PASS |
| 30-order acceptance | PASS: 30 orders, 39 article rows, all original cases retained |
| Canonical Bedrukken / composition / completion / pickup | PASS, isolated software flow |
| Exact per-color line coverage / no cross-color duplicates | PASS |
| Delete / reimport / no resurrection | PASS |
| Idempotency / concurrency | PASS / PASS |
| Regressions | 119/119; additional browser concurrency and performance PASS |
| Workspace build / immutable artifact build | PASS / PASS |
| Product Truth mutation | None; full test asserts unchanged article/profile hashes |
| Duplicate PDF / full extracted text / full order archive | 0 / 0 / 0 |
| Production-shaped server assurance | BLOCKED during restore/backfill admission |
| LIVE deploy / LIVE smoke | NO / NOT RUN |
| Tomorrow auto-intake | NOT READY |
| Customer-mail audit | NOT RUN, as required before full release acceptance |

## Exact release blocker

`DOMAIN_BACKFILL_SOURCE_DRIFT`: the existing canonical migration guard refuses to backfill when the legacy source changed after `DOMAIN_READS` cutover. The candidate's required Sportpaleis assurance needs valid restore/backfill evidence; it has not passed. WBD Owner assurance likewise has not been reached. No thresholds or evidence were weakened or fabricated.

Read-only checks on 2026-09-14:

| Source | Domain revision | Recorded legacy source revision | Actual legacy revision | Mode |
| --- | ---: | ---: | ---: | --- |
| Restored encrypted production backup | 9793 | 9655 | 9660 | DOMAIN_READS |
| Current LIVE | 9797 | 9655 | 9661 | DOMAIN_READS |

Existing reconciliation for 9655 is MATCH with equal hashes. It does not certify the later legacy revisions. This is an existing production migration/reconciliation boundary, not a missing BLAUW rule. Repairing or blessing that source drift is outside the requested BLAUW-only change. Required next step: reconcile the legacy/domain source drift through the existing migration/recovery authority, then rerun both artifact-bound assurance gates, controlled prepare/switch and LIVE smoke. Do not rerun a backfill or overwrite domain records blindly.

The installed server deployment helper also predates the candidate's mandatory assurance checks. Although its read-only inspect succeeds, using it without the candidate checks would skip required gates; no switch was attempted.

## Immutable candidate and rollback

- Candidate commit: `ee498f54615db1b7b16a5394e1354d17763e3f2c` (on top of d587856).
- Published immutable tag/candidate ID: `SPW-WEBSHOP-BLUE-20260914`.
- Current LIVE/rollback reference: `SPW-PRACTICAL-NUMBER-INPUT-20260910`, commit `76a7aaf72bcf44cb4e01b51e434c410093445565`.
- The LIVE commit is an ancestor; runtime entrypoint and catalog/config are unchanged. No unrelated LIVE fixes were replaced.
- Artifact: `.codex-tmp/webshop-blue-release-source/release/SPW-WEBSHOP-BLUE-20260914.tar.gz`, 24,796,220 bytes.
- Artifact SHA256, verified locally and on server: `a01c148742acd884711e8e0a96322ea4ac2e0bb7ea177a56f5419eaa804d4704`.
- External manifest: same directory, `SPW-WEBSHOP-BLUE-20260914.manifest.json`.
- Embedded manifest SHA256: `e6908018a10afab204f8aca8f030eddf176efb291ca0f32ebc0f95c778fe9f18`.
- Restore source: `wbd-mariadb-20260914T002817Z.sql.enc`, checksum `b920673d005fc25baf1b890f7ee7cf47dbb6f41c33128e747ae084bddb3eb1d2`.
- Existing immutable inspect: PASS. No new deployplan, switch or deployed release ID exists.

## Measurements and evidence

- 30-order mail/PDF staging: 732.6 ms (previous 837.9 ms).
- Preview + canonical creation: 48.90 s, 36.81 orders/min (previous 49.9 s, 36.07/min).
- 300 normal orderdetail reads, 10 simultaneous sessions, local FileStore: p50 1100 ms / p95 1317 ms (previous 1127 / 1310 ms). This is not a MariaDB LIVE measurement.
- Quiet browser PDF orderdetail: p50 299 ms / p95 302 ms (previous 317.5 / 331.9 ms), image parity retained.
- Concurrent batch reads: p50 11.2 ms / p95 24.8 ms; detail 320.3 / 330.5 ms. One batch parse and one shared detail parse.
- Five independent interactive sessions; edit and exclude/restore produce 200 + 409 with explicit retry, one idempotent handoff receipt. Search p95 1.9 ms, selection p95 1.2 ms.
- LIVE mail poll still runs every two minutes; observed 20:14, 20:16, 20:18 UTC. New auto-intake code has not been deployed.

Machine-readable local acceptance is in `SPORTPALEIS-WEBSHOP-BLUE-PROOF-20260914.json`; release outcome is in `SPORTPALEIS-WEBSHOP-BLUE-RELEASE-PROOF-20260914.json`. Local logs are `.codex-tmp/webshop-blue-{30,regression,e2e,build,concurrency,performance,artifact-build}.log`.

Both temporary canary databases and their temporary restore/runtime directory were removed after recording the blocker. Decrypted SQL was removed immediately after restore. LIVE customer/order/mail/production state was not mutated; no physical output or customer messages were sent.
