# Sportpaleis Mobile Navigation Hotfix — Human Acceptance

## Current proven baseline

- Release: `SPW-PREMIUM-HUMAN-EXPERIENCE-FINAL-R2-MOBILE-NAV-HOTFIX-20260826`
- Commit: `bff77acd108212c8d0062c549cccc63f53ccf932`
- Artifact SHA-256: `24deb492b9c898883c53f250b33258ec6e26dfd1cc4d78682615f9926d61ece2`
- Manifest SHA-256: `2515dcdaf262bdb2c6cf7e085cc805364625c119fd834c4baf077f61ccd4edce`
- Deployplan SHA-256: `1971b96deef8d4d67ee068c182804cb7d9ce0ed20c89962dc1ebcebf82906a7c`
- Prepare run: `32929065104` — PASS
- Switch run: `32929156040` — server `SWITCH=PASS`; post-activation wrapper-marker mismatch only

## Human Acceptance — 26 August 2026

Donovan tested the active production release on a real iPhone at `workspace.sportpaleis.nl` and confirmed:

| Acceptance point | Result |
|---|---|
| Live 390 px mobile navigation | PASS |
| Hamburger opens the navigation | PASS |
| Navigation is usable | PASS |
| Previous Mobile Navigation Human Acceptance failure | CLOSED |

This closes the live mobile-navigation defect. The release above is the current proven Sportpaleis baseline. No code, artifact, configuration, production data or deployment was changed as part of recording this acceptance.

## Separate evidence boundary

The remaining non-pilot-principal check is a separate live evidence limitation. Default-deny exact-principal Teamwear exposure remains covered by automated authorization regression, but a second real non-pilot principal was not part of this iPhone acceptance. This does not reopen the mobile-navigation result and is not a reason to modify or redeploy the proven baseline.
