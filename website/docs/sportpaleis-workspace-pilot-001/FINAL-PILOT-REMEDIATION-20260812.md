# Sportpaleis Workspace — final pilot remediation

Date: 2026-08-12

Immutable release under validation: `SPW-FINAL-PILOT-REMEDIATION-001-20260812`

Release commit: `53eae472dbec5818d64bb3dae70bd79946ef8628`; tag: `spw-final-pilot-remediation-001-20260812`.

Scope: the immutable release contains only the Sportpaleis document-identity remediation and the already implemented account invitation flow. This post-release account-plan clarification does not change application code, release configuration or production data. No production deployment, datastore mutation, mail-send or hardware-send was performed.

## Sportpaleis document identity

The Workspace production build now has a separate `sportpaleis.html` entrypoint. The runtime serves this document only for `/workspace/sportpaleis/*`; WBD routes retain `workspace.html`.

The built Sportpaleis document requires:

- title `Sportpaleis Workspace` before the application loads;
- primary favicon `/sportpaleis-pwa-icon.svg`;
- manifest `/sportpaleis.webmanifest`;
- crawler metadata `noindex, nofollow, noarchive, nosnippet, noimageindex`.

The manifest remains scoped to `/workspace/sportpaleis/`, starts at `/workspace/sportpaleis/overzicht` and identifies the installed application as `Sport 2000 Sportpaleis Workspace` / `Sportpaleis`.

## Production account plan

Only the Human-confirmed pilot e-mail addresses for Donovan and Kevin are recorded in this account plan. No password, password hash, Quick PIN or activation token is embedded in source, release metadata or this document.

1. Donovan remains the existing active production administrator.
2. After the immutable release is deployed and Donovan's Human login validation passes, Donovan opens `Beheer → Gebruikers`.
3. Donovan creates Kevin with the Human-confirmed e-mail address `kevin@sportpaleis.nl` and role `Beheerder`.
4. The Workspace produces a one-time activation link with a 24-hour lifetime. No e-mail is sent. Donovan transfers only that link to Kevin through a human-controlled safe channel.
5. Kevin chooses his own password during activation and completes first login.
6. Patrick is not pre-created by this release or by Donovan's deployment step.
7. Kevin independently finds `Beheer → Gebruikers → Uitnodigen`, enters Patrick's human-confirmed data, selects role `Productie` and transfers the one-time activation link.
8. Patrick activates his own account. Kevin may then manage status, production contexts and—only if operationally required—a Quick PIN for the operator account.

The repository contains synthetic `@sportpaleis.nl` addresses in test fixtures. They are not evidence of real human addresses and must never be copied into production.

## Donovan first-login gate

Human-confirmed identity: the existing Donovan administrator is `donovanweide@gmail.com`. Earlier read-only production evidence matches this identity to existing user ID `user-25812f676558376d`, role `admin`, status `Actief` and a configured password. The user ID, account, role, history and password were not changed; the password was not read, copied, reset or reported.

The exact post-deploy first-login validation is:

1. Donovan opens `https://workspace.sportpaleis.nl/workspace/sportpaleis/overzicht` directly on his own trusted device.
2. Donovan enters `donovanweide@gmail.com` and his private existing Workspace password and selects `Persoonlijk · langer aangemeld`.
3. Expected result: the title remains `… — Sportpaleis Workspace`; the authenticated user retains the existing Donovan user ID; role is `Beheerder`; `Beheer → Gebruikers` is available; no demo login, Quick PIN or default credential is used.
4. Only after this PASS does Donovan create Kevin's invitation. Kevin cannot be used as a recovery route for Donovan.

No password login was attempted during this offline preflight. The account and login configuration are correct, but actual password usability can only be established when Donovan privately performs the login. Status before deployment is therefore `DONOVAN FIRST LOGIN — HUMAN VALIDATION REQUIRED`; this does not block release preparation.

Only if that Human login actually fails must the pilot stop for a separate recovery decision. The current release has no self-service recovery endpoint for an active account. No preventive recovery capability is added, and creating a second Donovan account, changing the e-mail, altering status, using Quick PIN or inventing/resetting a password are not accepted workarounds.

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
2. Donovan completes the exact first-login gate above and confirms `Beheer → Gebruikers` is available.
3. Donovan creates only Kevin's `Beheerder` invitation for `kevin@sportpaleis.nl`; no predictable credential is generated.
4. Kevin activates the one-time link, chooses his own password and completes first login.
5. Kevin confirms access to user management and independently invites Patrick as `Productie`.
6. Patrick activates and confirms production/order access while user, commercial and admin management remain unavailable and server-denied.
7. If part of the pilot, Kevin configures Quick PIN only for an eligible operator/store account; test shared-device switching, invalid attempts, lockout and password step-up without recording the PIN.
8. Run Verenigingsbedrukking, Vrije bedrukking, order, production preview, PlotJob history, byte-identical AI download/re-download and replot smoke without hardware-send.
9. Confirm DATA_GAP remains visible and unproven font/logo output is not treated as CUT-READY.
10. Confirm desktop and approximately 390 px mobile have no relevant horizontal overflow or browser-console errors.

## Human account decision

Donovan confirmed `donovanweide@gmail.com` on 2026-08-12 as the correct existing Donovan administrator identity and `kevin@sportpaleis.nl` as the correct address exclusively for the Kevin/admin pilotaccount plan. Neither address is embedded as a credential or account mutation in application configuration or the release package. No account was created or changed during remediation. Patrick remains deliberately absent from predeploy account data and is invited only by Kevin after Donovan first-login and Kevin's own activation both pass.

## Corrected account preflight

- `SPORTPALEIS IDENTITY — PASS`: the immutable package contains the Sportpaleis title, favicon, scoped manifest and noindex metadata; the WBD entrypoint remains separate.
- `DONOVAN ACCOUNT CONFIG — PASS`: read-only production evidence matches the Human-confirmed e-mail to the existing active administrator and preserves the existing user ID.
- `DONOVAN FIRST LOGIN — HUMAN VALIDATION REQUIRED`: normal password login is implemented and configured; no password was tried or reset during offline preflight.
- `KEVIN PILOT ACCESS — PASS`: an active administrator can invite Kevin as `Beheerder`; Kevin chooses his own password through the existing activation flow.
- `KEVIN → PATRICK INVITATION — PASS`: after activation Kevin has the same server-enforced administrator capability; operator/store roles receive `FORBIDDEN`.
- Invitation evidence: random one-time token, only its SHA-256 hash persisted, 24-hour expiry, one-time activation and `LOCAL_HANDOFF_ONLY`; no outbound mail is required.
- Relevant automated preflight: 20/20 tests PASS; TypeScript/Vite Workspace build and Workspace build verifier PASS. The existing non-blocking Vite chunk-size warning remains unchanged.
- `NEW IMMUTABLE RELEASE — NOT REQUIRED`: the account correction changes no application code, runtime configuration, datastore or package bytes. Deployment remains pinned to release `SPW-FINAL-PILOT-REMEDIATION-001-20260812`, commit `53eae472dbec5818d64bb3dae70bd79946ef8628`, package SHA-256 `ED729A99352689E51F77C6F72109AC7833DAABECC08C17BCE1CBF5746A827EF3`.
- `PREFLIGHT — GO`: ready for a separate Human Deploy GO, with Donovan's actual password login as the first post-deploy Human validation.

## Preserved evidence

- Golden Physical Case 001 SHA-256: `E1056776DE98673BE07058FD9C8D4F28AF1EF9A41E70B882AA465AE54FF03571`.
- Golden Physical Batch 001 SHA-256: `B226A6B7637BEE219FAB5E646D2DE8E9BA7421DB6822FC82629B8FA5175F507B`.
- Pre-mirrored A/B SHA-256: `2FDADD9022E379BAAC3902103577F45D8F1C409FCF465DE2C342E0E5DB3ADDD4`.

These files and hashes were read-only verified and not modified.
