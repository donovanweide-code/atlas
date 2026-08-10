# UXA-05 — Atlas Information Architecture Implementation Review

Datum: 5 augustus 2026  
Status: kandidaat voor GO

## 1. Readiness Check

- **Doel:** uitsluitend de Atlas-informatiearchitectuur, plaatsing, hiërarchie en interne samenhang in lijn brengen met de goedgekeurde mentale kaart.
- **Uitgevoerd:** Vandaag, Werkelijkheid, Horizon, Werkruimte en secundair Fundament zijn routebewust geordend; bestaande onderdelen zijn verplaatst en consistent benoemd.
- **Buiten scope gehouden:** UXA-06-hero en dagelijkse shell, UXA-07-Fundamentinhoud, UXA-08/09-navigatiepolish en iconografie, nieuwe functionaliteit, modellen, Experience, WBD-uitbreiding, AI, notificaties, authenticatie en infrastructuur.
- **Omvang:** M.
- **Creditbewust hergebruik:** bestaande Atlas-secties, bestaande hashroutes, bestaande Workspace-shell, bestaande WBD-kennisvoorstellenroute en bestaande gegevensmodellen.

## 2. Implementatie

Atlas volgt nu deze mentale kaart:

```text
Atlas
├─ Vandaag
│  ├─ Focus
│  └─ Stilte
├─ Werkelijkheid
│  ├─ Bevestigde werkelijkheid
│  ├─ Observaties · nog beoordelen
│  └─ Praktijkbronnen / Oriëntaties
├─ Horizon
├─ Werkruimte
│  ├─ Cases
│  ├─ Understanding
│  ├─ Kennisvoorstellen
│  ├─ Ideeën
│  └─ Logboek
└─ Fundament · secundaire route
```

Er is geen inhoud verwijderd of gedupliceerd. Bestaande secties worden na renderen uitsluitend in de canonieke volgorde geplaatst. Daarmee blijven hun modellen, opslag, interacties en bronrelaties intact.

## 3. Architectuurreview

### Vandaag

De bestaande opening, Focus en Stilte blijven onder Vandaag. De hero is niet aangepast; dit volgt pas in UXA-06.

### Werkelijkheid

De volgorde is nu:

1. bevestigd actueel beeld;
2. `Observaties · nog beoordelen`;
3. bestaande Praktijkbronnen / Oriëntaties.

De bestaande Atlas-methode in de observatiereview blijft de inhoudelijke verbinding tonen:

`Werkelijkheid → Observatie → Menselijke beoordeling → Betekenis → Kennis`

Praktijkdossiers zijn zichtbaar hernoemd naar **Praktijkbronnen · Oriëntaties**. Het bestaande hash-ID `#praktijkdossiers` blijft als compatibiliteitsroute behouden; er ontstaat dus geen tweede route of tweede model.

De bestaande Waarnemen-activering staat niet meer in de primaire Werkruimtekaart. Zij blijft functioneel behouden als secundaire broncapture en behoort route-inhoudelijk tot Werkelijkheid.

### Horizon

De bestaande Horizon-sectie en betekenis zijn ongewijzigd gebleven.

### Werkruimte

Werkruimte bevat nu uitsluitend de bestaande methodische werkobjecten:

- Cases;
- Understanding;
- Kennisvoorstellen;
- Ideeën;
- Logboek.

Kennisvoorstellen verwijst naar de bestaande route `/workspace/wbd/kennisvoorstellen`. Er is geen tweede Atlas-opslag, nieuwe Knowledge-route of extra reviewflow gebouwd.

### Fundament

`/atlas/fundament` is als secundaire Atlas-route geregistreerd en staat onder de vier primaire gebieden. De route toont uitsluitend haar positie en titel. Architectuurregisters, repositories, projecten, statussen en validaties zijn bewust niet toegevoegd; dat is UXA-07.

## 4. Gewijzigde routes en plaatsingen

| Route of locatie | Uitkomst | Motivatie |
| --- | --- | --- |
| `/atlas` | behouden | canonieke Atlas-ingang blijft stabiel |
| `/atlas#overzicht` | Vandaag | Focus en Stilte blijven de dagelijkse ingang |
| `/atlas#werkelijkheid` | Werkelijkheid | bevestigd actueel beeld is de ingang van de werkelijkheidsketen |
| `/atlas#observatie-review` | Werkelijkheid | menselijke review hoort direct na ontvangen werkelijkheid |
| `/atlas#praktijkdossiers` | behouden, zichtbaar Praktijkbronnen / Oriëntaties | routecompatibiliteit zonder operationele dossierbetekenis |
| `/atlas#waarnemen` | behouden als secundaire broncapture onder Werkelijkheid | functionaliteit blijft bestaan maar verdwijnt uit de primaire leesroute |
| `/atlas#daily-horizon` | Horizon | bestaande functie en betekenis blijven gelijk |
| `/atlas#werkruimte` | Werkruimte | duidelijke ingang naar methodische werkobjecten |
| `/atlas#cases` | Werkruimte | menselijke toewijzing en contextwerk |
| `/atlas#understanding` | Werkruimte | betekenisvorming blijft na beoordeling en herleidbaar |
| `/workspace/wbd/kennisvoorstellen` | hergebruikt vanuit Werkruimte | voorkomt een dubbele kennisroute en dubbele waarheid |
| `/atlas#ideeen` | Werkruimte | bestaand bewaarobject blijft beschikbaar |
| `/atlas#logboek` | Werkruimte | bestaand betekenislogboek blijft beschikbaar |
| `/atlas/fundament` | nieuw geregistreerde secundaire positie | bereidt UXA-07 voor zonder Foundation-inhoud te bouwen |
| `/atlas-lab` | ongewijzigd | bestaande interne ontwikkelomgeving blijft compatibel |

## 5. Routebewustzijn

De gedeelde sidebar ondersteunt nu naast de primaire navigatie een optionele secundaire groep. Alleen Atlas gebruikt die groep voor Fundament; WBD en Experience blijven functioneel ongewijzigd.

Atlas bepaalt de actieve locatie op basis van pad en hash:

- Focus en de opening houden Vandaag actief;
- bevestigd beeld, observatiereview, praktijkbronnen en broncapture houden Werkelijkheid actief;
- Horizon houdt Horizon actief;
- Cases, Understanding, Ideeën en Logboek houden Werkruimte actief;
- `/atlas/fundament` houdt Fundament actief.

Bij hashwijzigingen wordt `aria-current="page"` synchroon bijgewerkt. De gebruiker behoudt daarmee locatiecontext zonder een nieuwe router of navigatievormgeving.

## 6. Gewijzigde bestanden

| Bestand | Wijziging |
| --- | --- |
| `website/src/workspace-config.ts` | canonieke Atlas-labels, absolute Atlas-hashes, secundair Fundament en route-mapping |
| `website/src/workspace-shell.ts` | generieke optionele secundaire navigatiegroep en route-ID's voor actieve locatie |
| `website/src/internal-main.ts` | registratie van `/atlas/fundament` |
| `website/vite.config.ts` | lokale interne route voor `/atlas/fundament` |
| `website/src/atlas-workspace.ts` | routebewuste sidebar, Werkelijkheid- en Werkruimtekaarten, herplaatsing en terminologie |
| `website/src/styles/atlas-workspace.css` | uitsluitend structurele layout voor secundaire route en drieledige Werkelijkheidkaart |
| `website/tests/atlas-information-architecture.test.mjs` | gerichte IA-, route-, hergebruik- en scopegrenzen |
| `docs/atlas/screenshots/uxa-05/` | desktop-, tablet- en mobiele validatiebeelden |

## 7. Bevestiging van de scope

UXA-05 wijzigt uitsluitend informatiearchitectuur:

- bestaande onderdelen zijn gegroepeerd en verplaatst;
- bestaande labels zijn in lijn gebracht met de canonieke mentale kaart;
- bestaande routes zijn behouden of hergebruikt;
- alleen de noodzakelijke lege routepositie voor Fundament is geregistreerd;
- er is geen model, opslag, workflow of inhoudelijke beslislogica gewijzigd.

## 8. Testresultaten

| Controle | Resultaat |
| --- | --- |
| Gerichte UXA-05-tests | PASS — 6/6 |
| UXA-03/04 + UXA-05 gerichte architectuurset | PASS — 33/33 |
| Volledige regressietest | PASS — 234/234 |
| TypeScript | PASS |
| Productiebuild | PASS |
| Public-only-buildgrens | PASS |
| Browserconsole | PASS — geen fouten |
| `git diff --check` | PASS — geen whitespacefouten |

Browserroutes gecontroleerd:

- `/atlas` en alle bestaande primaire hashlocaties;
- observatiereview, praktijkbronnen en secundaire broncapture;
- Cases, Understanding, Ideeën en Logboek;
- bestaande WBD-kennisvoorstellenroute;
- `/atlas/fundament`;
- `/atlas-lab`.

## 9. Desktop-, tablet- en mobiele controle

| Viewport | Resultaat |
| --- | --- |
| Desktop 1440 × 900 | PASS — primaire en secundaire navigatie, actieve Werkelijkheid en canonieke volgorde zichtbaar |
| Tablet 768 × 1024 | PASS — vijf routes blijven bereikbaar; Werkruimte en bestaande werkobjecten blijven logisch gegroepeerd |
| Mobiel 430 × 932 | PASS — Vandaag, Werkelijkheid, Horizon, Werkruimte en Fundament blijven zichtbaar en bruikbaar; Werkelijkheidkaart wordt één kolom |

Er is geen zichtbare documentbrede horizontale overflow geconstateerd. De bestaande focus-, toetsenbord- en responsieve shellpatronen zijn behouden.

## 10. Screenshots

- `screenshots/uxa-05/uxa-05-reality-desktop-1440x900.jpg`
- `screenshots/uxa-05/uxa-05-workroom-tablet-768x1024.jpg`
- `screenshots/uxa-05/uxa-05-reality-mobile-430x932.jpg`

Dit zijn functionele IA-beelden. De integrale visuele Atlas-review blijft conform opdracht uitgesteld tot na UXA-06.

## 11. Bewust niet gebouwd

- nieuwe of compacte hero;
- nieuwe dagelijkse shell;
- navigatiepolish, iconografie of nieuwe navigatievormgeving;
- aandachtindicatoren, badges, notificaties of realtime activiteit;
- Foundation-register, technische inhoud of repository-index;
- nieuwe Atlas-module, nieuw dashboard of nieuwe semantische engine;
- nieuwe observatie-, Understanding- of Knowledge-modellen;
- tweede kennisvoorstellenroute of dubbele dataopslag;
- AI, automatische classificatie of automatische prioritering;
- Experience- of WBD-functionaliteitswijzigingen;
- authenticatie, infrastructuur of connectors.

Er is niets gecommit, gemerged, gepusht of gepubliceerd.

## 12. Advies

De Atlas-informatiearchitectuur volgt nu de goedgekeurde mentale kaart en is technisch gereed voor review. Advies: **GO voor UXA-05**.

UXA-05 is niet zelf als GO gemarkeerd en UXA-06 is niet gestart.
