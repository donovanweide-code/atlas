# UXA-03 — Implementation Review

Datum: 5 augustus 2026  
Status: kandidaat voor GO

## 1. Readiness Check

- **Doel:** uitsluitend UXA-03 afronden: eigenaarschap, levenscyclus, bronmodel en de scheiding Observatie → Understanding → Knowledge.
- **Scope:** observatiemodel, statussen, statusovergangen, bron, context, herkomst, tijd, eigenaar, relaties en legacybehoud.
- **Buiten scope:** UXA-04 t/m UXA-09, nieuwe schermen, nieuwe Experience-functionaliteit, AI, notificaties, dashboards, navigatie, authenticatie, infrastructuur en connectors.
- **Omvang:** M.
- **Creditverbruik:** laag tot gemiddeld.
- **Hergebruik:** bestaande lokale observatieopslag, capture, Atlas Workspace, Understanding en Knowledge Repository zijn behouden.

## 2. Uitkomst

De observatieketen volgt nu technisch dezelfde methode als de goedgekeurde review:

`Werkelijkheid → Observatie → Menselijke beoordeling → Betekenis → Kennis`

Een observatie begint altijd als `unreviewed`. Capture bewaart uitsluitend de waarneming, bron, context, herkomst, tijd en eigenaarschap. Alleen een verklaarde menselijke handeling kan een status wijzigen, een case toewijzen of een relatie met Understanding of Knowledge vastleggen.

Er is geen automatische classificatie, betekenisvorming, kennispromotie of nieuwe gebruikersflow toegevoegd.

## 3. Architectuurwijzigingen

### 3.1 Eén observatiewaarheid

Het bestaande observatiemodel is van een hardcoded captureobject naar één algemeen versie-2-model gebracht. De bestaande storage key is behouden, zodat er geen parallelle opslag of dubbele waarheid ontstaat.

Elke observatie bevat nu:

- stabiele identiteit en oorspronkelijke tekst;
- status en volledige statusgeschiedenis;
- primaire bron met type, label, herkomst, pad, locator en capturetijd;
- context met oppervlak, pagina, grens en optionele viewport;
- afzonderlijke capture-eigenaar en revieweigenaar;
- uitsluitend menselijk bevestigde relaties;
- optionele ondersteunende bestanden binnen dezelfde observatie;
- herkenbare legacycontext wanneer het om bestaande Case 0001/sprintdata gaat.

### 3.2 Hardcoded aannames verwijderd

Nieuwe observaties bevatten geen vaste Case 0001 of sprint meer. Ook activeren en vastleggen werken niet meer vanuit een verplichte case of sprint.

De bestaande hardcoded gegevens worden niet weggegooid. Oude versie-1-observaties worden veilig als versie 2 gelezen met:

- hun oorspronkelijke tekst, tijd, pagina en grens;
- `legacyContext.caseId` en `legacyContext.sprintId`;
- status `unreviewed`;
- geen stilzwijgende case-relatie.

Hierdoor blijft historie herkenbaar, zonder dat een eerdere ontwikkelaanname de algemene architectuur bepaalt.

### 3.3 Eigenaarschap

Eigenaarschap is expliciet gescheiden:

| Rol | Betekenis |
| --- | --- |
| `captureOwner` | eigenaar van de vastlegging bij het bronoppervlak |
| `reviewOwner` | eigenaar van de menselijke beoordeling in Atlas Werkelijkheid |
| `reviewedBy` | concrete menselijke actor van een statusbesluit |
| `linkedBy` | concrete menselijke actor van een relatie |

Een reviewed status of relatie zonder menselijke actor en motivering is ongeldig.

### 3.4 Bronmodel

Een bron bewaart:

- bron-ID;
- `surface` of `practice-source`;
- label;
- herkomst: website, Workspace, Experience, Observatory of praktijkbron;
- pad en heropenbare locator;
- capturetijd;
- context en eventuele viewport.

Dit bereidt het model voor op praktijkbronnen zonder een connector of uploadfunctie te introduceren.

### 3.5 Ondersteunende bestanden

Het model ondersteunt toekomstige referenties naar:

- screenshots;
- documenten;
- PDF;
- spreadsheets;
- foto's;
- e-mails.

Een bestandsreferentie bevat identiteit, soort, label, referentie, optioneel MIME-type en tijdstip. Deze referenties bestaan uitsluitend binnen een observatie. Er is geen losse uploadstore en geen UI toegevoegd.

### 3.6 Relaties met Cases, Understanding en Knowledge

| Laag | Voorwaarde |
| --- | --- |
| Case | status `linked`, expliciete case-ID, mens en motivering |
| Understanding | eerst een relevante menselijke beoordeling; daarna een expliciete bronrelatie |
| Knowledge | uitsluitend na status `confirmed` of `linked`, en alleen via een aparte menselijke relatie |

Understanding kan via het bestaande algemene invoerformulier niet langer zelfstandig een tweede observatie creëren. Een observatie kan alleen als herleidbare bron met `sourceObservationId` in Understanding komen. Bestaande Understanding-items blijven leesbaar.

De bestaande handmatige Knowledge-goedkeuringsflow is ongewijzigd gebleven. Een observatiebesluit maakt nooit automatisch een Knowledge-entry.

## 4. Statusmodel en overgangen

### 4.1 Statussen

| Status | Betekenis |
| --- | --- |
| `unreviewed` | vastgelegd; nog geen betekenis of conclusie |
| `confirmed` | door een mens als relevante werkelijkheid bevestigd |
| `linked` | door een mens aan een bestaande case of oriëntatie toegewezen |
| `question` | door een mens teruggebracht tot een open vraag |
| `parked` | bewust geparkeerd met verplichte terugkeertrigger |
| `rejected` | door een mens afgewezen als onvoldoende herleidbaar |

### 4.2 Toegestane overgangen

```text
capture
  └─> unreviewed
        ├─> confirmed
        ├─> linked       (case-ID verplicht)
        ├─> question
        ├─> parked       (terugkeertrigger verplicht)
        └─> rejected

reviewed outcome
  └─> unreviewed         (alleen bewuste heropening met mens en reden)
```

Directe overgangen tussen twee reviewed uitkomsten zijn niet toegestaan. Een mens heropent eerst de observatie; daarna volgt een nieuw afzonderlijk besluit. Iedere stap blijft daardoor chronologisch verklaarbaar.

### 4.3 Geschiedenis

Iedere statusstap bewaart:

- vorige en nieuwe status;
- tijdstip;
- actor;
- motivering;
- of het een menselijke beslissing was.

Capture is nadrukkelijk geen inhoudelijke beoordeling. De eerste historie-entry staat daarom op `confirmedByHuman: false`; iedere latere statusovergang vereist `true`.

## 5. Zichtbare aanpassingen binnen bestaande UI

Er zijn geen schermen toegevoegd. Binnen de bestaande capture en Atlas-sectie zijn uitsluitend de architectuurbegrippen verduidelijkt:

- `Observaties` in Atlas in plaats van een tweede Waarnemen-betekenis;
- bron en menselijke revieweigenaar zichtbaar;
- Case 0001 en sprint verwijderd uit algemene capture;
- status `Nog beoordelen` zichtbaar;
- Understanding biedt geen losse `Waarneming` meer als nieuw invoertype;
- bestaande historische Understanding-waarnemingen blijven zichtbaar.

## 6. Gewijzigde bestanden

| Bestand | Wijziging |
| --- | --- |
| `website/src/atlas-observations.ts` | canoniek bron-, status-, eigenaarschaps-, relatie-, geschiedenis- en legacy-model |
| `website/src/atlas-observe.ts` | generieke capture zonder case/sprint; bron en revieweigenaar behouden |
| `website/src/atlas-workspace.ts` | bestaande observatiesectie gebruikt het nieuwe model en de juiste begrippen |
| `website/src/atlas-understanding.ts` | herleidbare `sourceObservationId`; geen zelfstandige nieuwe observatiewaarheid |
| `website/tests/atlas-observations.test.mjs` | volledige levenscyclus-, legacy-, bron-, bestands- en promotiegates |
| `website/tests/atlas-understanding.test.mjs` | scheiding Observatie/Understanding en herleidbare menselijke toewijzing |

## 7. Validatie

### 7.1 Geautomatiseerd

| Controle | Resultaat |
| --- | --- |
| Gerichte observatie- en Understanding-tests | PASS — 19/19 |
| Volledige testset | PASS — 220/220 |
| `npm.cmd run build` | PASS — TypeScript, Vite en public-only verificatie |
| Legacy-observaties | PASS — inhoud en oude context herkenbaar behouden |
| Bestaande cases | PASS — regressietests en bestaande Atlas-weergave |
| Bestaande Understanding | PASS — opslag, relaties, revisies en lineage |
| Bestaande Knowledge | PASS — menselijke en transactionele goedkeuringsflow |

### 7.2 Browservalidatie

| Scenario | Resultaat |
| --- | --- |
| Desktop 1440 × 900 | PASS — bron, eigenaar, status en observatie zichtbaar; geen horizontale overflow |
| Tablet 768 × 1024 | PASS — geen horizontale overflow |
| Mobiel 430 × 932 | PASS — Atlas-observatie en capture leesbaar; geen horizontale overflow |
| Capture → Atlas | PASS — observatie verschijnt als `Nog beoordelen` met bron en eigenaar |
| Understanding-invoer | PASS — zelfstandige observatie ontbreekt als nieuw invoertype |
| Browserconsole | PASS — geen fouten |

## 8. Screenshots

- `screenshots/uxa-03/uxa-03-observations-desktop-1440x900.jpg`
- `screenshots/uxa-03/uxa-03-observations-mobile-430x932.jpg`
- `screenshots/uxa-03/uxa-03-capture-mobile-430x932.jpg`

## 9. Scopebevestiging

Niet toegevoegd:

- reviewscherm of reviewwachtrij-UX;
- observatiepagina;
- notificaties of dashboards;
- AI-beoordeling of automatische classificatie;
- automatische kennisvorming;
- navigatiewijzigingen;
- connectors, authenticatie of infrastructuur.

UXA-03 legt uitsluitend de onderliggende menselijke levenscyclus vast. UXA-04 kan hier later veilig een reviewwachtrij op aansluiten.

## 10. Advies

De observatieketen komt volledig overeen met de goedgekeurde Atlas-methode en is gereed voor review. Advies: **GO voor UXA-03**.

