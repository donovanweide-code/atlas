# Cloudflare Zone Reconciliation Template

Status: `[DRAFT / HUMAN REVIEW REQUIRED / APPROVED]`  
Zone: `[ZONE]`  
Organisation: `[ORGANISATION_ID]`  
TransIP export time: `[ISO 8601]`  
Cloudflare preparation time: `[ISO 8601]`  
Reviewer role: `[HUMAN ROLE]`

Dit document vergelijkt configuratie, maar autoriseert geen import, DNS-, DNSSEC-, nameserver- of proxywijziging. Zet geen account-ID, login, API-token, recoverycode, private key of volledige gevoelige verificatiewaarde in Git.

## Source evidence

- TransIP source export stored off-provider: `[YES / NO / HUMAN VERIFICATION REQUIRED]`
- Public DNS snapshot reference: `[REFERENCE]`
- Prepared Cloudflare export reference: `[REFERENCE / NOT CREATED]`
- Current authoritative nameservers fingerprint/reference: `[REFERENCE]`
- Current DS state and TTL: `[STATUS + TTL; NO DIGEST REQUIRED]`
- All Cloudflare imports configured proxy-off: `[YES / NO / NOT CREATED]`

## Record reconciliation

Gebruik één regel per record. Voor niet-gevoelige A/AAAA/CNAME/MX kan de genormaliseerde waarde in beveiligd operationeel bewijs staan. Voor verificatie-TXT en vergelijkbare waarden gebruikt repositorybewijs alleen `MATCH`, `MISMATCH` of een hash.

| ID | Name | Type | Source TTL | Source value class/hash | CF value class/hash | Priority | Proxy class | Match | Owner/purpose | Evidence | Attention |
|---|---|---|---:|---|---|---:|---|---|---|---|---|
| `DNS-001` | `[HOST]` | `[A/AAAA/CNAME/MX/TXT/CAA/...]` | `[TTL]` | `[CLASS/HASH]` | `[CLASS/HASH]` | `[N/A/NUMBER]` | `[PROXIED_LATER/DNS_ONLY/DO_NOT_PROXY/UNKNOWN]` | `[MATCH/MISMATCH/UNKNOWN]` | `[PURPOSE]` | `[REF]` | `[NONE/DETAIL]` |

## Required category totals

| Category | TransIP count | Cloudflare count | Exact match | Status |
|---|---:|---:|---:|---|
| A | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| AAAA | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| CNAME | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| MX | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| TXT/SPF | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| DKIM | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| DMARC | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| CAA | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| NS/delegations | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| wildcard | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| verification/service records | `[ ]` | `[ ]` | `[ ]` | `[ ]` |

## Proxy classification gates

| Class | Meaning | Mandatory gate |
|---|---|---|
| `PROXIED_LATER` | HTTP(S)-webtraffic; orange cloud only after DNSSEC/TLS/app validation | separate proxy GO |
| `DNS_ONLY` | record remains authoritative at Cloudflare but bypasses reverse proxy | exact record match |
| `DO_NOT_PROXY` | mail, FTP/SFTP/SSH, database, verification or other incompatible service | human classification review |
| `UNKNOWN` | purpose or compatibility not proven | cutover blocker |

## Human review

- [ ] Every TransIP record has exactly one explained Cloudflare outcome.
- [ ] Every Cloudflare record has a known source or approved reason.
- [ ] MX/SPF/DKIM/DMARC/autoconfig/autodiscover are preserved.
- [ ] Verification records are DNS-only and value-matched.
- [ ] Wildcard behavior is explicitly understood and kept DNS-only.
- [ ] Apex, `www`, preview and Experience start DNS-only.
- [ ] No canonical, mail, CAA or wildcard cleanup is combined with cutover.
- [ ] Any `MISMATCH` or `UNKNOWN` blocks cutover.

Review result: `[GO / NO-GO]`  
Reviewed at: `[ISO 8601]`  
Evidence reference: `[REFERENCE]`

