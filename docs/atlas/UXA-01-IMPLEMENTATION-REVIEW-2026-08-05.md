# UXA-01 — Implementation Review

**Project:** Experience: canonieke toegang en routecompatibiliteit  
**Datum:** 5 augustus 2026  
**Status:** implementatie en lokale validatie voltooid — GO aangevraagd

## 1. Gezaghebbende basis

De implementatie is uitsluitend afgeleid van:

1. `ATLAS-WORKSPACE-COMPLETE-UX-ARCHITECTURE-REVIEW-2026-08-05.md`;
2. `WORKSPACE-NAVIGATION-EXPERIENCE-PROPOSAL-V1.md`;
3. `UX-ARCHITECTURE-IMPLEMENTATION-ROADMAP-V1.md`.

## 2. Opgeleverd

- `/ervaar` is de canonieke menselijke Experience-route.
- `/ervaar` levert de bestaande First Visit V2-inhoud.
- Een bestaande organische sessie wordt vóór de nieuwe First Visit-weergave herkend en kan blijven hervatten.
- `/e/#token` blijft de compatibiliteits- en uitwisselroute voor persoonlijke tokens.
- Na een geslaagde tokenuitwisseling wordt de token, zoals voorheen, uit de zichtbare URL verwijderd en blijft `/e/` als hervatroute over.
- `/e/` zonder token probeert eerst een bestaande persoonlijke sessie te hervatten.
- Alleen wanneer `/e/` geen token én geen geldige bestaande toegang heeft, wordt rustig doorgestuurd naar `/ervaar`.
- `first-visit-v2.html` is uitsluitend een compatibiliteitsalias naar `/ervaar`.
- De canonieke metadata op `/ervaar` verwijst naar `https://experience.webuildanddesign.nl/ervaar/`.
- De Experience-buildgrens, sessie-API, tokenopslag en Runtime zijn niet gewijzigd.

## 3. Copyreview

Gewijzigd:

- algemene privacytaal spreekt over een beveiligde Experience-toegang in plaats van een persoonlijke uitnodiging als universeel toegangsmodel;
- sessieverwijdering trekt de bijbehorende toegang in, niet conceptueel “de uitnodiging”;
- een ingetrokken token verwijst voor een nieuwe start rustig naar `/ervaar` in plaats van te vragen om een nieuwe uitnodiging;
- de laadtekst op `/e/` zonder zichtbare token spreekt algemeen over de Experience.

Bewust behouden:

- “persoonlijke uitnodiging” bij het openen of beoordelen van een werkelijke persoonlijke token;
- “dezelfde persoonlijke link” uitsluitend voor een persoonlijke tokensessie;
- token- en uitnodigingstaal in Observatory, omdat dit bestaande tokenbeheer werkelijk beschrijft en de Observatory-herpositionering onder UXA-02 valt.

## 4. Technische wijzigingen

- centraal, testbaar routebesluit in `src/experience-entry.ts`;
- canonieke routering in `src/experience-validation-main.ts`;
- ontbrekende-toegangredirect met behoud van sessiehervatting in `src/experience-workspace.ts`;
- algemene toegangstaal in `src/experience-privacy.ts`;
- compatibiliteitsredirect in de Experience Vite-preview en het opgebouwde Experience-pakket;
- lokale validatieserver gelijkgetrokken met de bestaande productiecontrole voor verlopen tokens;
- begrensde mobiele breedtecorrectie voor First Visit V2 onder 430px;
- nieuwe gerichte routetests in `tests/experience-entry.test.mjs`.

## 5. Testresultaten

### Geautomatiseerd

| Controle | Resultaat |
|---|---|
| `npm run build:experience` | PASS — TypeScript, Vite-build en Experience-pakket |
| volledige testset | PASS — 210/210 tests |
| nieuwe UXA-01-routetests | PASS — canonieke route, tokenherkenning, ontbrekende toegang en organische hervatting |
| `git diff --check` op geraakte tekstbestanden | PASS |

### Browsermatrix

| Scenario | Resultaat | Vaststelling |
|---|---|---|
| Desktop 1440×900 | PASS | First Visit V2 op `/ervaar`; canonieke metadata correct |
| Tablet 768×1024 | PASS | geen horizontale overflow; volledige eerste stap zichtbaar |
| Mobiel 390×844 | PASS | geen horizontale overflow; begrensde breedtecorrectie actief |
| Mobiele screenshot 430×932 | PASS | volledige First Visit V2-ingang binnen mobiele viewport |
| Geldige token | PASS | tokenbridge opent de bestaande Runtime-sessie op `/e/` |
| Hervatten bestaande persoonlijke sessie | PASS | reload op `/e/` hervat dezelfde sessie zonder uitnodigingsfout |
| Ontbrekende token, geen sessie | PASS | `/e/` komt uit op `/ervaar`; foutpagina verschijnt niet |
| Ongeldige token | PASS | token-specifieke veilige fouttoestand blijft bestaan |
| Verlopen token | PASS | token-specifieke verlopen-toestand blijft bestaan; geen gegevens zichtbaar |
| `first-visit-v2.html` | PASS | komt uit op `/ervaar` |
| Browserconsole | PASS | geen warnings of errors op canonieke ingang en hervatte sessie |

## 6. Screenshots

- `screenshots/uxa-01/uxa-01-ervaar-desktop-1440x900.jpg`
- `screenshots/uxa-01/uxa-01-ervaar-mobile-430x932.jpg`

## 7. Scopecontrole

Niet gebouwd of gewijzigd:

- geen nieuwe Experience-functionaliteit;
- geen nieuw Experience-concept;
- geen observatieflow;
- geen nieuwe authenticatie;
- geen token- of sessiemigratie;
- geen hosting- of infrastructurele wijziging;
- geen Observatory-herontwerp.

## 8. Reviewconclusie

Er zijn geen open releaseblokkerende bevindingen binnen UXA-01. De publieke toegang is genormaliseerd zonder bestaande token- en sessiecompatibiliteit te verwijderen. `/ervaar` is aantoonbaar de canonieke Experience; `/e/` zonder toegang eindigt niet langer op de uitnodigingsfout; `/e/#token` en hervatten blijven intact.

**Advies: GO voor UXA-01.**

Na expliciete GO kan UXA-02 starten.
