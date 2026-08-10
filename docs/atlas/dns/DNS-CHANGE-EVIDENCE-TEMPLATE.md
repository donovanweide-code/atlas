# DNS / Mail-auth Change Evidence — Template

**Change-ID:** `<opaque-id>`  
**Datum/tijd UTC:** `<ISO-8601>`  
**Organisatie-ID:** `<stable non-personal id>`  
**Zone:** `<domain>`  
**Class:** `0 / 1 / 2 / 3 / 4`  
**Human GO:** `<reference; never a secret>`

## 1. Scope

- doel:
- record(s)/routingcomponent:
- productie-/web-/mailimpact:
- expliciet uitgesloten:
- owner en uitvoerder:

## 2. Before Change

| Evidence | Result/reference |
|---|---|
| secretvrije zone-export |  |
| private volledige export veilig opgeslagen | `human-confirmed / N/A` |
| current authoritative answer |  |
| current public resolver answers |  |
| DNSSEC/DS status |  |
| current TTL/cache budget |  |
| web/mail dependencies verified |  |
| exact previous value, privately retained where sensitive |  |
| exact proposed value, masked in this document if needed |  |
| rollback value/procedure |  |
| monitoring/maintenance context |  |

No verification token, cookie, credential, mail content, private key or raw DMARC report belongs in this file.

## 3. Execution

| Field | Value |
|---|---|
| provider/control plane |  |
| change started at |  |
| change completed at |  |
| exact logical action |  |
| unrelated changes | `none` |
| execution result | `PASS / PARTIAL / FAIL` |

## 4. Validation

| Check | Expected | Actual | Result |
|---|---|---|---|
| authoritative DNS |  |  |  |
| public resolver 1 |  |  |  |
| public resolver 2 |  |  |  |
| DNSSEC |  |  |  |
| HTTP/redirect/TLS/canonical |  |  |  |
| mail send/receive |  |  |  |
| SPF/DKIM/DMARC alignment |  |  |  |
| monitoring/incident state |  |  |  |
| elapsed TTL/observation budget |  |  |  |

## 5. Rollback

- rollback trigger:
- rollback authorised by:
- exact rollback action:
- rollback performed at:
- post-rollback validation:

## 6. Decision

- final state: `GO / NO-GO / ROLLED BACK / OBSERVING`;
- evidence summary:
- residual risk:
- next review:
- human reviewer:

