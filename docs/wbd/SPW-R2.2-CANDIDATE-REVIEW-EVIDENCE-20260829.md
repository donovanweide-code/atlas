# Sportpaleis R2.2 — Candidate Review Runtime evidence

## Exact artifact

- Release: `SPW-EXPERIENCE-SIMPLIFICATION-CANDIDATE-R2.2-20260828`
- Commit: `42e8a70b38f45de9e1615173ba66c284cc1e74eb`
- Artifact SHA-256: `57486d6fcbdc0a3254565fdc660f902aae65a1a3852f832de4db77ca20b5bed5`
- Outer manifest SHA-256: `b2f334d991de7f0d32a46051051fd5be98410f3e5352169997419c5c68a1f560`
- Embedded manifest SHA-256: `8e993efc8b3c593c3cce0a9568514d415b686b2379e421c57c002d77fe3aa1a0`
- Verified embedded files: `415`

## Review Entry Gate

| Gate | Status | Evidence |
|---|---|---|
| Exact immutable artifact | PASS | Outer + embedded manifest en 415 files vóór start geverifieerd |
| Eigen Codex-principal | PASS | `wbd-review-codex`, zichtbaar als Codex Review & Development |
| Eigen GUI-login | PASS | Eenmalige activatie, eigen HttpOnly-cookie, geen Donovan-cookie |
| Juiste tenant | PASS | `sportpaleis` |
| GO/scope/TTL | PASS | `GO-WBD-REVIEW-ACCESS-R22-20260829`, vier beperkte scopes, 30 minuten |
| Disposable candidate datastore | PASS | State, backups en artifacts uitsluitend onder tijdelijke runtimeroot |
| Safe-interact | PASS | Contactcorrectie en Teamwear-compositie stateful uitgevoerd en na refresh heropend |
| Buiten scope fail-closed | PASS | Mail, hardware, deployment, credentials en productie-write-through zonder authority |
| Direct load/refresh/SPA/back-forward | PASS | URL en gerenderde view bleven gelijk; Teamwear persistence na refresh bewezen |
| Desktop/390/320 control | PASS | Echte Chrome-viewports bestuurbaar en interactief gebruikt |
| Audit | PASS | Evidence-eindpunt registreerde 47 acties voor de reviewprincipal |
| Normale sessies onaangeraakt | PASS | Geen Donovan/customer-session gebruikt of gewijzigd |
| Productie gemuteerd | NO | Alleen disposable candidate-state |
| Teardown | PASS | Grant-revoke + serverstop + verwijdering runtimeroot; endpoint daarna onbereikbaar |

## Productcoverage

| Surface/flow | Technisch | Visueel | Interactief | End-to-end | Verdict |
|---|---:|---:|---:|---:|---|
| Creative Studio canvas-first | PASS | PASS | PARTIAL | PARTIAL | Catalogusbron → canvas → opgeslagen composition → refresh bewezen; echte file transfer door Chrome-extensionpolicy niet bewezen |
| Teamwear context → collectie | PASS | PASS | PASS | PASS | Bestaande vereniging herkend; garment toegevoegd |
| Teamwear Studio → revision → klantpreview | PASS | PASS | PASS | PASS | Nummer 34 met defaults, logo, schaal 21%, V3/V4, refresh en klantpreview |
| Teamwear front/back | PASS | PASS | PASS | PARTIAL | Zijde wisselt correct; ontbrekend officieel achterbeeld eerlijk fail-closed |
| Vrije opdruk lijst/reeks/cardinality | PASS | PASS | PASS | PARTIAL | `1 t/m 3`, `99 x 2`, `MW` → exact zes objecten; externe productieactie bewust niet uitgevoerd |
| Vrije opdruk bulk kleur/font/maat | PASS | PASS | FAIL | FAIL | Bulk kleur selecteert Zwart maar objecten blijven Wit; bulk maatbediening ontbreekt |
| Productie-aandacht → vervolgactie | PASS | PASS | FAIL | FAIL | CTA navigeert naar een niet-bestaand/inhoudsloos `#productiegegevens`; ontbrekende waarheid wordt niet benoemd |
| Order contactcorrectie | PASS | PASS | PASS | PASS | Eén veld gewijzigd, opgeslagen, audit/persistence, artikelen en bedrukking behouden |
| Font toevoegen | PASS | PASS | NOT PROVEN | NOT PROVEN | Minimale UI aanwezig; echte file transfer geblokkeerd door lokale Chrome-extension file-accesspolicy |
| Mobiele navigatie 390/320 | PASS | PASS | FAIL | FAIL | Hamburger en menuactie werken; backdrop `Menu sluiten` sluit de drawer niet |
| Today/attention | PASS | PASS | PASS | PASS | Rolgebonden volgende actie en één relevante aandacht |

## Objectieve candidate-findings

1. `R2.2-BULK-001` — Vrije opdruk bulkselectie toont `Zwart` als geselecteerd, maar de zes geselecteerde objecten blijven `Wit`; er is bovendien geen bulk-hoogte/maatbediening.
2. `R2.2-MOBILE-001` — op 390px sluit de backdropknop `Menu sluiten` de drawer niet. De hamburger sluit wel en een normale menuactie navigeert zonder click-through.
3. `R2.2-PROD-001` — productie-aandacht zegt alleen “Bedrukking nog niet compleet”; `Bekijk wat nodig is` wijst naar `#productiegegevens`, maar toont geen concreet ontbrekend gegeven of herstelactie.
4. `R2.2-STATUS-001` — een Teamwear-revisiontoast bleef na SPA-navigatie zichtbaar op Bedrukken/Vrije opdruk; niet blokkend, wel contextueel onjuist.
5. `R2.2-IDENTITY-001` — de review-runtime toont exact R2.2 in releasetext/evidenceheaders, maar de immutable candidate-shell zelf labelt de omgeving als `LIVE`; hierdoor is externe evidence-identiteit nodig.

## Assurancebeperking

De officiële Chrome-binding kon de native filechooser openen, maar `setFiles` werd door de lokale extensionpolicy geweigerd (`Not allowed`). Daardoor zijn echte uploadbytes via de gerenderde UI **NOT PROVEN**. Runtime/API-tests voor de candidate-only uploadpolicy zijn wel groen; dat vervangt de ontbrekende browseracceptatie niet.

## Eindverdict

De generieke Review Runtime en Review Entry Gate zijn bewezen. R2.2 zelf is niet volledig end-to-end gereviewd als PASS: drie functionele/interactieve productfindings en één browser-uploadassurancebeperking blijven open. Er is geen R2.2-code gewijzigd en geen productie gemuteerd.

