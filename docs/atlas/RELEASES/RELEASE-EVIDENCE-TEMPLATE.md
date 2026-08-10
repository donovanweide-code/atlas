# WBD Release Evidence — Template

> Maak per release een nieuwe kopie. Verwijder geen secties. Gebruik `N/A — <reden>` waar iets aantoonbaar niet van toepassing is. Dit document geeft zelf geen deploymenttoestemming.

## 1. Status en scope

| Veld | Waarde |
|---|---|
| Release status | `DRAFT / PRE-FLIGHT PASS / HUMAN GO / DEPLOYING / VALIDATING / GO / NO-GO / ROLLED BACK` |
| Release-ID | `<family>-<YYYYMMDDTHHmmssZ>-<commit7>` |
| Releasefamily | `public-site / experience / anders na expliciete goedkeuring` |
| Environment-ID | `local-development / preview-public / production-public / production-experience` |
| Exacte target-URL | `<url>` |
| Scope | `<exacte wijzigingen>` |
| Expliciet buiten scope | `<niet gewijzigde onderdelen>` |
| Productie-/data-impact | `geen / laag / middel / hoog + toelichting` |

**STOP als environment, target-URL of scope niet ondubbelzinnig zijn.**

## 2. Release identity

| Veld | Waarde |
|---|---|
| Volledige source commit | `<40-teken commit>` |
| Branch, alleen informatief | `<branch>` |
| Candidate vastgelegd op | `<ISO-8601 UTC>` |
| Broncontext | `isolated git archive / schone worktree / anders met bewijs` |
| Buildcommando('s) | `<commando's>` |
| Artefact | `<pad/naam>` |
| Artefactbytes | `<aantal>` |
| Artefact SHA-256 | `<hash>` |
| Manifest | `<pad/naam>` |
| Manifest SHA-256 | `<hash>` |
| Verwachte entrypoints/assets | `<concrete namen/hashes>` |

## 3. Environment declaration

| Veld | Waarde |
|---|---|
| Voorgenomen operatie | `read-only validation / upload candidate / activate / rollback / database migration` |
| Candidate DocumentRoot/target | `<expliciet pad of N/A>` |
| Actieve DocumentRoot vóór deploy | `<read-only bevestigd pad of N/A>` |
| Rollback-DocumentRoot | `<read-only bevestigd pad of N/A>` |
| Bevestigingsbron en tijd | `<bron + ISO-8601>` |
| Productieconfig benodigd | `nee / alleen aanwezigheid controleren / menselijke handeling vereist` |
| Externe credential benodigd | `nee / menselijke handeling vereist; geen waarde opnemen` |

## 4. BEFORE DEPLOY — lokale validatie

| Controle | Resultaat | Bewijspad / samenvatting |
|---|---|---|
| Gekozen source commit bestaat | `PASS / FAIL` | `<bewijs>` |
| Schone/geïsoleerde bron | `PASS / FAIL` | `<bewijs>` |
| Gerichte tests | `PASS / FAIL / N/A` | `<aantal>` |
| Volledige relevante regressie | `PASS / FAIL` | `<aantal>` |
| TypeScript/build | `PASS / FAIL` | `<commando>` |
| Public-only of Experience-packagegrens | `PASS / FAIL / N/A` | `<resultaat>` |
| Artefact tegen manifest | `PASS / FAIL` | `<hash/resultaat>` |
| Verwachte assets/entrypoints | `PASS / FAIL` | `<resultaat>` |
| Config-aanwezigheid zonder waarden | `PASS / FAIL / N/A` | `<alleen metadata>` |
| Target/rollback read-only bevestigd | `PASS / FAIL` | `<resultaat>` |

## 5. Database change boundary

| Veld | Waarde |
|---|---|
| Classificatie | `NONE / ADDITIVE_COMPATIBLE / BEHAVIORAL / DESTRUCTIVE_OR_IRREVERSIBLE` |
| Tabellen/data geraakt | `<metadata, geen inhoud>` |
| Migratiebestand en SHA-256 | `<pad/hash of N/A>` |
| Pre-migratieback-up verplicht | `ja / nee + reden` |
| Concrete backup en integriteitsbewijs | `<pad/hash/status of N/A>` |
| Vorige app compatibel met nieuw schema | `bewezen ja / nee / onbekend` |
| Herstel-/down-migratieplan | `<referentie of N/A>` |
| Geïsoleerde rehearsal | `<bewijs of N/A>` |
| Afzonderlijke DB-GO | `<referentie of N/A>` |

**UNKNOWN database-impact betekent NO-GO. Destructieve migratie vereist een afzonderlijke expliciete GO.**

## 6. Preflight evidence

| Veld | Waarde |
|---|---|
| Validatieprofiel | `<pad>` |
| Profiel SHA-256 | `<hash>` |
| Definitieve vorige identiteit | `<asset/hash>` |
| Definitieve kandidaatidentiteit | `<asset/hash>` |
| Controlehost | `<url>` |
| Rapport route 1 | `<pad/hash/networkContext/tijd>` |
| Rapport route 2 | `<pad/hash/networkContext/tijd>` |
| Bewijsleeftijd binnen limiet | `PASS / FAIL` |
| Evaluatie | `Pass / Probe invalid / Validation failed / Production failed` |
| Besluit | `switch-eligible / STOP` |

Alleen exact `Pass` kan naar Human GO. Iedere andere uitkomst is STOP.

## 7. Human GO

### Exact voorgenomen handelingen

1. `<handeling 1>`
2. `<handeling 2>`
3. `<handeling 3 of N/A>`

| Veld | Waarde |
|---|---|
| GO door | `<menselijke beslisser>` |
| GO-referentie | `<ondubbelzinnige bevestiging>` |
| GO-tijd | `<ISO-8601>` |
| Goedgekeurd artefact + SHA-256 | `<exact>` |
| Goedgekeurd target | `<exact>` |
| Goedgekeurde DB/config-impact | `<exact>` |
| Rollbackroute | `<exact>` |

**Zonder ingevulde Human GO wordt niets externs gewijzigd.**

## 8. DEPLOY — uitvoeringslog

| Tijd | Handeling | Resultaat | Externe mutatie |
|---|---|---|---|
| `<ISO-8601>` | `<handeling>` | `<resultaat>` | `ja/nee` |

| Veld | Waarde |
|---|---|
| Werkelijk upload-/deployartefact | `<naam + SHA-256>` |
| Werkelijke candidate target | `<pad>` |
| Switch aangevraagd op | `<vast ISO-8601-tijdstip>` |
| Onverwachte afwijking | `<nee / beschrijving + STOP-besluit>` |

Geen code-, scope- of artefactwijziging tijdens deployment. Bij afwijking: STOP en nieuw preflightbesluit.

## 9. AFTER DEPLOY — real environment validation

| Controle | Resultaat | Bewijs |
|---|---|---|
| Werkelijke target-URL | `PASS / FAIL` | `<url>` |
| DNS/transport/TLS/HTTP | `PASS / FAIL` | `<rapport>` |
| Kandidaatidentiteit | `PASS / FAIL` | `<bodyhash/assets>` |
| Vereiste stabiele rondes | `PASS / FAIL` | `<activatierapport>` |
| Onafhankelijke netwerkcontexten | `PASS / FAIL` | `<contexts>` |
| Controlehost | `PASS / FAIL` | `<rapport>` |
| Kernroutes | `PASS / FAIL` | `<routes>` |
| Kritieke functionaliteit | `PASS / FAIL / N/A` | `<read-only of gecontroleerde test>` |
| Browserconsole | `PASS / FAIL / N/A` | `<samenvatting>` |
| Server/runtimefouten | `PASS / FAIL / N/A` | `<secretvrije samenvatting>` |
| Desktop | `PASS / FAIL / N/A` | `<bewijs>` |
| Mobiel | `PASS / FAIL / N/A` | `<bewijs>` |
| Database-/sessie-integriteit | `PASS / FAIL / N/A` | `<metadata>` |
| Menselijke livecontrole | `PASS / FAIL` | `<bevestiging>` |

Een screenshot is alleen aanvullend bewijs. De echte URL en release-identiteit moeten technisch zijn aangetoond.

## 10. ROLLBACK TRIGGER / besluit

| Signaal | Waargenomen | Actie |
|---|---|---|
| `Propagation pending/converging` binnen budget | `ja/nee` | wachten; niets wijzigen |
| `Candidate stabilizing` | `ja/nee` | wachten op stabiele rondes |
| `Activation timeout` | `ja/nee` | vorige root herstellen; niet automatisch als productiefout rapporteren |
| `Production failed` via voldoende routes | `ja/nee` | rollback |
| Onbekend/beschadigd artefact | `ja/nee` | rollback/STOP volgens bewijs |
| Kritieke data- of securityfout | `ja/nee` | writes stoppen waar beheerst mogelijk; menselijke beslissing |
| Probe invalid of strijdig bewijs | `ja/nee` | STOP; meetroute herstellen; geen automatische rollback |

### Indien rollback uitgevoerd

| Veld | Waarde |
|---|---|
| Menselijke rollback-GO | `<referentie>` |
| Applicatierollback | `<handeling/resultaat>` |
| Databaserollback | `<apart besluit/resultaat of N/A>` |
| Config/infrastructuurrollback | `<apart besluit/resultaat of N/A>` |
| Vorige release live bevestigd | `<bewijs>` |

## 11. Final release decision

| Veld | Waarde |
|---|---|
| Eindstatus | `GO / NO-GO / ROLLED BACK` |
| Werkelijke live release-ID | `<technisch bewezen ID>` |
| Werkelijke live source commit | `<commit>` |
| Actieve DocumentRoot/target | `<pad>` |
| Productieversie bevestigd op | `<ISO-8601>` |
| Beslisser | `<mens>` |
| Resterende risico's | `<concreet, of geen>` |
| Vervolgactie | `<concreet, of geen>` |

## 12. Security and scope confirmation

- [ ] Geen secrets, tokens, cookies, private keys, recoverycodes of `.env`-waarden vastgelegd.
- [ ] Alleen de expliciet goedgekeurde externe handelingen zijn uitgevoerd.
- [ ] Geen stilzwijgende DNS-, SSL-, Cloudflare-, account- of rechtenwijziging.
- [ ] Geen productiegegevens naar preview of gewone lokale development gekopieerd.
- [ ] Tijdelijke toegang is volgens het afzonderlijke securityrunbook ingetrokken en secretvrij bevestigd, of `N/A` met reden.
- [ ] Alle evidencepaden en hashes zijn controleerbaar.

