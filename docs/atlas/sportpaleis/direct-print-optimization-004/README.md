# Sportpaleis Direct Print Optimization 004

## Status en productgrens

Optimization 004 maakt de offline Direct Print-kern gereed om aan de
Sportpaleis Bedrukkingsmodule te koppelen. De medewerkerflow kan daarmee als
contract worden aangeboden als `order controleren -> Printen -> klaar`, zonder
Illustrator of WinPlot in de normale flow.

`hardwareSendEnabled` blijft hard `false`. Er is geen `WriteFile`-, `PIPE01`-,
driver- of machinepad toegevoegd. `READY_FOR_PRINTING` betekent daarom dat de
batch geometrisch en contractueel gereed is; het bewijst nog niet dat de echte
Summa de opdracht fysiek heeft uitgevoerd.

## Object, batch en job

- `CutObject` is één orderonderdeel, bijvoorbeeld een rugnummer, naam of set
  initialen. Het bewaart bronorder, vereniging, bedrukkingstype, gevraagde maat,
  vectorprofiel, materiaal, kleur, spiegelregel en rotatieregels.
- `CutBatch` bevat alle compatibele objecten met dezelfde genormaliseerde
  foliekleur. Vereniging, materiaalcode, lettertype, maat en ordertype zijn geen
  batchsleutel.
- `CutJob` is één fysieke snijopdracht. Een kleur-batch kan door een
  geconfigureerde maximumlengte over meerdere jobs worden verdeeld.

Iedere `ProductionGroup` in een job draagt een volledige
`CutObjectProvenance`. Splitsen en herschikken veranderen de geometrie of
herkomst niet en ieder object komt exact één keer terug.

## Batchingregel

De primaire en enige automatisch gebruikte batchsleutel is foliekleur na trim,
witruimte-normalisatie en case-insensitieve vergelijking. Daardoor mogen
bijvoorbeeld witte Pioneers-rugnummers, Buitenhout-initialen en naamregels uit
andere orders in dezelfde witte batch terechtkomen. Verschillende kleuren
worden nooit in dezelfde `CutBatch` of fysieke `CutJob` geplaatst.

## Deterministische nesting

De strategie heet
`DETERMINISTIC_MULTI_HEURISTIC_CONTOUR_SAFE_NO_SCALE` en werkt als volgt:

1. brongeometrie valideren, spiegelen, de vaste productrotatie toepassen en op
   de 0,025-mm-grid kwantiseren;
2. uitsluitend per object toegestane extra nestingrotaties evalueren;
3. vier deterministische ordeningen proberen: hoogte, breedte, bounding area en
   object-ID;
4. zowel de configureerbare voorkeursbreedte als de absolute 450 mm evalueren;
5. kandidaatposities aan rand- en objectankers testen met echte contourbotsing
   en `minimumCutGapMm`;
6. oplossingen vergelijken op totale gecombineerde folielengte, aantal jobs,
   breedte en een stabiele signaturesleutel;
7. de eenvoudige shelf-oplossing altijd als baselinekandidaat meenemen. De
   gekozen oplossing kan daardoor nooit meer folielengte gebruiken dan deze
   baseline.

De planner schaalt nooit: `scaleApplied` is altijd `1`. Een object dat onder
zijn eigen rotatieregels niet binnen 450 mm past wordt geweigerd. Als
`maxJobLengthMm` is geconfigureerd, opent de planner deterministisch een nieuwe
job zodra een object niet meer veilig in de huidige job past.

Dit is bewust geen eindeloze globale no-fit-polygon-optimalisatie. Contouren
worden conservatief als massieve polygonen behandeld; compound-path-gaten
worden niet als vrije nestingsruimte gebruikt. De kandidaatset gebruikt rand-
en bounding-ankers. Een latere fase kan, na fysieke validatie, echte
compound-semantiek, uitgebreidere ankers en begrensde globale zoekmethoden
toevoegen.

## Snijafstand en breedte

- `absoluteMaxWidthMm = 450` is hard en kan niet worden overschreden.
- `preferredWorkingWidthMm = 440` is configureerbaar en geen harde limiet.
- `minimumCutGapMm` is configureerbaar in millimeters.
- `6,4 mm` is uitsluitend de conservatieve offline testwaarde. Patrick moet
  deze waarde fysiek valideren voordat ze een definitieve Sportpaleis-regel kan
  worden.

## Efficiency-metrics

Per job en gecombineerde kleur-batch worden berekend:

- `totalBoundingAreaMm2`: som van de object-bounding-boxes;
- `totalContourAreaMm2`: indicatieve som van absolute contourarealen;
- `usedProductionAreaMm2`: gebruikte breedte maal gebruikte lengte;
- `estimatedFoilAreaMm2`: gekozen werkbreedte maal gebruikte folielengte;
- `usedFoilLengthMm`: geschatte benodigde folielengte;
- `efficiencyPercent`: bounding area gedeeld door geschat folie-oppervlak;
- `wastedAreaMm2`: geschat folie-oppervlak minus bounding area;
- `wastedLengthIndicatorMm`: verspild oppervlak omgerekend naar lengte;
- `savedLengthVsBaselineMm`: besparing tegenover de eenvoudige shelf-baseline.

Dit zijn analytics voor optimalisatie en later waarde-inzicht in de WBD/
Sportpaleis Workspace. Ze zijn niet bedoeld als prominente technische details
voor medewerkers.

## Preview en Workspace-contract

`createColorBatchPreview` geeft per kleur-batch foliekleur, onderdelen,
objectaantal, globale SVG-nesting, gebruikte breedte, geschatte folielengte,
jobaantal en gereedstatus. De SVG gebruikt exact dezelfde
`CutJob.productionGeometry` als de DM/PL-round-trip. De normale preview bevat
geen DM/PL-, USB-, Illustrator- of WinPlot-bediening.

Het Workspace-contract definieert:

- `GET /v1/production-batches`;
- `GET /v1/production-batches/:cutBatchId`;
- `GET /v1/production-batches/:cutBatchId/preview`;
- `GET /v1/production-batches/:cutBatchId/readiness`;
- `POST /v1/production-batches/:cutBatchId/print-actions`;
- `READY_FOR_PRINTING` of `NOT_READY_FOR_PRINTING` met redenen;
- `HARDWARE_VALIDATION_REQUIRED` als Summa-statusplaceholder;
- een expliciet Print-action contract dat offline `accepted: false` en
  `HARDWARE_SEND_NOT_IMPLEMENTED` teruggeeft.

Het contract is klaar voor integratie in de Bedrukkingsmodule; de echte
Workspace-route en USB-send zijn niet in Optimization 004 geactiveerd.

## Offline bewijs

De regressies omvatten foliekleur-batching over verenigingen, materiaalcodes,
lettertypes, maten en ordertypes; strikte kleurscheiding; maatbehoud; minimumgap;
contourbotsing; 450-mm-grens; geen autoscale; baselinevergelijking;
determinisme; provenance; exacte batchsplit; synthetische initialen,
rugnummers, naamregels en concave vormen; 2/34/77; preview; Workspace-contract;
DM/PL-round-trip; bridge-lifecycle en de afwezigheid van een hardware-writepad.

## Hardwarevalidatie blijft vereist

Niet offline bewezen zijn de echte USB-driver/DLL, exclusieve device-handle,
machinefeedback, DM/PL-eindgedrag, fysieke 1:1-maat, werkelijke minimale
snijafstand, mes-/materiaalgedrag, pelbaarheid en betrouwbare fysieke
voltooiingsstatus. Daarvoor blijft Hardware Validation 001 de eerstvolgende
fysieke stap na een afzonderlijke GO.
