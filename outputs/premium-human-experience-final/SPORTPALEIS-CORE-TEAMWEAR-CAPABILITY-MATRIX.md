# Sportpaleis core + Teamwear capability matrix

Bijsturing gereconcilieerd op 26 augustus 2026 tegen kandidaatbranch `codex/spw-final-consolidation-20260825`, live release `SPW-PREMIUM-HUMAN-EXPERIENCE-FINAL-R1-20260826`, de 97-punts consolidatie, de herstelde Teamwear-bron en de historische production-practice suites.

| Capability | Requirement/source | Existing implementation | Current live/consolidated state | Regression evidence | Browser/live evidence | Known historical defect | Action required |
|---|---|---|---|---|---|---|---|
| Winkel / dagelijkse operatie | Final Consolidation; Part 1; bijsturing §1 | Session/role-scoped Today, Orders, Search and orderdetail | Live R1 actief; operationele clean start, testdata achter expliciet filter | first-day, shell, role and history suites PASS | Live Chrome: Donovan/Beheerder; Today, Orders, Webshop, Search renderen zonder recovery state | Dagelijkse werkset vervuild door pilot/historie | NO |
| Sync / data | Final Consolidation; bijsturing §2 | Stage-only websitecontrole, source provenance, cursors/dedupe, beheerstatus | Live Beheer toont laatste controle en concrete route; bronconfig blijft authoritative | beheer/sync suites PASS | Live Chrome: Beheer → Websitecontrole vindbaar | Legacy syncaudit/spam; onverklaarde ontbrekende bronitems | NO |
| Standalone Bedrukken | Part 1 §1–3; bijsturing §3 | Bestaande contextgestuurde ordercomposer en dezelfde productiehandoff | Candidate sluit speciale create-routes uit van detailloader | first-day regression bevat expliciete routeguard | Live R1 direct `/orders/nieuw`: herstelweergave; interne SPA-route werkt | `/orders/nieuw` werd als order-ID `nieuw` geladen | **YES — minimale candidatefix gereed; live bewijs na release** |
| Vrije opdruk | Part 1 §2; bijsturing §4 | Vrije/partieel bekende opdracht gebruikt bestaande decoration- en production-foundation | Candidate sluit `/orders/eigen-artikel` uit van detailloader | first-day + production suites PASS | Live R1 direct `/orders/eigen-artikel`: herstelweergave en onderliggende composer zichtbaar | Speciale create-route werd als orderdetail geladen | **YES — dezelfde minimale candidatefix gereed; live bewijs na release** |
| Productie | Final Consolidation; bijsturing §5 | Attention/Ready/In production/Done, proposal, Human GO, PlotJob en audit | Live R1 operationeel en leeg na clean start | production practice/happy-path suites PASS | Live Chrome `/productie`: Productie en Nu maken zonder recovery state | OPEN kleuren verdwenen; waiting kleur leek busy | NO |
| SVG / Plot output | Production practice; bijsturing §6 | Immutable CutJob/SVG met profile, asset/hash, dimensions, mirror, placement en provenance | Live foundation behouden | direct-print, R8 and production-practice suites PASS | Live Bibliotheek toont gecontroleerde Pioneers/Hockey-bronnen; artefactgeneratie niet live gemuteerd | Fontfallback, duplicate 19, missing blue 34 | NO |
| Cut grouping | Laatste production-practice invariant; bijsturing §6 | Deterministische fysieke banden per decoration type, daarna nesting binnen band | Candidate/live foundation behouden | `sportpaleis-human-review-corrections-teamorder-v1.test.mjs` PASS | Geen live productiejob aangemaakt; browseracceptance bewust non-destructief | Initialen tussen grote rugnummers door maximale packing | NO |
| Historie / reprint | Final Consolidation; bijsturing §7 | Immutable execution, artifact/hash, layout, profile/version en linked auditable reprint | Live R1 bounded history | history/reprint/integrity suites PASS | Live Chrome `/productie/historie`: bestaande PlotJobs zichtbaar, geen recovery state | Dagelijkse bootstrap laadde groeiende historie | NO |
| Statusflow | Final Consolidation; bijsturing §8 | Bedrukt per fysieke stap; eligibility; expliciet Afronden; direct pickup-ready; bulk guard | Live foundation behouden | lifecycle/bulk completion suites PASS | Today/Orders/Productie renderen clean; geen live statusmutatie uitgevoerd | Premature completion en overbodige dubbele handeling | NO |
| Mail / klantcommunicatie | Final Consolidation; bijsturing §9 | Bestaande WBD Mail Foundation, source-specific triggers en dedupe | Parallelle Mail Foundation onaangeraakt | Sportpaleis mailtrigger/dedupe suites; drie bekende WBD-fixturefailures buiten deze delta | Geen echte mail verzonden | Verkeerde bronmail/dubbele statusmail | NO |
| Business correctness | Final Consolidation; bijsturing §10 | Association + article/line + decoration/placement + value + color + profile identity | Candidate behoudt production truth | targeted golden suite PASS | Bibliotheek toont echte gecontroleerde Pioneers/Hockey-bronnen | Zie defectregister hieronder | NO |
| Teamwear central catalog | Teamwear recovery TW-023–030; bijsturing §15–18 | Eén centrale brand-independent catalogus, bounded query, model/variant projection | Candidate behoudt 103 live modellen en voegt alleen bronreferences toe | catalog/convergence tests PASS | Live Chrome: 103 modellen; artikel `BV6708` filtert exact Nike Park VII | Catalogusdreiging als clubkopie of Studio-sidebar | NO |
| Official brand discovery | Bijsturing §15, §32–33 | Zes gecontroleerde source references in bestaande catalogusfoundation; geen feedclaim | Candidate: Stanno, Nike Teamwear, adidas Teamwear, JAKO, Robey, Craft | source-matrix regression PASS | Live R1 toont alleen Stanno; candidatebewijs vóór release | Slechts één merkbron zichtbaar | **YES — minimale candidateprojectie gereed; live bewijs na release** |
| Central club asset library | Teamwear recovery TW-011–022; bijsturing §19–20 | Immutable source, preview, version, provenance, context filtering and cross-proposal reuse | Live foundation behouden | source/security/cross-proposal reuse tests PASS | Live Studio toont uitsluitend contextassets; huidige Donovan-context heeft 0 assets | Proposal-scoped uploads en interne cross-club leakage | NO |
| Studio focus/direct manipulation | Teamwear recovery TW-033–055; bijsturing §21–24 | Focus mode, selected garment rail, drag/resize/aspect lock/front/back/surface map | Live R1 actief | convergence/proposal/first-day tests PASS | Live Chrome: garment-first Studio, Logo/Sponsor/Naam/Nummer/Vrije opdruk, front/back; eerdere veilige drag+undo/resize+undo evidence | Catalogus in Studio; vlakke/stickerachtige placement | NO |
| Customer journey/review | Teamwear recovery TW-056–074; bijsturing §25–31 | Context → Collectie → Studio → Maten → Voorstel → Afhandeling; immutable composition | Live R1 pilot-only | proposal/PDF/approval/production handoff tests PASS | Live Chrome toont volledige stepper en klantwaardig voorstel zonder editorhandles | Dubbele ontwerpwaarheid; automatische productie | NO |
| Teamwear exposure | Teamwear security/roles; bijsturing §34 | Default-deny exact-principal capability, server enforcement and audit | Live Donovan pilot zichtbaar | exact-principal exposure regression PASS | Donovan live zichtbaar; een echte niet-pilot principal is niet beschikbaar in deze gekoppelde sessie | Rolpreview verward met principal-exposure | NO productfix; live cross-principal evidence beperkt |
| Desktop/mobile | Final Consolidation; Teamwear TW-010/TW-078; bijsturing §11/34 | Responsive layout contracts at 390/320, touch controls and bounded panels | Live desktop R1 bewezen | responsive/source tests PASS | Live Chrome desktop PASS; gekoppelde externe Chrome biedt geen werkende viewport-emulatie voor 390/320 | Te krappe dubbele City-cards en mobiel overflow | NO productfix; mobiele live screenshot evidence beperkt |

## Historical correctness defect register → executable golden invariants

| # | Defect class | Guard |
|---:|---|---|
| 1 | Verkeerde vereniging/artikel/placement-profielmatch | production-practice/profile fixtures |
| 2 | Buitenboys shortnummer via Schubler in plaats van Spain | Buitenboys fixture |
| 3 | Eén shortnummer materialiseerde tweemaal | cardinality fixture `19` |
| 4 | BLAUW Rug 34 verdween naast WIT Short/Rug 34 | per-line identity fixture |
| 5 | Pioneers gebruikte Premier-League/lookalike fallback | real-source fail-closed fixture |
| 6 | Hockey shirt/short gebruikte onjuiste maatbron | controlled 20 cm / 7,5 cm source fixture |
| 7 | SV Huizen orderbrede keuze overschreef artikelregel | per-article webshop fixture |
| 8 | Voorstel/SVG/PlotJob sloot OPEN kleur | open-color state fixture |
| 9 | Niet-geselecteerde OPEN kleur verdween | WIT/ZWART/BLAUW visibility fixture |
| 10 | Waiting kleur toonde actieve proposal busy-state | selected-color isolation fixture |
| 11 | Multi-digit cijfers verloren praktische setherkenning | semantic/physical group fixtures |
| 12 | Conservatieve 440 mm blokkeerde veilige 450 mm nesting | max-safe-track-width fixture |
| 13 | Initialen werden tussen rugnummers genest | deterministic decoration-band fixture |
| 14 | Reprint bouwde context opnieuw of overschreef origineel | immutable reprint/integrity fixture |
| 15 | Historiegroei maakte dagelijkse bootstrap onbegrensd | 2.000 orders + 2.000 PlotJobs performance fixture |
| 16 | Directe create-URL werd als orderdetail geladen | special-route source regression |

**KNOWN HISTORICAL DEFECT CLASSES RECOVERED: 16**  
**KNOWN HISTORICAL DEFECT CLASSES GUARDED: 16/16**  
**GOLDEN INVARIANTS HARVESTED: 16**

## Current gate state

- Candidate software gaps: standalone create-route guard and official six-brand discovery projection are implemented and targeted-regression green.
- Live core routes: desktop PASS, except the still-live R1 direct create-route fallback documented above.
- Mobile live evidence: browser-tool viewport limitation; this is not reclassified as a product failure.
- Consequential actions: no order, mail, production proposal, PlotJob, status or inventory mutation performed.

