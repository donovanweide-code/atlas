# Project 002C-WSP.2A — Provider, Contract, Cost & Phasing Verification

**Date:** 2026-08-07  
**Scope:** read-only provider, contract, cost and phasing assessment plus Workspace continuity  
**Status:** **ASSESSMENT GO — NO-GO for implementation, purchasing, provisioning and production**  
**Decision owner:** human review; every paid component and every external write requires a separate explicit GO

Evidence labels used below:

- **VERIFIED:** supported by the current repository or a current official provider source.
- **USER-SUPPLIED:** visible in screenshots supplied with this assessment; checkout/account status was not inspected.
- **ESTIMATE:** calculated or ranged; not an invoice or quote.
- **UNKNOWN:** account-only, contractual or operational fact requiring human verification.
- **HUMAN DECISION:** cannot responsibly be decided by this assessment alone.

All public provider prices are list prices observed on 2026-08-07. Unless stated otherwise, figures exclude VAT, payment fees and exchange-rate effects. USD conversions use the ECB reference visible during the assessment (EUR 1 = USD 1.1389; USD 1 ≈ EUR 0.878) only as an indicative comparison. Checkout is authoritative.

## 1. Executive summary

The cheapest professional and safe infrastructure WBD can use **today** is the existing local Workspace and existing TransIP estate, unchanged, while WS.1 and provider-neutral parts of WS.2/WS.3 are built locally after a separate GO. **Extra recurring cost now: €0/month.** Paying for a runtime, managed database, object store, paid monitoring or Cloudflare before a remote capability exists would violate the financial principle and reduce no current production risk.

For the first actual customer production, retain the WSP.1 managed direction but activate it later and more cheaply: DigitalOcean App Platform (1 GiB), DigitalOcean Managed PostgreSQL (1 GiB), private/versioned Spaces, WorkOS AuthKit free tier if privacy review passes, UptimeRobot Free, and small usage-based encrypted off-provider copies at TransIP. Indicative new recurring cost: **€27–32/month excluding VAT**, plus the existing TransIP bill. This removes OS/database operations from the single WBD operator.

The user-supplied screenshots are correctly identified as **UpCloud Starter**: €3/€6/€8/€10 configurations. They are useful evidence of a cheap raw-server option, but Starter is positioned by UpCloud for development, testing and self-hosting and carries a 99.99% SLA. It is not equivalent to a managed application platform. UpCloud remains a credible EU cost-first alternative, especially for an internal pilot, only if WBD explicitly accepts operating-system, process, security and incident ownership. UpCloud Premium plus managed database, versioned object storage and backups largely removes the apparent €3–€6 production advantage.

WSP.1 is therefore **phased, not discarded**: managed runtime/database/private storage remain the production direction; paid UptimeRobot is removed from the first-customer baseline; all infrastructure activation moves to the capability that needs it; Cloudflare remains optional and NO-GO; the current WBD shell is preserved and the Workspace continues through WS.1–WS.5.

## 2. WSP.1 recommendations under review

| WSP.1 recommendation | WSP.2A result | Timing |
|---|---|---|
| DigitalOcean App Platform AMS | Retain as default managed production runtime; not needed during local-only work | **ACTIVATE AT CUSTOMER 1** |
| DigitalOcean Managed PostgreSQL AMS | Retain for real central customer data; do not pay during local schema/repository work | **ACTIVATE AT CUSTOMER 1** |
| DigitalOcean Spaces private/versioned | Retain when real private documents are centrally stored | **ACTIVATE AT CUSTOMER 1**, not before documents exist |
| WorkOS AuthKit | Retain as managed preference conditional on DPA/transfer review; free pricing does not remove privacy decision | Prepare adapter locally; **ACTIVATE AT CUSTOMER 1** |
| UptimeRobot Solo | Change: Free is proportionate for the first external service | **FREE AT CUSTOMER 1; PAID DEFERRED** |
| TransIP registrar/DNS/public/preview/Experience | Retain unchanged and avoid double payment | **KEEP NOW** |
| TransIP Object Store for off-provider copies | Retain as usage-based candidate; verify private ACL/export/retention in a later preflight | **ACTIVATE WITH PRODUCTION DATA** |
| Cloudflare optional | Retain optional; no cutover or paid plan justified now | **DEFER** |
| UpCloud Starter/Premium | New comparison: valid raw-cloud alternative, not a like-for-like PaaS substitute | Pilot optional; production only after ops GO |

## 3. Financial principle

> **Architectuur mag voorbereid zijn op groei, maar kosten groeien mee met werkelijk gebruik.**

Every recurring component must answer: *which current customer, revenue, operational need or concrete risk reduction justifies this cost today?* “Later handig” is not a valid answer. Architecture is kept portable through standard Node.js, PostgreSQL, S3 and OIDC/OAuth boundaries; providers are activated only when the corresponding live capability exists.

## 4. Phase A — Now

Situation: local development, WBD internal Workspace, Sportpaleis as practice partner in development, no approved remote Workspace production.

**Decision:** use existing local tooling and existing TransIP services only. Define route/runtime, organisation, permission, repository, migration and object-storage interfaces locally. Use fixtures/local development data; do not represent them as shared production data.

| Component | Phase A action | Extra/month |
|---|---|---:|
| Runtime | Local existing runtime only | €0 |
| Central database | Local schema/migrations or test database only; no provider | €0 |
| Private object storage | Contract/fake adapter only; no real central private documents | €0 |
| Identity | Domain model and replaceable adapter only | €0 |
| Monitoring | Local health contract/tests; no external endpoint yet | €0 |
| Cloudflare | No action | €0 |

An optional remote WBD-internal pilot is a **separate future decision**, not “needed now”. UpCloud Starter 2 GiB/1 vCPU at the user-supplied €6/month plus backups could host such a pilot, but it would introduce self-managed server duties and must never be presented as customer-production proof.

## 5. Phase B — Customer 1 Live

Situation: Sportpaleis uses a real Workspace, possibly with multiple users and real customer data. Organisation isolation, professional recovery, private documents and external monitoring become mandatory.

Recommended activation:

1. DigitalOcean App Platform AMS, 1 GiB fixed shared CPU, $10/month.
2. DigitalOcean Managed PostgreSQL AMS3, 1 GiB/1 vCPU/10 GiB, $15.15/month; accept single-node availability explicitly.
3. DigitalOcean Spaces AMS, private, versioning and lifecycle enabled, $5/month.
4. WorkOS AuthKit, expected $0 below 1M MAU, after DPA/data-transfer/account-recovery review.
5. UptimeRobot Free for external HTTPS/health checks and alerting.
6. TransIP Object Store for client-side encrypted off-provider exports, usage-based after a restore test.

This is approximately $30.15 = €26.47 before TransIP usage, VAT and FX. With small off-provider storage and price uncertainty, budget **€27–32/month extra excluding VAT**.

This phase remains NO-GO until cross-organisation denial tests, private-object authorization, migration, backup, isolated restore, health, release/rollback and human production gates pass.

## 6. Phase C — Growth

Situation: several customer Workspaces (roughly 2–10, later 10–100), more users/documents and proven higher impact.

Do not activate a generic “growth package”. Scale by evidence:

- second runtime instance only for an agreed availability objective or measured load;
- larger/HA database only after connection, CPU, storage, recovery or SLO evidence;
- paid monitoring only when 5-minute detection/3-month history/single-seat operation is insufficient;
- paid WorkOS connections only when a paying customer requires enterprise SSO;
- more object storage only with actual documents;
- Cloudflare Pro only for a concrete WAF/performance/support need.

An indicative **growth baseline is €85–120/month extra excluding VAT** for duplicated runtime, materially stronger database availability, storage and paid monitoring. This is an estimate, not a purchase plan. At 10–100 organisations, re-price against real workload and revenue; enterprise SSO alone can add $125 per connection under current WorkOS pricing.

## 7. DigitalOcean runtime verification

DigitalOcean App Platform supports Git/container deployment, Node.js build/run, managed HTTPS, custom domains, environment variables/secrets, runtime logs, health checks, restarts and horizontal/vertical scaling in Amsterdam. Current public prices include $5/month for 512 MiB shared, $10/month for 1 GiB fixed shared and $12/month for 1 GiB scalable shared.

Important limitations:

- local filesystem is ephemeral (4 GiB); documents and durable data must be external;
- a single container is not high availability; App Platform HA requires at least two;
- no SSH/SFTP server administration;
- provider revisions and configuration are helpful, but database-compatible rollback remains WBD’s responsibility.

**Classification:** **ACTIVATE AT CUSTOMER 1.** The $5 tier is a possible synthetic/internal integration environment; $10/1 GiB is the safer customer-1 budget assumption. Exit is moderate: container/Node application, environment manifest and standard HTTP boundaries can move, but DO configuration/log history must be exported/recreated.

UpCloud comparison: Starter’s low euro prices are **USER-SUPPLIED** and supported by UpCloud’s official Starter launch/pricing material. UpCloud currently lists Starter as 99.99% and Premium as 99.999%. Both are cloud servers: WBD owns hardening, patching, firewall, Node lifecycle, reverse proxy, log rotation and incident response. For a customer workload, compare Premium—not Starter—and add database, storage and backups. **Alternative only after explicit operations-owner GO.**

## 8. Database verification

### Managed PostgreSQL

DigitalOcean’s minimum managed PostgreSQL configuration is currently $15.15/month for 1 GiB/1 vCPU/10 GiB. It provides TLS, managed maintenance/upgrades, monitoring and daily point-in-time recovery with seven-day retention. The 1 GiB tier has a documented 22 backend-connection limit and is single-node, not HA. Restore creates a new cluster; deleting the cluster deletes its provider backups, so off-provider logical exports remain necessary.

### Existing TransIP MySQL

The current Webhosting Pro account already has MySQL capacity, but 3/3 website slots are used, production Node is unproven and using a shared MySQL database would couple the Workspace to the public/Experience estate and require a PostgreSQL-to-MySQL application divergence. It is suitable only for existing workloads, not the new Workspace production foundation. Reuse here creates technical/security debt rather than a saving.

### Lower-cost professional alternatives

- **Neon Free:** PostgreSQL-compatible and useful for disposable development/integration, but 0.5 GiB and six-hour time travel are not a professional customer-production recovery baseline. Neon Launch is usage-based with no minimum and seven-day restore; it is a plausible later cost comparison, conditional on US-provider DPA/transfer review.
- **UpCloud Managed PostgreSQL Developer:** current official pages show approximately $8–$9/month for 1 GiB/1 vCPU and three-day PITR. Technical material describes the Developer option as single-node; marketing language and checkout must be reconciled. EU legal/entity positioning is attractive, but three-day retention is weaker than DO’s seven days.
- **Self-managed PostgreSQL on a VPS:** no separate database fee, but backups, upgrades, vacuuming, disk failure, encryption and recovery transfer to WBD. For one operator, this is not the default professional recommendation.

**Answer:** no, WBD should not pay €15+ in Phase A. Activate managed PostgreSQL only when durable shared production data or a realistic non-production integration proof requires it. Keep repositories/migrations PostgreSQL-compatible locally so this deferral does not create a rewrite.

## 9. Object storage verification

DigitalOcean Spaces costs $5/month and includes 250 GiB storage and 1 TiB outbound transfer. AMS is available. Buckets can be private; application authorization should issue short-lived server-authorized access rather than public URLs. Versioning is disabled by default and must be explicitly enabled; lifecycle rules and server-side encryption headers are supported. S3 compatibility makes export with standard tooling straightforward.

UpCloud Managed Object Storage also starts around $5/month/250 GiB and supports private ACL/policies, IAM, presigned URLs, S3 versioning and lifecycle policies. Its European regions physically reside in Finland, Germany or Sweden; Amsterdam accesses those regions over the private network. Official compatibility documentation says bucket-encryption API operations are unsupported while provider material states built-in AES-256 at rest/in transit; this needs a configuration/security check before selection.

TransIP Object Store currently lists €0.01/GB-month storage and €0.01/GB outgoing, with incoming/API requests free, excluding VAT. It is S3/SWIFT-compatible and data is triply stored in the Netherlands. This is compelling for small encrypted off-provider exports. Public evidence reviewed does not yet establish all required versioning/retention semantics for primary private documents, so it remains the off-provider candidate until a later read-only/isolated proof.

**Classification:** no paid object storage now. **ACTIVATE AT CUSTOMER 1** only when real private documents or production backups exist. Public document storage is NO-GO. Exit difficulty is low/medium when standard S3 keys, object manifests and export tests are maintained.

## 10. Identity/WorkOS verification

WorkOS AuthKit currently lists $0 up to 1M monthly active users; production still requires billing information. It supports hosted authentication, password recovery, MFA, sessions, organisations and roles/permissions. Custom domains are $99/month and enterprise SSO connections $125 each; neither is required for Phase A or ordinary first-customer login. Paid audit-log retention/streaming is also deferred.

WorkOS is a US company. Its DPA includes SCC/data-transfer mechanisms and subprocessors. A human must review data categories, transfer impact, retention/deletion, account recovery and whether WBD accepts identity processing outside an EU-only posture. Provider organisation IDs must remain external claims; WBD’s database keeps the canonical organisation, membership, role and permission records.

**Self-managed alternative:** Better Auth is open-source TypeScript software with password/session security, origin/CSRF protections, organisations and 2FA. License cost is €0, but WBD owns vulnerabilities, mail delivery, recovery, abuse/rate limiting and session operations. It is the fallback when EU/control requirements rule out WorkOS—not a saving versus a $0 WorkOS tier.

**Phase A preference:** implement only the internal identity/organisation/permission model and a replaceable provider adapter locally.  
**Customer-1 preference:** WorkOS after privacy/contract GO; Better Auth after a separate security/transactional-mail GO if WorkOS is rejected.  
**Provider outage:** existing sessions need bounded lifetime/revocation behavior; login/recovery may be unavailable, but tenant authorization must never fail open.

## 11. Monitoring verification

UptimeRobot Free permits commercial use, up to 50 monitors and five-minute checks for HTTP(S), keyword, ping, port and heartbeat, with alerts and three months’ retention. It needs no card. This is enough for the first external WBD Workspace if health/readiness endpoints are safe and release identity is independently recorded.

**Decision:** no paid monitoring in Phase A. Use Free when an external environment exists. Upgrade only when one-minute detection, more seats/integrations, longer history or an agreed SLO makes it materially necessary. WSP.1’s approximately $9/month Solo assumption is therefore deferred.

## 12. Cloudflare verification

Cloudflare Free provides authoritative DNS/CDN/TLS/DDoS and a limited WAF at $0; Free and Pro have no SLA. Pro is currently $20/month annually or $25 month-to-month. DNS query volume is not billed on Free/Pro/Business.

No Cloudflare activation is required to build or launch the Workspace on a provider-managed HTTPS origin. It may later add edge security/performance value, but it also adds DNS/proxy/cache/TLS and incident complexity. `002C.8 — Cloudflare WBD Edge Cutover` remains **NO-GO**. Paid Cloudflare is **DEFER UNTIL A CONCRETE REQUIREMENT**.

## 13. Existing TransIP reuse

### BESTAANDE KOSTEN DIE WE AL BETALEN

- `webuildanddesign.nl` domain/registrar and Webhosting Pro;
- the existing public WBD site, preview and Experience estate;
- `faraouderenzorg.nl` domain and Webhosting Core;
- current MySQL databases for their existing workloads;
- documented Webhosting Pro backups/restore route.

Exact invoice amounts are **UNKNOWN — human account check required**. This assessment does not invent them and did not access the account.

### NIEUWE EXTRA MAANDKOSTEN

No new cost is required now. TransIP remains unchanged. A future Workspace host record can stay in TransIP DNS. TransIP Object Store is added only when off-provider production copies justify usage charges. Existing MySQL is not forced into the Workspace merely because it is already paid; its runtime, isolation and engine mismatch are concrete reasons not to reuse it as the Workspace foundation.

## 14. Privacy/contract review

This is a technical/commercial inventory, not legal advice.

| Provider | Processing/DPA | Location/transfers | Export, closure, deletion | Human review |
|---|---|---|---|---|
| DigitalOcean | Processor DPA available; SCC/DPF mechanisms | AMS service region; subprocessors may include US services | Standard DB/PG/S3 exports; deletion/backup lifecycle must be tested | DPA, subprocessors, transfer impact, backup deletion |
| UpCloud | DPA incorporated through terms; Finnish contracting entity | EU cloud/DC positioning; only named group entities stated as subprocessors | Standard server image/PG/S3 export possible; closure/deletion evidence must be confirmed | DPA version, support access, deletion attestations |
| WorkOS | Processor DPA available | US provider, SCC/international transfers and subprocessors | User/org data and internal mappings need offboarding plan; deletion follows provider schedule | identity categories, TIA, recovery, retention |
| Better Auth | WBD is operator; library itself is not hosted provider | Depends on chosen runtime/DB/mail provider | Database export under WBD control | security ownership, mail provider, incident load |
| UptimeRobot | DPA available; EU company | primary EU, secondary US processing described | monitoring history/export/closure terms to confirm | alert metadata and transfer scope |
| Cloudflare | Customer DPA available | global edge/subprocessors and transfer terms | DNS config export is easy; logs/config/history differ by plan | proxy/log/data-transfer impact before cutover |
| TransIP | DPA available in control panel for acceptance | Dutch provider; Object Store data stated in NL | S3/SWIFT export; account-only retention/deletion terms to confirm | accept current DPA and verify object retention |
| Neon (alternative) | DPA/GDPR materials available | Frankfurt data region possible; US provider/subprocessors | standard PostgreSQL export | TIA, Free/Launch recovery suitability |

No provider may receive real customer data until the applicable DPA, data categories, subprocessors, support access, transfer basis, retention/deletion and exit procedure receive human approval.

## 15. Vendor lock-in / exit

Keep exit difficulty deliberately low:

- one modular Node/TypeScript application, not provider functions spread across services;
- PostgreSQL migrations and periodic `pg_dump`/restore proof;
- S3-compatible object keys plus database manifests, checksums and lifecycle metadata;
- identity adapter with internal canonical users/organisations/memberships;
- environment manifest and secret names outside source control;
- DNS remains independently controlled at TransIP;
- documented export before account closure and confirmation after deletion.

Runtime/monitoring exit is low/medium; database/object storage medium because data volume and downtime grow; identity exit is medium/high because password credentials and MFA factors may not be portable. Test export while data volume is small.

## 16. Cost model

### A. NU

| Existing/new | Provider/service | Necessary | Proven/estimated cost | Monthly | Annual | Justification |
|---|---|---|---|---:|---:|---|
| Existing | TransIP domains/hosting | Yes, unchanged | Account-only invoice unknown | **UNKNOWN** | **UNKNOWN** | Existing public/preview/Experience continuity |
| New | Workspace runtime/DB/storage/auth/monitoring | No | Deferred | **€0** | **€0** | No live capability or risk reduction today |

**MINIMUM SAFE COST NOW: €0/month extra.**

### B. KLANT 1 LIVE

| Provider/service | Necessary | Public list price | Indicative €/month | Annual | What justifies it |
|---|---|---:|---:|---:|---|
| DO App Platform 1 GiB | Yes | $10 | €8.78 | €105 | managed secure runtime; avoids single-owner OS operations |
| DO PostgreSQL 1 GiB | Yes | $15.15 | €13.30 | €160 | durable data, managed maintenance and 7-day PITR |
| DO Spaces | When documents live | $5 | €4.39 | €53 | private/versioned customer documents |
| WorkOS AuthKit | Yes after privacy GO | $0 under 1M MAU | €0 | €0 | login/MFA/recovery without self-built auth |
| UptimeRobot Free | Yes | $0 | €0 | €0 | external availability/health alerts |
| TransIP Object Store | Yes for production exports | €0.01/GB storage + €0.01/GB egress | €0.10–€1 estimate | €1–€12 | off-provider recovery copy |

**PROFESSIONAL CUSTOMER-1 COST: €27–32/month extra excluding VAT/FX; €324–384/year.**

### C. GROEI

| Trigger | Potential added component | Estimate/month | Justification |
|---|---|---:|---|
| Agreed availability/load | second runtime or larger instances | +€9–25 | remove single-instance risk/handle measured load |
| DB SLO/capacity | HA/larger managed PostgreSQL | +€35–70+ | failover, connections, storage/CPU evidence |
| Detection/history/team | paid monitoring | +€8–15 | faster checks, retention or operational seats |
| Customer enterprise SSO | WorkOS SSO connection | about €110 each at $125 | paying customer contractual requirement |
| More documents | storage above included tier | usage-based | actual data growth |

**GROWTH BASELINE: €85–120/month extra excluding VAT, or €1,020–1,440/year, for an early multi-customer HA posture; larger/SSO-heavy growth is re-priced from usage and revenue.**

## 17. Cost Gates

A component moves from **DEFER** to **ACTIVATE** only when at least one is evidenced:

1. a live capability technically requires it;
2. a paying customer requires it;
3. it mitigates a concrete relevant security/recovery risk;
4. existing capacity demonstrably cannot meet the requirement;
5. operational savings justify the recurring cost.

Every activation record must name the trigger, owner, price/term/VAT, cancellation path, data location/DPA, exit/restore evidence and review date. “Later handig” fails the gate.

## 18. Workspace continuity

Project 002C is an enabling boundary, not the product endpoint. Preserve the current WBD shell, visual language, organisation-first dossiers, invoice flow, Atlas provenance, human judgment and Candidate/Confirmed model. No rebuild is technically justified by current evidence.

Safe local parallel work after separate human GO:

- WS.1 route/application boundary in full;
- provider-neutral organisation/role/permission contracts from WS.2;
- schema, repositories, migrations and storage interfaces from WS.3 using local/test data;
- WS.4 mobile/navigation/typography after this visual baseline;
- WS.5 dynamic attention with fixtures once route/domain contracts are stable.

Provider-dependent: real remote identity, central production data, private documents, monitoring and production release. Home should evolve toward **attention rather than notifications**, not a loud generic dashboard.

## 19. Combined 002C + WS roadmap

| Order | Phase | Can start locally after GO? | Provider/new monthly cost? | Production? | Credits estimate | Risk |
|---:|---|---|---|---|---:|---|
| 0 | WS-VIS.0 + WSP.2A | Completed | No / €0 | No | €10–25 task estimate; actual unavailable | Low |
| 1 | **WS.1 + 002C-WSP.2B provider-neutral runtime contract** | Yes | No / €0 | No | €25–60 | Low/medium |
| 2 | WS.2 organisation/permission domain and identity adapter | Yes | No / €0 | No | €40–100 | Medium |
| 3 | WS.4 mobile shell/navigation/typography against baseline | Yes | No / €0 | No | €30–80 | Medium |
| 4 | WS.3 schema/repositories/migrations/private-object contract | Yes | No initially | No | €60–150 | Medium/high |
| 5 | 002C non-production integration environment | Partly | Yes, temporary/minimal; explicit GO | No | €60–150 | Medium/high |
| 6 | WS.5 dynamic Home/attention with fixtures, then real signals | Yes; real signals need WS.2/3 | No locally; provider later | No initially | €40–100 | Medium |
| 7 | 002C security/isolation/recovery proof | Needs integration services | Existing integration cost | No customer data | €60–130 | High |
| 8 | First production activation for WBD/Sportpaleis | No | Yes, €27–32/month target | Yes; explicit per-change GO | €40–100 | Very high |
| 9 | Projects/history, economics, finance, mail, personalisation | Mostly | By capability/cost gate | Later | separate preflights | Varies |
| 10 | Multi-organisation growth validation | No | Growth-priced | Yes | €50–125 | Very high |

Only one product phase should change visible shell behavior at a time, and each visible phase compares against WS-VIS.0.

## 20. Sportpaleis readiness

Sportpaleis is the first customer and Founding Practice Partner, not the platform, identity, database or infrastructure basis. Before live use it requires:

- generic WBD route/application boundary;
- canonical organisation and memberships with deny-by-default authorization;
- negative cross-tenant read/write/object tests;
- central PostgreSQL and private objects with migrations/backups;
- MFA/session/recovery path;
- isolated restore and export/delete proof;
- production monitoring and reversible release;
- human privacy, contract and production GO.

Costs attach when Sportpaleis actually consumes those live capabilities, not when its future use is merely discussed.

## 21. Human decision register

Decisions needed before the next implementation preflight:

1. Accept the financial principle and Cost Gates.
2. Confirm Phase A remains local-only; a remote internal pilot is not implicitly authorised.
3. Accept managed-operations preference (DigitalOcean) versus self-managed EU cost-first posture (UpCloud).
4. Choose identity privacy direction: WorkOS review or Better Auth operational ownership.
5. Define customer-1 RPO, RTO and whether single-node managed DB/runtime availability is acceptable.
6. Verify actual existing TransIP monthly invoices and later provider checkout prices/VAT.

Decisions deliberately deferred:

- exact provider account/package purchase;
- Cloudflare activation or paid tier;
- paid UptimeRobot;
- database HA/replicas;
- enterprise SSO/custom auth domain;
- multi-customer capacity and subscription infrastructure.

## 22. Risks

| Risk | Current control / gate |
|---|---|
| €3–€6 raw server mistaken for complete production | compare total stack and operator duties; Premium for customer production |
| Fixed costs precede customers | €0 Phase A and component Cost Gates |
| Single-node runtime/database outage | explicit Phase B availability acceptance; scale only at SLO gate |
| Cross-tenant disclosure | immutable organisation key, server authorization, negative tests |
| Provider backup lost with account/cluster | encrypted off-provider export plus isolated restore |
| Identity transfer/privacy mismatch | human DPA/TIA review; Better Auth fallback |
| Lock-in | Node/PostgreSQL/S3/identity adapters and tested exports |
| Visual rebuild erases strong shell | WS-VIS.0 and incremental WS.1–WS.5 |
| Dirty local state confused with release | baseline labelled current-state only; immutable candidate later |
| Growth estimates treated as quote | re-price at activation; checkout is authoritative |

## 23. Deferred costs

The following are explicitly **DEFER / ACTIVATE LATER**: any runtime/database/object store in Phase A; UptimeRobot Solo; Cloudflare Pro; runtime HA; database HA/read replicas; WorkOS enterprise SSO/audit-log paid features/custom domain; large storage tiers; Kubernetes/microservices; dedicated per-customer stacks; analytics/APM suites; multi-region disaster recovery.

## 24. Recommended immediate next steps

1. Human reviews this assessment, the WS-VIS.0 baseline and six decisions in section 21.
2. Human records GO/NO-GO for one next phase only: `WS.1 + 002C-WSP.2B — Route/Application Boundary & Provider-Neutral Runtime Contract`.
3. If GO, create a new preflight limited to local code/tests/documentation; no provider, account, package purchase, DNS or production work.
4. Separately inspect actual TransIP invoices and later checkout prices without changing subscriptions.
5. Keep provider activation behind the customer-1 capability gate.

### Preflight for the recommended implementation phase

- **Scope:** canonical `/workspace` application boundary, deterministic routes/fallbacks, production Node contract, health/readiness contract, configuration schema and provider-neutral deploy manifest; preserve existing shell.
- **Out of scope:** real auth, provider SDK, central production DB, object provisioning, DNS, Cloudflare, deployment, production writes and visual redesign.
- **Expected credits:** €25–60 indicative; actual eurocredits are not visible in this environment.
- **Risk:** low/medium; local application boundary can affect routing/build entry points.
- **Tests:** route matrix, direct/deep-link behavior, public/Experience separation, build/test regression, no WBD state in public bundle, health response contains no secrets.
- **Rollback:** revert only the files changed in that future isolated phase; retain WS-VIS.0 and route evidence. No shared worktree reset.
- **Exit gate:** separate review; no automatic follow-on to WS.2 or provider provisioning.

## 25. GO/NO-GO gates

| Gate | Result |
|---|---|
| WS-VIS.0 baseline | **GO** — actual local desktop/mobile baseline captured |
| WSP.2A assessment | **GO** — provider/cost/phasing decision record complete |
| Current Workspace as online daily/customer system | **NO-GO** |
| WS.1 + WSP.2B implementation | **NO-GO CURRENTLY — awaits explicit human GO** |
| Provider account, subscription or provisioning | **NO-GO** |
| WorkOS production activation | **NO-GO pending privacy/contract and identity-direction GO** |
| Sportpaleis production | **NO-GO pending WS.1–WS.3 and security/recovery proof** |
| Cloudflare 002C.8 cutover | **NO-GO** |
| Growth services | **DEFER; NO-GO until a Cost Gate passes** |

## Decision matrix

| Component | Provider | Needed now? | Customer 1? | Growth? | Extra €/month | Why | Alternative | Exit difficulty | Human GO |
|---|---|---|---|---|---:|---|---|---|---|
| Runtime | DO App Platform | No | Yes | Scale by evidence | €8.78 B | managed operations | UpCloud Premium/self-managed | Low/medium | Yes |
| Database | DO Managed PG | No | Yes | HA/larger by evidence | €13.30 B | central durable data/PITR | UpCloud PG, Neon Launch | Medium | Yes |
| Documents | DO Spaces | No | When real docs | Scale usage | €4.39 B | private/versioned objects | UpCloud MOS; TransIP after proof | Low/medium | Yes |
| Off-provider copy | TransIP Object Store | No | Yes | Scale usage | €0.10–1 est. | provider-independent recovery | second S3 provider | Low | Yes |
| Identity | WorkOS | Model only | Yes | paid SSO if sold | €0 B | MFA/session/recovery | Better Auth | Medium/high | Yes |
| Monitoring | UptimeRobot Free | No endpoint | Yes | paid if justified | €0 B | external health/alert | provider probe | Low | Yes for activation |
| Edge | Cloudflare | No | Optional | Maybe | €0 Free; paid deferred | only concrete edge value | TransIP DNS/direct origin | Medium | Yes |
| Existing estate | TransIP | Yes | Yes | Yes | existing, unknown | avoid double payment | none now | Medium | Any change: yes |

## Source register

Primary official sources used in the assessment:

- DigitalOcean: [App Platform pricing](https://docs.digitalocean.com/products/app-platform/details/pricing/), [availability](https://docs.digitalocean.com/products/app-platform/details/availability/), [limits](https://docs.digitalocean.com/products/app-platform/details/limits/), [custom domains](https://docs.digitalocean.com/products/app-platform/how-to/manage-domains/), [Managed Database pricing](https://www.digitalocean.com/pricing/managed-databases), [PostgreSQL limits](https://docs.digitalocean.com/products/databases/postgresql/details/limits/), [PostgreSQL backup restore](https://docs.digitalocean.com/products/databases/postgresql/how-to/restore-from-backups/), [Spaces pricing](https://docs.digitalocean.com/products/spaces/details/pricing/), [Spaces versioning](https://docs.digitalocean.com/products/spaces/how-to/enable-versioning/), [DPA](https://www.digitalocean.com/legal/data-processing-agreement) and [subprocessors](https://www.digitalocean.com/trust/subprocessors).
- UpCloud: [Cloud Server pricing](https://upcloud.com/global/pricing/), [Starter/Premium introduction](https://upcloud.com/global/blog/introducing-starter-and-premium-plans/), [data centres](https://upcloud.com/data-centers/), [Managed Databases](https://upcloud.com/global/products/managed-databases/), [PostgreSQL backups](https://upcloud.com/docs/products/managed-postgresql/backups/), [Managed Object Storage S3 compatibility](https://upcloud.com/docs/products/managed-object-storage/s3-standard-compatibility/), [Object Storage availability](https://upcloud.com/docs/products/managed-object-storage/availability/), [security/privacy](https://upcloud.com/global/security-privacy/) and [EU Data Act information](https://upcloud.com/global/eu-data-act/).
- TransIP: [webhosting](https://www.transip.nl/webhosting/), [Public Cloud/Object Store pricing](https://www.transip.nl/public-cloud/prijzen/), [Object Store](https://www.transip.nl/object-store/), [availability/SLA](https://www.transip.nl/legal-and-security/beschikbaarheid/), [terms](https://www.transip.nl/legal-and-security/algemene-voorwaarden/) and [DPA guidance](https://www.transip.nl/knowledgebase/legal/946-verwerkersovereenkomsten-bij-transip).
- WorkOS: [pricing](https://workos.com/pricing), [environments](https://workos.com/docs/authkit/environments), [MFA](https://workos.com/docs/authkit/mfa), [sessions](https://workos.com/docs/authkit/sessions), [organisations](https://workos.com/docs/authkit/users-organizations), [roles](https://workos.com/docs/authkit/roles-and-permissions), [DPA](https://workos.com/legal/data-processing-addendum) and [policies](https://workos.com/legal/policies).
- Better Auth: [introduction](https://better-auth.com/docs/introduction), [installation](https://better-auth.com/docs/installation), [security](https://better-auth.com/docs/reference/security), [2FA](https://better-auth.com/docs/plugins/2fa) and [pricing](https://better-auth.com/pricing).
- UptimeRobot: [pricing](https://uptimerobot.com/pricing/), [Free-plan guide](https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan), [retention](https://help.uptimerobot.com/en/articles/11360873-what-is-uptimerobot-data-retention-and-how-does-it-work-in-different-plans) and [DPA](https://uptimerobot.com/dpa/).
- Cloudflare: [plans](https://www.cloudflare.com/plans/), [Free plan](https://www.cloudflare.com/en-gb/plans/free/), [DNS FAQ](https://developers.cloudflare.com/dns/faq/) and [customer DPA](https://www.cloudflare.com/en-gb/cloudflare-customer-dpa/).
- Neon: [pricing](https://neon.com/pricing), [usage-based pricing update](https://neon.com/blog/new-usage-based-pricing), [subprocessors](https://neon.com/subprocessors) and [DPA](https://neon.com/pdf/DPA.pdf).
- Currency comparison only: [ECB euro reference rates](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html).

## Validation and final status

- No production, infrastructure, provider account, subscription, TransIP, DNS, Cloudflare, database or storage configuration was changed.
- No account, secret, password, recovery code or credential was accessed or created.
- No package was installed and no deployment was performed.
- No application code or CSS was changed for this assessment.
- Screenshots use the actual existing local Workspace, not mock-ups, and are explicitly non-functional baseline evidence.
- Sportpaleis remains a customer/practice partner, not the infrastructure basis.
- Costs are phased and existing paid capacity is included without inventing account-only amounts.
- Actual Codex eurocredits are **not visible**; the preflight’s €10–25 estimate is retained, but no realised amount is claimed.

**STOP:** wait for human review and an explicit, phase-specific GO. Do not implement automatically.
