# Sportpaleis final pilot production deployment — 2026-08-12

Technical deployment status: **PASS**.

Pilot acceptance status: **AWAITING DONOVAN FIRST LOGIN**. No password was read, entered, reset or reported by Codex.

## Deployed immutable release

- Release: `SPW-FINAL-PILOT-REMEDIATION-001-20260812`
- Commit: `53eae472dbec5818d64bb3dae70bd79946ef8628`
- Package SHA-256: `ED729A99352689E51F77C6F72109AC7833DAABECC08C17BCE1CBF5746A827EF3`
- Active origin path: `/srv/wbd/releases/SPW-FINAL-PILOT-REMEDIATION-001-20260812`
- Primary URL: `https://workspace.sportpaleis.nl`

The package hash was checked locally and again on the server before extraction. The embedded manifest matched the release ID and commit. Dependencies were installed exactly from the packaged lockfile with production-only, scripts-disabled `npm ci`.

## Backup and rollback evidence

- Predeploy backup UTC: `2026-08-12T01:27:01Z`
- Server backup: `/var/backups/wbd-mariadb/wbd-mariadb-20260812T012701Z.sql.enc`
- Off-provider copy: `C:\Users\donov\WBD-Recovery\Project-002\2026-08-12\wbd-mariadb-20260812T012701Z.sql.enc`
- Backup SHA-256 on both locations: `B71918B7FA2CEAFE67CEC7F020FE22CCF41AE978D536BB02DA2241714A1AFAC7`
- Origin rollback: `/srv/wbd/shared/deploy-rollbacks/SPW-FINAL-PILOT-REMEDIATION-001-20260812-prechange.tar.gz`
- Origin rollback SHA-256: `EB8866690632DAE6C161C721D1D88BAA9D2ED39876E09B873EB0EC09DE41DFFA`

No destructive down-migration was performed. Both packaged migrations were already applied with the expected checksums, so the deployment executed no schema migration.

## Runtime and datastore

- Workspace service: active and restart-persistent.
- Workspace datastore: schema `12`, revision `104`.
- Atlas and Workspace migration checksum status: `applied` / PASS.
- Live record counts after restart: users `2`, orders `0`, associations `20`, articles `48`, audit events `21`, production jobs `3`, activation invites `1`.
- Donovan remains existing user ID `user-25812f676558376d`, e-mail `donovanweide@gmail.com`, role `admin`, status `Actief`, password configured, no Quick PIN.
- Kevin and Patrick were not created or activated.
- Revision `104` is associated with a pre-acceptance datastore audit event `Ingelogd`; it is not accepted as Donovan's required post-deploy Human validation without Donovan's explicit confirmation.

Fail-closed production flags remained: uploads off, mail capture-only, hardware output off, Direct Print off and Summa off.

## HTTPS, Cloudflare and identity smoke

- Origin certificate for `workspace.sportpaleis.nl`: valid through `2026-11-09`.
- Only the `workspace` A and AAAA records were changed from DNS-only to Proxied; their origin values were preserved.
- Sportpaleis Cloudflare zone encryption: `Full (strict)` confirmed; no other zone, DNS, mail or website configuration was changed.
- Public readiness: HTTP 200 through Cloudflare with the exact release ID.
- Sportpaleis title, favicon, manifest name, scope and start URL: PASS.
- Live browser title: `Inloggen — Sportpaleis Workspace`.
- Mobile 390 px: login visible, no horizontal overflow, no browser-console errors.
- HTML noindex and `X-Robots-Tag`: PASS.
- `robots.txt`: `Disallow: /`; sitemap: HTTP 404.
- Unauthenticated session/bootstrap boundary: HTTP 401; demo login disabled.

The compatibility host was not redirected. The previously approved redirect remains deferred until Donovan's first post-deploy login and remaining authenticated Human Acceptance pass.

## Golden Evidence

- Golden Physical Case 001: `E1056776DE98673BE07058FD9C8D4F28AF1EF9A41E70B882AA465AE54FF03571`
- Golden Physical Batch 001: `B226A6B7637BEE219FAB5E646D2DE8E9BA7421DB6822FC82629B8FA5175F507B`
- Pre-mirrored A/B: `2FDADD9022E379BAAC3902103577F45D8F1C409FCF465DE2C342E0E5DB3ADDD4`

All three hashes were reverified from the active release after deployment and remained unchanged.

## Access closure

- Temporary deployment fingerprint: `SHA256:LFqT1B8qnWe3hQDACmwXJwWYdyoioNZTQDbhHW+GuGc`.
- Temporary sudoers file, account, home, `AllowUsers` entry and server-side deployment copies were removed.
- The temporary key was rejected after revocation with `Permission denied (publickey)`, exit `255`.
- All local temporary private/public key and agent-state files were removed.
- Permanent `wbdadmin` recovery login, non-interactive sudo, `sshd -t`, `visudo` and runtime readiness remained PASS.

## Required Human validation

1. Donovan opens `https://workspace.sportpaleis.nl/workspace/sportpaleis/overzicht`.
2. Donovan signs in privately with `donovanweide@gmail.com` and the existing Workspace password.
3. Donovan confirms his existing identity, role `Beheerder` and `Beheer → Gebruikers`.
4. Only after that PASS does Donovan invite Kevin at `kevin@sportpaleis.nl` as `Beheerder` through the one-time local activation route.
5. Kevin activates his account and independently invites Patrick with role `Productie`.

Until step 2 and 3 are explicitly Human-confirmed, `DONOVAN FIRST LOGIN — AWAITING HUMAN VALIDATION` and `PILOT READY — NO`.
