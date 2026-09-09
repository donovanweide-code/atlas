# Printing context signals — candidate checkpoint

Built separately from central authority `38f0c2a21333a587eeba81abad7a7765070cca9d`, on `codex/spw-printing-signals-20260909`. The original central worktree, Planning snapshot, and recovery artifact/tag are unchanged. No LIVE deployment or configuration update.

## Behavior

The unit is **bedrukkingorders**, provisionally following the communicated default while the optional unit question is unanswered. The two source totals count open printing orders; “Vandaag afgerond” counts registered printing orders with authoritative production completion evidence dated today in Europe/Amsterdam. Quantities, pages and individual prints are not separate counts. An order with twelve shirts counts once.

`WorkspaceOrder.printingOrigin` records version, `KASSABEDRUKKING` or `WEBSHOP_BEDRUKKING`, tenant, actor, timestamp and canonical source order identity. The field is assigned server-side at new order creation. Browser-supplied origin metadata is not copied. Existing historical records, migrations, reads and edits are not backfilled. No stored counter, additional collection, analytics datastore or Work Item field was introduced.

Counter registration starts with the first new printing order submitted by an active personal customer-seat employee account (existing operator/store classification in the Sportpaleis adapter). The persisted first origin starts the series; later counter orders may also be entered by an owner. Earlier owner/historical orders remain unclassified. No usernames are hardcoded. Existing source/production truth and physical production validation remain in force. Replayed creation requests retain the original order and origin.

Webshop registration is an explicit **inactive adapter contract**, `registerWebshopPrintingOrigin()`. It requires tenant-matching LIVE activation evidence, release ID, activation timestamp, a newly created printing record, observation timestamp and canonical external order identity. Historical imports and observations before activation are rejected. Legacy PDF intake was deliberately not connected. **The actual release-ready Webshop Intake adapter still has to call this contract at its live handoff/registration boundary.** No Webshop counter is shown until trusted records exist. This is not a claim that Webshop Intake is deployed or integrated.

Completed-day totals use the existing production closure authority; stage DONE alone is insufficient. Archive/delete state removes open work from open totals but does not erase a proven completion that already happened today. Source identity deduplicates repeated handoff projections. Foreign-tenant records and records without admission metadata are excluded.

## Generic display priority

The reusable context-signal catalog defines `PRIMARY`, `SECONDARY`, `HIDDEN`. Default: subtle. Effective precedence: user override → preset → catalog default. This is presentation configuration, never permission authority.

Beheer → Gebruikers & rechten has one collapsed Contextsignalen section. An administrator can set per-user priority and, explicitly, the defaults for the selected preset. Reset restores the user’s preset defaults. Updates use the existing authenticated/CSRF-protected permission transaction, version conflict protection and personal audit; the policy version changes immediately. Preset changes record old/new preset display state in the audit. No rebuild or new login is needed.

The browser regression exposed an existing selection reset during the post-save Workspace remount. The chosen user now remains selected, preventing a subsequent edit from silently targeting the first user in the list.

Today/Planning host a generic optional context slot below the greeting. The Work Item domain remains unchanged. Prominent signals become cards, secondary signals a small wrapping line, hidden signals are absent from the API response. Access still requires orders.view; Webshop totals additionally require webshop_intake.view. Role previews and fallback views do not fetch live actor signals. The optional context request does not block Planning loading.

## Validation

- Workspace build/typecheck: PASS.
- 60 distinct unit/integration regressions PASS, 0 FAIL: 43 permission/session/production tests, 7 original Work Item tests, 5 current Planning integration tests, 5 signal tests.
- Signal browser suite PASS: actual accepted order registration, idempotency, one order with twelve pieces counted once, no legacy/Webshop counters, SECONDARY → PRIMARY → HIDDEN, backend-hidden projection, capability revoke, session revoke, restore, existing dynamic navigation test.
- Browser sizes: 1440×960, 1280×800, 768×1024, 390×844, 320×844. Today, Planning and Beheer: no horizontal overflow or page errors.
- Planning browser suite PASS at the same five sizes: create, note, assign, share/limited access, overdue, complete, completedBy, appointment, personal second device, revoked refresh and revoked Planning writes.
- Browser quick capture p50 756 ms, maximum 1,563 ms (local fixture, not LIVE latency).
- Signal projection: 5,000 historical records plus one admitted record; 200 samples; p50 0.117 ms, p95 0.175 ms; zero datastore queries in the projection. The adapter reads the existing authenticated snapshot; no additional SQL scan or separate datastore is introduced.
- Permission engine p50 0.008 ms / p95 0.016 ms in the targeted regression run.
- Compatibility proof against frozen recovery backend: order metadata survives partition/compose, existing record identity validation passes, new priority config passes recovery permission validation, and a recovery permission write preserves user/preset display metadata. No new storage collections.

Evidence paths under website:

```text
.signals-tests.log
.signals-unit-final.log
.signals-planning-tests.log
.signals-build.log
.codex-tmp/printing-signals-browser/result.json
.codex-tmp/printing-signals-browser/today-390.png
.codex-tmp/central-planning-browser/result.json
```

Test entrypoints:

```text
tests/workspace-context-signals.test.mjs
tests/workspace-context-signals.browser.mjs
tests/workspace-context-signals.compatibility.mjs <absolute frozen recovery website root>
tests/workspace-planning-integration.test.mjs
tests/workspace-planning.browser.mjs
```

## Release boundary

This is a tested source candidate, not a combined release artifact or LIVE activation. The recovery gate is proven separately: release `SPW-RECOVERY-PLANNING-STORAGE-20260909`, executable commit `7313492e0d93e0e952469f4409a538781defb66c`, artifact SHA-256 `727ade584c17311898b550607bd6897835610f25ad48f762a2c0ff5dc739509b`. Its report is in the isolated recovery worktree at `docs/atlas/SPORTPALEIS-RECOVERY-AUTHORITY-20260909.md`.

Before a future combined deployment: reconcile this source component explicitly, build the combined artifact, bind the proven recovery artifact as rollback target, rerun artifact-level combined gates, and integrate the Webshop registration only with its own proven live adapter. Mail, Teamwear, supplier stock and external calendar integrations were not changed or activated.
