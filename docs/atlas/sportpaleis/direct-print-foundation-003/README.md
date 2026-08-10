# Sportpaleis Direct Print Foundation 003

> Vervolg: Optimization 004 breidt deze foundation uit met foliekleur-batching,
> multi-heuristic nesting en efficiency-metrics. De hardwaregrens uit dit
> document blijft ongewijzigd.

## Status en grens

Deze foundation is volledig offline gebouwd. `hardwareSendEnabled` is hard `false`. Alleen de `MockUsbAdapter` kan gegevens accepteren; `HardwareDisabledSummaAdapter` bevat geen USB-writepad en weigert iedere zendpoging. Geen Illustrator-, WinPlot-, driver- of machineconfiguratie is gewijzigd.

De code is gereed voor **Hardware Validation 001: read-only inventarisatie en niet-verzendende handlevalidatie**. Een fysieke snede en iedere echte `PIPE01`-write vallen buiten deze foundation.

## Architectuur

```text
Workspace (later, online)
  -> uitgaand HTTPS polling/claim/download
  -> lokale WBD Print Bridge
  -> lokale hash- en geometrievalidatie
  -> deterministische DM/PL-adapter
  -> MockUsbAdapter (Foundation 003)
  -> echte Summa-adapter (niet geïmplementeerd; hardwarevalidatie vereist)
```

De bestaande Illustrator -> WinPlot -> Summa-route is geen dependency en blijft zelfstandig bruikbaar. De toekomstige bridge mag USB-handles uitsluitend rond één expliciete printactie openen en moet bij bezet transport afbreken.

## CutJob-schema en single source of truth

`CutJob.productionGeometry` is de enige productiebron. Dezelfde geneste, gespiegelde, geroteerde en op 0,025 mm gekwantiseerde contouren worden gebruikt door:

- lokale geometrievalidatie;
- content hash;
- DM/PL-generator;
- onafhankelijke DM/PL-terugleescontrole;
- SVG-productiepreview.

Het model bevat organisatie/order, revisie, attempt-ID, product/vereniging, materiaal/foliekleur, millimetereenheden, groepen, contouren, nesting, productiegebied, SHA-256-contenthash, tijdstip, lifecycle-status en de expliciete hardwarevalidatiegrens.

## Eenheden en transformatiepipeline

1. Broncontouren worden gecontroleerd op eindige coördinaten, sluiting, oppervlak, zelfkruising en dubbele snijlijnen.
2. Spiegeling komt uit de productieregel en is geen gebruikersoptie.
3. De vereiste rotatie wordt toegepast.
4. Contouren worden op de DM/PL-grid van 0,025 mm gekwantiseerd.
5. Materiaalkleuren worden afzonderlijke CutJobs.
6. Deterministische shelf-nesting plaatst groepen zonder schaalwijziging.
7. Eerst wordt `preferredWorkingWidthMm` geprobeerd; zo nodig wordt tot de absolute 450 mm genest.
8. Een individueel stuk boven 450 mm wordt hard afgekeurd. Met een geconfigureerde maximumlengte kan de batch in meerdere jobs worden gesplitst.

`absoluteMaxWidthMm` is exact 450. De testwaarde 440 is uitsluitend de configureerbare voorkeursbreedte. `scaleApplied` is altijd `1`.

## DM/PL-output

De adapter produceert uitsluitend geometrische commando's:

- `;:` select;
- `ECN` voor 0,025 mm / 40 units per mm;
- `A` absolute adressering;
- `U` en `D` met gehele coördinaten;
- voorlopig `@` als deselect.

Mesdruk, snelheid, gereedschapsselectie, FlexCut, afsnijden en permanente instellingen ontbreken bewust. De keuze tussen `@` en `e` en het gewenste feedgedrag is gemarkeerd als `HARDWARE_VALIDATION_REQUIRED`; de DM/PL-resultaten zijn daarom `productionReady: false`.

## Round-trip-validatie

De parser is onafhankelijk van de generator en accepteert alleen de beperkte foundation-grammatica. De flow is:

```text
CutJob-geometrie -> DM/PL -> parser -> contouren in mm -> vergelijking
```

Vergeleken worden contouraantal, volgorde en coördinaten, geslotenheid, bounding boxes, productiebreedte en dubbele lijnen. Omdat de definitieve CutJob vooraf op de 0,025-mm-grid staat, is de toegestane numerieke representatietolerantie `0,000001 mm`; de referentietest blijft daarbinnen.

## Referentie 2 / 34 / 77

De vijf contouren zijn afgeleid uit de bestaande PDF-compatibele `Sportpaleis-Snijtest-001-2-34-77.ai` met SHA-256 `4DBA141DC0CF8FA5260CF8360608A314794F839932D4A421EAC036CF86668A7B`.

Dit is uitsluitend een technische regressiereferentie. De huidige maatvoering, plaatsing en verenigingsvermelding zijn niet tot Golden Production Reference of definitieve productregel verheven.

## Veiligheid en lifecycle

- SHA-256 over de canonieke productie-inhoud;
- idempotency per organisatie/order/revisie/materiaal/sheet;
- unieke attempt-ID;
- claim met lease en vervaltijd;
- alleen veilige statusovergangen;
- lokale hash- en geometriecontrole vóór mock-send;
- duplicate-send-blokkade;
- USB-verlies na ten minste één byte wordt `UNKNOWN_PARTIAL_SEND`;
- `UNKNOWN_PARTIAL_SEND` is terminaal en kan nooit automatisch opnieuw worden geclaimd;
- pause, kill-switch, busy, disconnect en graceful restart zijn getest;
- `SENT` betekent alleen door het transport geaccepteerd, niet fysiek gesneden.

## Workspace-contract

De bridge is altijd de uitgaande HTTPS-client. Het contract bevat heartbeat/capabilities, beschikbare jobs, een opaak claimtoken met lease, contentdownload, hashvalidatie en attempt-acknowledgement. Het mockcontract valideert het token bij download en acknowledgement. Foundation 003 gebruikt alleen `MockWorkspaceBridgeServer`; er wordt geen publieke of lokale inkomende poort geopend.

De medewerkerpreview bevat alleen folie, aantallen, plaatsing en gereedstatus. DM/PL, plotterunits, USB, spiegelen, rotatie, Illustrator en WinPlot blijven implementatiedetails.

## Niet bewezen

- werkelijke VID/PID, Instance ID en Container ID van serienummer 410810-10007;
- pad, bitness, versie en geldige ondertekening van de productie-`SummaUsb.dll`;
- exclusief openen en sluiten van de Summa USB-pijpen naast WinPlot;
- model/ROM-query en machinefeedback;
- echt buffer- en disconnectgedrag;
- `@` versus `e`, oorsprong en foliedoorvoer;
- fysieke 1:1-maat, spiegeloriëntatie, mesgedrag en snijkwaliteit;
- betrouwbare fysieke voltooiingsstatus.

Zie `HARDWARE_VALIDATION_CHECKLIST.md` voor de eerstvolgende toegestane stap.
