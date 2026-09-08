# Shared Planning central reconciliation

Source authority: `c6e0dd31a3fd0d7330f7afed0821a0f820302004`, unchanged development snapshot.
Capability integration: `0305d71db1d9c35c45f0e0f379989547c5ffc7f2`.
Runtime baseline: LIVE `c03d8604cb1ce232c73a34f8996d0ad193f17024`.

The five independent Planning model/service/UI/test files were copied from the snapshot and reconciled centrally. Shared pilot service, runtime, shell and persistence were integrated manually. Snapshot-only review runtime, identities and Vite entry point were not imported into production. Production uses the existing Workspace domain transaction store, with separate work-item and completion-event records; it never selects the snapshot's standalone file store.

Effective capabilities protect module access and each object/action. Explicit assignment/share can expose one item without granting the module. Individual denies remain authoritative. Private items are not implicitly visible to administrators. Creating, assigning, sharing, noting and completing use the existing personal session and CSRF. Revision conflicts are explicit. Completion records the actor and emits one internal event; it performs no production or mail action.

Verified locally:

- 12 model/integration tests: task, appointment, assignment, sharing, notes, privacy, tenant isolation, conflicts, overdue persistence, completion attribution, restart, invalid CSRF and queued revoked/expired sessions.
- Domain MariaDB adapter test (SQL test double): separate records, second-runtime visibility, and revision-locked rejection of a prepared write after session revocation. This is not a real MariaDB deployment smoke.
- Built Workspace browser flows at 1440×960, 1280×800, 768×1024, 390×844 and 320×844. No overflow or page errors. Capture, notes and completion pass at each size. Maximum automated capture 1.15 seconds; median 391 ms. Human-entry time is not claimed.
- Donovan assigns Patrick; overdue remains until Patrick completes with correct attribution. Kevin sees Planning. Erik has no Planning navigation/API access, but can complete his explicitly assigned item.
- Production/order/mail state hashes unchanged by Planning flows.
- Workspace production build passes.

Local evidence: `website/.codex-tmp/central-planning-browser/result.json` and screenshots. Local fixtures use synthetic credentials and existing profile IDs; no LIVE principals were logged in by these tests.

Status: Planning + capability integration proven at the local candidate layer. This checkpoint opens the sequential auth reconciliation phase; it is not a deployment approval or LIVE proof. Final session commit-boundary tests, combined regression, real runtime validation, artifact/rollback and LIVE smokes remain required.
