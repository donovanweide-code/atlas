# Part 1 — Premium Daily Experience evidence

## Requirement → implementation → evidence

| Requirement | Implementation | Evidence | Status |
|---|---|---|---|
| Bedrukken als één taak | Bestaande contextgestuurde orderflow en state-driven primaire acties behouden | premium shell, first-day en production-practice suites | PASS |
| SV Huizen per-artikelregels | Artikelbeleid blijft authoritative; generieke orderkeuze overschrijft niets | `sportpaleis-today-production-practice.test.mjs` | PASS |
| Naambalk-compositie en tussenvoegsel 20 mm | Naambalk is uitsluitend de samengestelde applicatie `NAME` + `RUGNUMBER`; beide componenten behouden hun eigen bestaande profielmaat. Er bestaat geen afzonderlijke Naambalk-totaalmaat. | production profile/practice + R20 Human Product Truth invariant | PASS |
| Buitenboys cardinality en kleur | Identity omvat regel, placement, waarde, kleur en profiel | Buitenboys 19 en blue-34 suites | PASS |
| Pioneers/Hockey echte bronnen | Bestaande gecontroleerde SVG-source/profile-koppelingen behouden; fail-closed fallback | real production number sources suites | PASS |
| Vrije opdruk | Semantische soorten, combinaties en artikelcontext blijven zichtbaar zonder handmatige bekende maat/font/kleur | first-day + workspace shell tests | PASS |
| WIT/ZWART/BLAUW open | Alleen Bedrukt sluit een groep; voorstel/PlotJob niet | open-production-colors suites | PASS |
| Praktische nesting | Deterministische decoration grouping met output-equivalentie | adaptive nesting + 23-element performance fixture | PASS |
| Afronden | Expliciet en bulk; gedeeltelijke meerkleurorder geblokkeerd | bulk completion regression | PASS |
| Webshop mail/PDF | Immutable source, extractie, dedupe, zoeken, print/reprint behouden | today-production-practice suite | PASS |
| VVA/Spartaan voorraadlogo | Alleen Webshop, éénmalige idempotente afboeking, geen PlotJob | today-production-practice suite | PASS |
| Guided Setup | Plaatsing/spiegeling zijn automatische regels; alleen font/maat/foliekleur en echte bronhiaten vragen mensenwerk | reconciliation + first-day tests | PASS |
| 72 raw human actions | 31 plaatsing + 31 spiegeling verwijderd als pseudo-acties | `HUMAN-INPUT-REQUIRED.md`; live inventory probe | 72 → 10 |
| Assets/fonts/kleuren | Bestaande review/ready/all, previews, contextfiltering en selection persistence behouden | Production Assets, premium shell suites | PASS |
| Sync | Bestaande bronstatus en aantallen/reasons behouden in Beheer | beheer/sync regression | PASS |
| Bounded history | 120 recente complete orders + actief; 24 jobs + actief; cursor/detail on demand | 2.000-history performance test | PASS |
| Gebruiker wisselen | Alleen PIN wanneer werkelijk ingericht; anders wachtwoord met first-use uitleg | premium identity test | PASS |
| Wachtwoord vergeten | Niet-enumererende aanvraag; admin-issued eenmalige 30-minutenroute; hash-only opslag; sessie-intrekking | premium identity + auth lifecycle tests | PASS |
| Sportpaleis brand/mobile | Shared black/white/anthracite/red controls and 390px contracts retained | premium shell + responsive source tests | PASS |
| Parallel Mail Foundation | Geen wijziging aan `mail-foundation.mjs` | empty git diff for that file | PASS |
| Directe Bedrukken/Vrije-opdruk URL | Create-routes `nieuw`, `team` en `eigen-artikel` worden vóór de orderdetail-fetch uitgesloten | `sportpaleis-first-day-employee-acceptance.test.mjs` + live Chrome R2 | PASS LIVE; beide directe routes renderen de volledige composer zonder recoveryweergave |

## Resultaat

- Correctness, output, cardinality, color isolation, nesting, Webshop, stock logo, Afronden, identity, Guided Setup and bounded-performance regressions: PASS.
- Production build: PASS (`242` modules; `222` buildbestanden geverifieerd).
- Alle sequentieel uitgevoerde Sportpaleis-tests: exit `0`.
- Repositorybreed blijven uitsluitend drie WBD Mail-fixtures buiten deze Sportpaleis-delta falen. Een parallelle full-suite-run belastte één Teamorder-timingfixture boven de grens; dezelfde fixture sequentieel/isolated PASS en alle production-shaped timings bleven binnen de bestaande norm.
- Performance: 2.000 orders + 2.000 PlotJobs blijft bounded (`120` orders, `24` PlotJobs, historypages `40`); payload `86,8%` kleiner dan het onbegrensde model. De 23-elementenproposal blijft `2230,8 ms` met output-equivalentiehash `8D3FF8E…11EF8`.
- Live Chrome desktop: Today, Orders, Webshop, Search, Production, History, Library, Guided Setup, Bedrukken en Vrije opdruk renderen op release R2. De eerder gereproduceerde direct-create defecten zijn live gesloten.
- De gekoppelde externe Chrome-tab biedt geen werkende viewport-emulatie. 390/320 blijft bron-/regressiebewijs en een expliciete tooling-evidencebeperking.

**SPORTPALEIS PREMIUM DAILY EXPERIENCE — PART 1 PASS — READY FOR TEAMWEAR FINAL**
