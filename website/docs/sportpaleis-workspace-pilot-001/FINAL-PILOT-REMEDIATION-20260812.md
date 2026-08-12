# Sportpaleis Workspace — final pilot remediation

Date: 2026-08-12

Candidate release ID: `SPW-FINAL-PILOT-REMEDIATION-001-20260812`

Base immutable release: `SPW-PILOT-PREFLIGHT-REMEDIATION-003-20260811` at commit `13ec19ce4451a5daf33f5d1cf2e44a522ca6637c`.

Scope: only the Sportpaleis document identity and verification of the existing account invitation flow. No production deployment, datastore mutation, mail-send or hardware-send was performed.

## Sportpaleis document identity

The Workspace production build now has a separate `sportpaleis.html` entrypoint. The runtime serves this document only for `/workspace/sportpaleis/*`; WBD routes retain `workspace.html`.

The built Sportpaleis document requires:

- title `Sportpaleis Workspace` before the application loads;
- primary favicon `/sportpaleis-pwa-icon.svg`;
- manifest `/sportpaleis.webmanifest`;
- crawler metadata `noindex, nofollow, noarchive, nosnippet, noimageindex`.

The manifest remains scoped to `/workspace/sportpaleis/`, starts at `/workspace/sportpaleis/overzicht` and identifies the installed application as `Sport 2000 Sportpaleis Workspace` / `Sportpaleis`.

## Production account plan

No production e-mail address, password, Quick PIN or activation token is embedded in source, release metadata or this document.

1. Donovan remains the existing active production administrator.
2. After the candidate release is deployed and the live identity smoke passes, Donovan opens `Beheer → Gebruikers`.
3. Donovan creates Kevin with Kevin's human-confirmed e-mail address and role `Beheerder`.
4. The Workspace produces a one-time activation link with a 24-hour lifetime. No e-mail is sent. Donovan transfers only that link to Kevin through a human-controlled safe channel.
5. Kevin chooses his own password during activation and completes first login.
6. Patrick is not pre-created by this release or by Donovan's deployment step.
7. Kevin independently finds `Beheer → Gebruikers → Uitnodigen`, enters Patrick's human-confirmed data, selects role `Productie` and transfers the one-time activation link.
8. Patrick activates his own account. Kevin may then manage status, production contexts and—only if operationally required—a Quick PIN for the operator account.

The repository contains synthetic `@sportpaleis.nl` addresses in test fixtures. They are not evidence of real human addresses and must never be copied into production.

## Existing capability proof

- UI: the administrator sees `Beheer → Gebruikers`, the invitation form and roles `Winkelmedewerker`, `Productie` and `Beheerder`.
- Server: `createInvitedUser` authenticates the actor, validates CSRF and requires role `admin`.
- Boundary: `operator` and `store` attempts are tested as `FORBIDDEN`.
- Activation: only a token hash is stored; the link is one-time, expires after 24 hours and is labelled `LOCAL_HANDOFF_ONLY`.
- Mail: invitation does not add or invoke outbound mail functionality.
- Role: `admin` receives organisation, store, webshop, production and all-work contexts; `operator` receives production, store and all-work contexts.
- Quick PIN: admin/support cannot use Quick PIN; operator/store can only use it on a shared device and password step-up remains required for sensitive administration.

## Post-deploy Human Acceptance

The pilot is not accepted until all steps below are completed against `https://workspace.sportpaleis.nl`.

1. Confirm HTTPS, Sportpaleis favicon, browser title, manifest name/scope/start URL, `robots.txt`, HTML `noindex` and response `X-Robots-Tag`.
2. Donovan signs in with the existing admin account and confirms `Beheer → Gebruikers` is available.
3. Donovan creates only Kevin's `Beheerder` invitation using confirmed human data; no predictable credential is generated.
4. Kevin activates the one-time link, chooses his own password and completes first login.
5. Kevin confirms access to user management and independently invites Patrick as `Productie`.
6. Patrick activates and confirms production/order access while user, commercial and admin management remain unavailable and server-denied.
7. If part of the pilot, Kevin configures Quick PIN only for an eligible operator/store account; test shared-device switching, invalid attempts, lockout and password step-up without recording the PIN.
8. Run Verenigingsbedrukking, Vrije bedrukking, order, production preview, PlotJob history, byte-identical AI download/re-download and replot smoke without hardware-send.
9. Confirm DATA_GAP remains visible and unproven font/logo output is not treated as CUT-READY.
10. Confirm desktop and approximately 390 px mobile have no relevant horizontal overflow or browser-console errors.

## Human data still required

Kevin's actual e-mail address is not present in the authoritative production data or project documentation reviewed for this remediation. It is a human input required only when Donovan creates Kevin's invitation; it is not a release-package field. Patrick's data is deliberately deferred to Kevin's invitation flow.

## Preserved evidence

- Golden Physical Case 001 SHA-256: `E1056776DE98673BE07058FD9C8D4F28AF1EF9A41E70B882AA465AE54FF03571`.
- Golden Physical Batch 001 SHA-256: `B226A6B7637BEE219FAB5E646D2DE8E9BA7421DB6822FC82629B8FA5175F507B`.
- Pre-mirrored A/B SHA-256: `2FDADD9022E379BAAC3902103577F45D8F1C409FCF465DE2C342E0E5DB3ADDD4`.

These files and hashes were read-only verified and not modified.
