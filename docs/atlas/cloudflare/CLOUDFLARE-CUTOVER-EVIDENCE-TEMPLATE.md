# Cloudflare Cutover Evidence Template

Dit sjabloon voert niets uit. Gebruik het alleen na afzonderlijke Human GO voor 002C.8.

## Identification

- Cutover ID: `[ID]`
- Zone: `[ZONE]`
- Organisation/environment: `[ORG / PRODUCTION]`
- Human authority: `[ROLE]`
- Execution lead: `[ROLE]`
- Planned window: `[START / END]`
- Current state: `[A / B / C / D / E / F / G]`
- Human GO reference: `[REFERENCE]`

## Pre-cutover gates

- [ ] Canonical source export and Cloudflare export secured off-provider.
- [ ] Record reconciliation status is `APPROVED`, with zero mismatch/unknown.
- [ ] Independent edge, origin, DNS, TLS and application monitoring is active.
- [ ] Mail-DNS checks and human send/receive test are planned.
- [ ] Account owner, 2FA, recovery and DPA/privacy review are confirmed.
- [ ] Full (strict) origin certificate and renewal route are confirmed.
- [ ] Current NS, NS TTL, DS state and DS TTL are recorded.
- [ ] Rollback values and decision owner are present.
- [ ] DNS/mail/canonical/deployment change freeze is active.

## State transition log

| Time | From → To | Human GO | Action class | Public observation | Result | Rollback status | Evidence |
|---|---|---|---|---|---|---|---|
| `[ISO]` | `[A→C]` | `[REF]` | `[DNSSEC/NS/DS/PROXY]` | `[SECRET-FREE]` | `[PASS/FAIL/STOP]` | `[READY/EXECUTED/N/A]` | `[REF]` |

Never store account identifiers, API credentials, recoverycodes, private keys, full sensitive TXT verification values or session data.

## Validation matrix

| Control | Direct authoritative | Public validating resolver(s) | HTTP/TLS/application | Result |
|---|---|---|---|---|
| NS delegation | `[ ]` | `[ ]` | n.v.t. | `[ ]` |
| DS/DNSKEY/RRSIG | `[ ]` | `[ ]` | n.v.t. | `[ ]` |
| Apex/`www` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Preview | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Experience | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| MX/SPF/DKIM/DMARC | `[ ]` | `[ ]` | human mailtest `[ ]` | `[ ]` |
| Edge versus origin | n.v.t. | n.v.t. | `[ ]` | `[ ]` |
| Security/cache headers | n.v.t. | n.v.t. | `[ ]` | `[ ]` |

## Rollback decision

- Trigger: `[NONE / SERVFAIL / DNS / MAIL / TLS / APP / WAF / CACHE / UNCLEAR STATE]`
- State-aware rollback route: `[PROXY DNS-ONLY / RECORD REPAIR / REMOVE CF DS THEN NS ROLLBACK / NS ROLLBACK THEN RESTORE TRANSIP DNSSEC]`
- Authorised by: `[ROLE + REFERENCE]`
- Started/completed: `[ISO / ISO]`
- Validation result: `[PASS / FAIL / ATTENTION]`

## Closure

- Final state: `[A / B / C / D / E / F / G]`
- Production impact: `[NONE / DESCRIPTION]`
- Temporary access closed: `[YES / N/A / HUMAN VERIFICATION REQUIRED]`
- Open attention: `[NONE / REFERENCES]`
- Observation window end: `[ISO]`
- Final Human review: `[GO / NO-GO + REFERENCE]`

