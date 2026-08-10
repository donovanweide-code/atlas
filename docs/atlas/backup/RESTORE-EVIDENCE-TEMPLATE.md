# Restore Evidence — Template

**Status:** `DRAFT / PASS / PARTIAL / FAIL`  
**Test-ID:** `<opaque-id>`  
**Datum/tijd UTC:** `<ISO-8601>`  
**Organisatie-ID:** `<non-personal stable id>`  
**Environment:** `<local-isolated-validation>`  
**Capability:** `<service/capability>`  
**Human GO-referentie:** `<reference; never a secret>`

## 1. Scope and Safety Boundary

- testdoel:
- expliciet uitgesloten:
- productieverbindingen toegestaan: `nee`;
- productiecredentials gebruikt: `nee`;
- persoonsgegevensinhoud gerapporteerd: `nee`;
- testdata-/productiekopieclassificatie:

## 2. Test Object

| Field | Value |
|---|---|
| Backup register entry | `<id/reference>` |
| Backup type | `<provider/application/off-provider>` |
| Backup timestamp | `<ISO-8601>` |
| Size | `<bytes or secret-safe range>` |
| Integrity before | `<verified/failed/unknown; keep sensitive hash private>` |
| Encryption state | `<verified/documented/unknown>` |
| Decryption performed by | `<authorised human/tool boundary; no key detail>` |
| Source retained/cleanup plan | `<statement>` |

## 3. Isolation

- temporary runtime and data directory:
- network disabled or allowlist:
- listeners/connections check:
- access restrictions:
- production host/account exclusion:

## 4. Acceptance Criteria

| Criterion | Expected | Actual | Result |
|---|---|---|---|
| format/import |  |  | `PASS/FAIL` |
| completeness |  |  | `PASS/FAIL` |
| structural integrity |  |  | `PASS/FAIL` |
| relationships/references |  |  | `PASS/FAIL/N/A` |
| application compatibility |  |  | `PASS/FAIL/N/A` |
| security boundary | no production contact |  | `PASS/FAIL` |

Do not record row content, mail content, document content, credentials, keys, cookies or personal filenames.

## 5. Timing and Recovery Objective

| Measure | Value |
|---|---|
| Preparation/access time |  |
| Decryption/extraction time |  |
| Import/restore time |  |
| Validation time |  |
| Cleanup time |  |
| Total observed recovery time |  |
| Observed data age |  |
| RPO recommendation met | `yes/no/unknown` |
| RTO recommendation met | `yes/no/unknown` |

This observation is not a contractual SLA.

## 6. Findings and Blockers

- findings:
- deviations:
- root cause of failures:
- residual risk:
- required human action:

## 7. Cleanup

| Item | Result |
|---|---|
| temporary runtime stopped | `PASS/FAIL/N/A` |
| test database/data removed | `PASS/FAIL/N/A` |
| plaintext working copies removed | `PASS/FAIL/N/A` |
| logs checked secret-free then retained/removed per policy | `PASS/FAIL` |
| source object retained or removed as authorised | `PASS/FAIL` |
| integrity after test | `verified/failed/unknown` |
| production unchanged | `PASS/FAIL` |

## 8. Decision

- final status: `PASS / PARTIAL / FAIL`;
- what this test proves:
- what this test does not prove:
- next restore due:
- evidence reviewer:
- related attention/incident:

