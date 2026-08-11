# Workspace DNS/TLS pre-deployment plan

Status: PREPARED_ONLY. No DNS record, certificate, reverse-proxy route or application service has been activated.

## Canonical Sportpaleis pilot route

- Primary hostname: `workspace.sportpaleis.nl`
- Compatibility hostname during validation: `workspace.webuildanddesign.nl`
- Intended application origin: the WBD production VPS
- Intended public protocol: HTTPS only after certificate issuance and validation
- Intended internal runtime: `127.0.0.1:3000`

## Cloudflare/DNS change set requiring final HUMAN DEPLOYMENT GO

| Record | Current value | Proposed value | Rollback value | TTL |
| --- | --- | --- | --- | --- |
| `workspace.sportpaleis.nl` A | Cloudflare-proxied, origin currently returns 525 | `149.210.228.199`, initially DNS-only for origin validation or proxied after valid origin TLS | restore the exact pre-change record | provider TTL |
| `workspace.sportpaleis.nl` AAAA | Cloudflare-proxied, origin currently returns 525 | `2a01:7c8:aaba:20:5054:ff:fe8e:6555`, same proxy sequence as A | restore the exact pre-change record | provider TTL |

The apex Sportpaleis website, mail records and WBD hosts are outside this change set. Export the exact Cloudflare record/proxy/SSL state before any change. Cloudflare SSL mode must be `Full (strict)` after a valid origin certificate exists; `Flexible` is prohibited.

## Activation sequence after final GO

1. Verify the immutable release ID, artifact hash, database migration plan and rollback package.
2. Install the application service in a closed/not-ready state on localhost.
3. Validate the Nginx candidate syntax and host-header routing locally.
4. Obtain and install a certificate valid for `workspace.sportpaleis.nl` using an approved ACME DNS challenge or a controlled DNS-only HTTP challenge.
5. Validate the prepared Nginx configuration locally with the certificate present.
6. Change only the `workspace.sportpaleis.nl` A and AAAA origin targets shown above; validate DNS-only first, then enable the existing Cloudflare proxy with `Full (strict)`.
7. Confirm both address families, origin TLS and Cloudflare HTTPS work without 525/redirect loops.
8. Set `WORKSPACE_BASE_URL=https://workspace.sportpaleis.nl`; this becomes the only allowed browser origin. Cookies remain host-only (`Domain` omitted), `Secure`, `HttpOnly`, `SameSite=Strict`.
9. Validate PWA manifest, scope and start URL on the new origin. The path scope remains `/workspace/sportpaleis/`; an installation on the old origin is a separate app installation and does not migrate automatically.
10. Run post-switch smoke, role, data, noindex/robots/sitemap/header and rollback checks before admitting pilot use.
11. Keep `workspace.webuildanddesign.nl` serving the existing route during proof. Only after PASS may a separately approved 308 redirect preserve path and query to `https://workspace.sportpaleis.nl`.

## Rollback

1. Close readiness and stop new writes.
2. Restore the recorded pre-change Cloudflare A/AAAA targets, proxy state and SSL mode.
3. Confirm public resolution has returned to the previous shared-hosting target.
4. Keep the VPS release and database unchanged for incident evidence; do not destroy or overwrite them.
5. Document any writes made after switch and reconcile them before another attempt.

## Current gate

TLS/route is prepared but not active. The current public 525 proves that the Cloudflare edge cannot complete origin TLS. No DNS, Cloudflare, certificate or live Nginx change is authorized by this plan.
