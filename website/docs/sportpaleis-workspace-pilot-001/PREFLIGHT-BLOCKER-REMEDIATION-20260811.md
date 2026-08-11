# Sportpaleis Workspace — production preflight blockerremediation

Date: 2026-08-11

Build ID: `SPW-PILOT-PREFLIGHT-REMEDIATION-002-20260811`

Base freeze commit: `9d095aeba3c10bf0d8dc382dcaba73545ed00420`

Base freeze tag: `spw-functional-pilot-freeze-ready-001-20260811`

Scope: release blockers only; no production deploy, DNS/Cloudflare cutover, mail-send or hardware-send.

## Primary route decision

- Primary pilot host: `workspace.sportpaleis.nl`.
- Compatibility host during proof: `workspace.webuildanddesign.nl`.
- Current public state of the primary host: Cloudflare-proxied A/AAAA; HTTPS returns Cloudflare 525 because origin TLS is not valid for this route.
- Prepared origin targets: `149.210.228.199` and `2a01:7c8:aaba:20:5054:ff:fe8e:6555`.
- Prepared origin: `127.0.0.1:3000` behind the dedicated Nginx server block.
- Required TLS state after separate GO: certificate valid for `workspace.sportpaleis.nl`, Cloudflare `Full (strict)`, no Flexible SSL.
- `WORKSPACE_BASE_URL` and the request-origin boundary use `https://workspace.sportpaleis.nl`.
- Session cookie stays host-only and retains `Secure`, `HttpOnly` and `SameSite=Strict` in production.
- PWA scope and start URL remain path-based. Because installed PWAs are origin-bound, an old-host installation does not migrate automatically.
- Old Sportpaleis links remain served on the compatibility host during validation. A path/query-preserving 308 redirect is only allowed after the new origin passes live smoke under a separate Human GO.

## Search indexing boundary

- Workspace build contains a dedicated `robots.txt` with `User-agent: *` and `Disallow: /`.
- Workspace HTML retains `noindex, nofollow, noarchive, nosnippet, noimageindex`.
- Runtime and prepared Nginx responses retain `X-Robots-Tag: noindex, nofollow, noarchive`.
- Workspace build rejects a packaged `sitemap.xml`.
- Public WBD `robots.txt` and sitemap remain separate and unchanged.
- Authentication and authorization remain the security boundary; crawler directives are not treated as access control.

## Current backup and isolated migration proof

- Source environment: production VPS `wbd-platform-prod`, MariaDB databases `wbd_workspace` and `wbd_atlas`.
- Backup timestamp: `2026-08-11T21:02:02Z` (`2026-08-11 23:02:02 Europe/Amsterdam`).
- Server artifact: `/var/backups/wbd-mariadb/wbd-mariadb-20260811T210202Z.sql.enc`.
- Off-provider artifact: `C:\Users\donov\WBD-Recovery\Project-002\2026-08-11\wbd-mariadb-20260811T210202Z.sql.enc`.
- Encrypted bytes: `133408`.
- SHA-256: `5ce769d9b561d82e9a0a0406ef307b8f4a4af4f8ad07f172222ed69af27393f9`.
- Server checksum: PASS.
- Off-provider checksum: PASS.
- Decryption key remains separately stored and was not copied into release evidence.

The encrypted backup was restored into uniquely named isolated Workspace and Atlas schemas. The frozen application state transition was then persisted only in the isolated Workspace schema.

| Assertion | Before | After | Result |
| --- | ---: | ---: | --- |
| Schema | 8 | 12 | PASS |
| Revision | 102 | 103 | PASS — clone only |
| Users/roles | 2 | 2 | PASS, identity/role/password records preserved |
| Orders | 0 | 0 | PASS |
| Audit/history | 20 | 20 | PASS, byte-stable logical content |
| Existing PlotJobs | 0 | 0 existing | PASS, none lost |
| Golden PlotJobs | 0 | 3 | PASS, expected additive foundation |
| Associations | 20 | 20 | PASS |
| Articles/pilot catalog | 48 | 48 | PASS |

After the isolated test, live remained schema 8, revision 102 and 116002 state bytes. The temporary restore schemas and transfer copies were removed automatically.

Rollback requires a separate Human recovery decision: stop readiness/new writes, stop the candidate service, return the application symlink to the previous immutable release, preserve logs/evidence, and restore this encrypted dump only through the validated restore procedure when application rollback alone is insufficient. No automatic destructive down-migration is permitted.

## Immutable production artifacts

The releasebuilder does not include complete `output/` or `outputs/` trees. It derives an allowlist from persistent bootstrap PlotJob records, rejects paths outside the two immutable roots, reads only referenced files and requires their exact stored SHA-256 before packaging.

Expected allowlist:

1. Golden Physical Case 001 PDF — `E1056776DE98673BE07058FD9C8D4F28AF1EF9A41E70B882AA465AE54FF03571`.
2. Golden Physical Batch 001 AI — `B226A6B7637BEE219FAB5E646D2DE8E9BA7421DB6822FC82629B8FA5175F507B`.
3. Golden Physical Batch 001 pre-mirror A/B AI — `2FDADD9022E379BAAC3902103577F45D8F1C409FCF465DE2C342E0E5DB3ADDD4`.

The embedded release manifest records the base freeze, remediation release commit/tag, each selected PlotJob reference and every packaged file hash.

Release candidate 001 stopped before artefact creation because the immutable A/B filename exceeded the legacy 100-byte TAR name field. Candidate 002 uses the standard USTAR prefix field and preserves the complete original path and filename.

## Still requires separate deployment GO

- export exact pre-change Cloudflare DNS/proxy/SSL settings;
- issue/install origin certificate for `workspace.sportpaleis.nl`;
- validate prepared Nginx configuration with that certificate;
- switch only the approved host records and Cloudflare mode;
- update the production environment URL and release ID;
- run the documented post-deploy HTTPS, login, roles, PWA, robots, sitemap, headers and old-host compatibility smoke;
- only then decide whether to activate the compatibility redirect.
