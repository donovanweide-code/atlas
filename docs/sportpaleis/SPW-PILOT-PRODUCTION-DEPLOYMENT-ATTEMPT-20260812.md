# Sportpaleis pilot production deployment attempt — 2026-08-12

Final status: **PRODUCTION DEPLOY FAILED/ROLLED BACK — NOT PILOT READY**

## Approved release

- Release: `SPW-PILOT-PREFLIGHT-REMEDIATION-003-20260811`
- Commit: `13ec19ce4451a5daf33f5d1cf2e44a522ca6637c`
- Package SHA-256: `270677AF1BD0A0B074A90386678F34B5CE898C453C251A6891BEB5317E0C2BDA`
- Active origin release remained: `/srv/wbd/releases/SPW-PILOT-PREFLIGHT-REMEDIATION-003-20260811`
- Datastore remained schema `12`, revision `103`.

## Access recovery

- Existing Ubuntu 24.04 filesystem and hostname `wbd-platform-prod` were verified in TransIP Linux Rescue before writes.
- No VPS reinstall, password reset or password-authentication enablement occurred.
- Permanent `wbdadmin` public fingerprint: `SHA256:ce+eZH8kJDlo1LWl9swrGcGgTPWSDHo+TKsvilU5YBA`.
- Effective SSH boundary remained key-only with root login and password login disabled.
- Temporary `wbddeploy` access was proved, used for this attempt, then removed. Its former key is rejected with `Permission denied (publickey)` and both local temporary private-key copies were removed.
- Procedure and identities are recorded in `docs/atlas/access/WBD-PRODUCTION-ACCESS-REGISTER-2026-08-12.md`.

## Changes attempted and validated

- ACME HTTP challenge: PASS.
- Let's Encrypt certificate for `workspace.sportpaleis.nl`: issued; expiry `2026-11-09`.
- Prepared HTTPS Nginx host: syntax PASS, reload PASS.
- `WORKSPACE_BASE_URL=https://workspace.sportpaleis.nl`: service restart/readiness PASS during the attempt.
- Cloudflare A and AAAA records for only `workspace.sportpaleis.nl`: temporarily proxied; zone encryption remained `Full (strict)`.
- Edge readiness: PASS, Cloudflare response, no 525, correct release ID.
- Search boundary: `robots.txt` `Disallow: /`, sitemap `404`, meta robots and `X-Robots-Tag` PASS.
- Unauthenticated session/bootstrap/PlotJob artifact requests: `401 UNAUTHENTICATED` PASS.
- Demo login: disabled PASS.
- PWA manifest: Sportpaleis name, scope and start URL PASS.

## Blocking smoke failures

1. The deployed immutable HTML still declares `/assets/workspace-D0-OvIZ2.svg` as primary favicon. The SVG identifies itself as `We Build And Design` and renders `WBD`. The page title is `Home — WBD Workspace`. This violates the explicit pilot requirement that WBD is not the primary Sportpaleis identity.
2. Production account state contains only:
   - Donovan van de Weide — active admin, password configured, no Quick PIN;
   - `Werknemers` — invited store account, no password, no active activation invite, email requires human verification.
3. The earlier Human Acceptance roles Kevin/admin and Patrick/operator are not available as active production pilot accounts. Authenticated live role, Quick PIN, shared-device, order, PlotJob download/herdownload and replot smoke could therefore not be completed without inventing credentials or mutating account state outside the frozen release.

## Rollback result

- `WORKSPACE_BASE_URL` restored to `https://workspace.webuildanddesign.nl`.
- Workspace service active; old host readiness returns the approved release ID.
- Both `workspace.sportpaleis.nl` Cloudflare records restored to DNS-only with their approved origin values.
- Sportpaleis Nginx host restored to the prepared HTTP-only ACME boundary; syntax and reload PASS.
- No redirect from `workspace.webuildanddesign.nl` was activated.
- Certificate remains installed as inert evidence; it does not make the failed build pilot-ready.
- Golden physical evidence, release package, datastore and rollback artefacts were not modified.

## Required next release gate

Reopen the freeze only for the two demonstrated pilot blockers: primary Sportpaleis favicon/title identity and the approved pilot-account/role activation plan. Produce a new immutable build and package, repeat full preflight, prove Donovan login plus controlled colleague activation, then obtain a new Human Deploy GO. Do not reuse this failed attempt as release approval.
