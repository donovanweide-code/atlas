# Experience Polish 002 — Kandidaat-handoff

## Doel

De volledige publieke Experience redactioneel volwassen maken: snel begrijpelijk voor een scanner, rustig voor een beginnende bezoeker en geloofwaardig voor een ervaren professional.

## Belangrijkste wijzigingen

### Duidelijkheid en scanbaarheid

- De homepage benoemt eerder dat WBD bestaande digitale routes verbetert, nieuwe onderdelen ontwerpt en complete websites bouwt.
- De kennisbibliotheek laat per artikel zien welke rol het in de leesreis heeft.
- CTA's volgen dezelfde rustige lijn van begrijpen naar een passende volgende stap.

### Professioneel bewijs

- Meetdata, zoekintentie, formulieren, CMS, integraties, leveranciers, toegankelijkheid, performance en beheer verschijnen alleen binnen concrete observaties.
- Het WBD-werkdossier maakt zichtbaar wat werkelijk is onderzocht, gebouwd, beoordeeld en geleerd.
- Niet-bewezen conversie-, groei- of klantresultaten worden expliciet niet geclaimd.

### Gelaagde verdieping

- Diensten, Projecten en twee kennisartikelen bevatten een optionele redactionele inzage.
- De hoofdlijn blijft zonder openen volledig begrijpelijk.
- De inzage gebruikt native `details` en `summary`, een zichtbare focusbehandeling en een rustige bladzijde binnen hetzelfde hoofdstuk.

### Persoons-onafhankelijke positionering

- Over ons bewaart menselijke nabijheid en rechtstreekse verantwoordelijkheid zonder een publieke persoonsnaam als kernpositie.
- De actieve en niet-actieve publieke routecopy is gecontroleerd op dezelfde naam.

### Beeldintegratie en ritme

- Beelden hebben een vaste verhouding van 8:5 die aansluit op het bestaande bronmateriaal.
- De foto vult het kader volledig; het eerdere groene restvlak is verdwenen.
- Desktop en mobiel behouden dezelfde beeldbetekenis met minder onnodige verticale lengte.
- Kleine CTA- en woordmerkverschillen zijn gelijkgetrokken.

## Gewijzigde publieke bestanden

- `src/main.ts`
- `src/experience-pages.ts`
- `src/public-pages.ts`
- `src/styles/atlas-expedition.css`
- `src/styles/experience-pages.css`

## Verificatie

- 43 geautomatiseerde tests geslaagd.
- TypeScript- en productiebuild geslaagd.
- Public-only buildcontrole geslaagd: 27 bestanden en 7 tekstbestanden.
- Alle 11 publieke routes hebben één H1, een unieke titel, beschrijving en correcte canonical.
- Alle gevonden interne routes behoren tot de verwachte publieke routeverzameling.
- Geen publieke vermelding van de persoonsnaam in actieve bron, oude publieke routecopy of build.
- Desktopcontrole uitgevoerd op Diensten, Over ons, Contact en de pagina-afsluitingen.
- Mobiele controle uitgevoerd op 390 × 844 voor hero, beeldintegratie en Contact.
- Redactionele inzagen laden standaard gesloten en behouden een zichtbare focusstaat.
- Geen preview- of productiedeployment uitgevoerd.

## Open observaties

Nieuwe externe cases, resultaatclaims en praktijklessen kunnen pas worden toegevoegd wanneer echte projecten en bevestigde bronnen beschikbaar zijn. Dit is geen ontbrekend onderdeel van deze polish.

## Kandidaatoordeel

Experience Polish 002 is volledig uitgevoerd. De publieke Experience is gereed voor de Final Experience Review als één samenhangende kandidaat. Dit oordeel is nog geen Production GO of Experience GO.
