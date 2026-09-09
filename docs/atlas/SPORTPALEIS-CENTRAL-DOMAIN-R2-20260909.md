# Central domain release R2 candidate

Authority chain: LIVE C03D860 -> central f5ff4c3995fa1d6b3e26bc9f2d6d508ad914fa99 -> isolated reviewed domain cutover 5f52639 -> this artifact checkpoint. No blind merge or legacy reimport. Original Planning snapshot c6e0dd31 remains immutable.

Rollback authority is now SPW-RECOVERY-DOMAIN-AUTHORITY-20260909, commit 573fab416d16a1689ef0ea54dffa9d372b9fd21a, based on immutable 7313492. Its archive SHA256 is 107d072e8d15555ded1ba1fc77e3f21d6ebf10471a713fe5d0a418882271c34a. The source rollback test passes for both workItems and workItemEvents. Recovery includes the same domain writer and fail-closed authority verifier; a rollback must not restore the legacy writer.

All functional components and activation defaults are inherited from f5ff4c3. Capability foundation, Planning, session enforcement, printing context and current production hotfixes remain identifiable through their existing source commits. Intake, Teamwear Batch 1+2 and new Mail/connectors remain DEFERRED; their independent gates are not established. No broad activation or supplier functionality is included.

Cutover evidence and exact reviewed conflicts are in SPORTPALEIS-DOMAIN-AUTHORITY-CUTOVER-20260909.md. This checkpoint only updates the executable rollback test to the new recovery authority; no further product changes.

Deployment remains gated on artifact-bound production-shaped and owner assurance, recovery/roll-forward on a restored database, and releasebroker compatibility. Read-only inspection of the installed broker found that data-backfill accepts only sportpaleis-domain-backfill-v1 / wbd-owner-domain-backfill-v1 and BACKFILLED / ALREADY_BACKFILLED results; it does not admit DOMAIN_AUTHORITY_VERIFIED or the reviewed conflict-plan cutover CLI. No manual LIVE mutation or fabricated broker-lock environment may bypass this boundary. The installed broker must be reconciled through a separately reviewed, tested authority before LIVE cutover.
