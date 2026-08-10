# Sportpaleis Workspace 005 — implementatie- en readinessdossier

Datum: 7 augustus 2026  
Build-ID: `SPW-005-20260807`  
Organisatie: Sport 2000 Sportpaleis B.V.  
Omgeving: lokale development- en workspace-previewbuild; niet productie-live

## 1. Uitgevoerde nulmeting

De bestaande route `/sportpaleis-proof` is een visueel sterke, tijdelijke orderinvoer. De data staat volledig in het browsergeheugen, wordt na herladen gewist en kent geen authenticatie, rollen, duurzame opslag of productie-statusmachine. De WBD Workspace op `/workspace/wbd` is een afzonderlijk klantdomein en blijft ongewijzigd.

De nieuwe implementatie staat daarom zelfstandig op `/workspace/sportpaleis/*`. De proof blijft als referentie bestaan en is niet tot productieomgeving gepromoveerd.

## 2. Ontwerpbron en merkgrens

Primaire ontwerpautoriteit: `NEW2025-CID_Manual_BENE sep 25.pdf`.

Toegepast:

- zwart en wit als basis, SPORT 2000-rood `#d10019` alleen voor focus en status;
- Arial als toegestane fallback omdat Chevin Pro niet lokaal beschikbaar is;
- korte labels en navigatie in kapitalen, rustige gridopbouw en monochrome lijniconen;
- geen verlopen, transparante merkeffecten of decoratieve kleuren;
- rustig, taakgericht en responsief.

Niet geïmproviseerd: het aanwezige oude horizontale Sportpaleis-logo is niet gebruikt. Een goedgekeurd officieel 2025 SPORT 2000 × SPORTPALEIS-combinatiebestand ontbreekt. De preview gebruikt daarom een neutrale tekstidentiteit die niet als officieel logo wordt gepresenteerd. Een goedgekeurd merkasset is verplicht vóór productie-live.

## 3. Gebouwde routes

- `/workspace/sportpaleis/overzicht`
- `/workspace/sportpaleis/orders`
- `/workspace/sportpaleis/orders/nieuw`
- `/workspace/sportpaleis/orders/:id`
- `/workspace/sportpaleis/productie`
- `/workspace/sportpaleis/context`
- `/workspace/sportpaleis/feedback`
- `/workspace/sportpaleis/voorkeuren`
- `/workspace/sportpaleis/beheer`

Overzicht bevat verplichte aandacht-, productie- en veiligheidsinformatie. Optionele recente wijzigingen en snelkoppelingen zijn per gebruiker instelbaar. De twee WBD-ontworpen weergaven zijn `Rust & focus` en `Meer in beeld`.

## 4. Rollen en abonnement

Standaard klantplan: drie actieve gebruikers.

- Kevin — beheerder;
- Patrick — productie/operator;
- Sportpaleis collega — productie/operator.

Alleen de beheerder krijgt de beheerroute met gebruikers, rollen, extra seats en commerciële informatie. WBD/Donovan-pilottoegang staat als niet-klantseat vermeld en is niet prominent in de normale werkflow.

Extra-gebruikersaanvragen worden lokaal en traceerbaar vastgelegd, zonder betaling of externe facturatie:

- +1: € 7,50 per maand;
- +2: € 12,50 per maand;
- +3: € 17,50 per maand.

## 5. Order- en productieflow

De enige normale volgorde is `Order → Controle → Print → Gereed`. De bronorder blijft in iedere status toegankelijk. Een order kan niet verdwijnen doordat productie niet beschikbaar is.

Direct Print 003/004 is alleen als voorbereidings- en previewlaag gekoppeld:

- foliekleur is de primaire batchsleutel;
- verschillende foliekleuren blijven strikt gescheiden;
- herkomst blijft per productieonderdeel aanwezig;
- nesting schaalt niet (`scaleApplied = 1`);
- absolute breedte is 450 mm, werkbreedte 440 mm;
- tijdelijke minimumafstand is 6,4 mm en is niet als definitieve praktijknorm gemarkeerd;
- de medewerker ziet een eenvoudige lijnpreview en productie-informatie, geen DM/PL, hash, USB- of driverdetails.

De Summa-status is uitsluitend een placeholder: `Hardwarevalidatie vereist`. De printknop is uitgeschakeld. De expliciete terugvalactie is `Gebruik bestaande productieroute`.

## 6. Pilot-failsafes

- hardware-send staat hard op `false`;
- geen automatische verzending vanuit de workspace;
- geen automatische retry bij `UNKNOWN_PARTIAL_SEND`;
- de bestaande Illustrator → WinPlot → Summa-route is niet aangepast;
- de order blijft de canonieke herstelbron;
- idempotente workspace-acties voorkomen dubbele statusmutaties;
- afwijkende hardwarestatus vereist menselijke controle.

## 7. Data, beveiliging en vertrouwen

Deze versie gebruikt lokale browseropslag voor werkdata en voorkeuren. De state-reducer valideert beheerrechten voor extra gebruikers en legt acties in een auditlog vast. Dit is geschikt voor visuele en functionele preview, maar niet voor een echte pilot met meerdere apparaten of accounts.

Nog verplicht vóór pilotgebruik:

- server-side authenticatie en sessiebeheer;
- server-side rolcontrole op iedere mutatie;
- gedeelde duurzame databaseopslag met back-up en herstel;
- concurrencycontrole op serverniveau;
- privacy-, retentie- en verwijderbeleid;
- definitieve derde gebruiker en zakelijke e-mailadressen valideren;
- expliciete acceptatie door Kevin en Patrick.

## 8. Kostenpreflight

### A — bestaand / € 0 extra voor deze preview

- huidige repository, Vite/TypeScript-toolchain en tests;
- lokale development- en workspace-previewbuild;
- bestaande Direct Print 003/004-rekenkern;
- lokale browseropslag en lokale screenshots;
- voorbereiding van de hostnaam zonder DNS-mutatie.

### B — noodzakelijk vóór pilot of live, nog niet geactiveerd

- beheerde hosting voor de workspace-preview/pilot;
- authenticatie en veilige sessies;
- database, back-up en herstel;
- logging/monitoring met bewaartermijn;
- TLS en domeinconfiguratie;
- goedgekeurd 2025-merkasset en eventueel Chevin Pro-webfont/licentie;
- hardwarevalidatie op de Sportpaleis-werkplek.

Exacte leverancierskosten zijn niet vastgesteld en er is niets betaald of geactiveerd. Iedere keuze in categorie B vereist vooraf afzonderlijke goedkeuring.

### C — later, niet nodig voor pilotfundament

- externe billing-/payment-integratie;
- attachments voor feedback;
- autonome infrastructuuracties;
- uitgebreide analytics;
- automatische Summa-bediening;
- extra optimalisatie van nesting na praktijkmetingen.

## 9. Hosting- en DNS-voorbereiding

Voorkeurshost: `workspace.sportpaleis.nl`.

Geen DNS-record, certificaat, hostingproject of productieomgeving is aangemaakt of gewijzigd. Voor activatie moet eerst worden gekozen waar de applicatie wordt gehost, hoe authenticatie wordt geleverd en welke origin/API-contracten gelden. Pas daarna kunnen een gecontroleerde previewhost, TLS, CSP, cookies en DNS worden ingericht.

## 10. Observability-fundament

Voorgesteld eventcontract, nog zonder externe transportlaag:

- `workspace.order.created`
- `workspace.order.stage_changed`
- `workspace.feedback.submitted`
- `workspace.preferences.saved`
- `workspace.users.requested`
- `direct_print.preview.opened`
- `direct_print.hardware_blocked`
- `direct_print.fallback_selected`
- `direct_print.unknown_partial_send`

Ieder event hoort minimaal organisatie, gebruiker, order/batch waar relevant, timestamp, build-ID en resultaat te bevatten. Geen persoonsgegevens in vrije logvelden. Alarmen zijn pas zinvol nadat eigenaar, kanaal, bewaartermijn en responstijd zijn vastgesteld. Deze opdracht activeert geen externe logging of autonome infra.

## 11. Pilot readiness checklist

- [x] zelfstandige Sportpaleis-routes en merkgrens;
- [x] desktop- en mobiele kernroutes;
- [x] order blijft altijd bereikbaar;
- [x] flow Order → Controle → Print → Gereed;
- [x] kleurgescheiden productiepreview;
- [x] 440/450 mm-regels en geen schaling;
- [x] hardware-send uit en fallback zichtbaar;
- [x] drie klantgebruikers en beheerweergave;
- [x] persoonlijke weergaven en verplichte panelen;
- [x] feedbackcontext en auditbasis;
- [x] TypeScript-, regressie- en workspace-buildcontrole;
- [ ] goedgekeurd officieel merkasset;
- [ ] echte authenticatie en server-side autorisatie;
- [ ] gedeelde duurzame opslag, back-up en herstel;
- [ ] privacy-/retentieafspraken;
- [ ] pilot hosting, TLS en gecontroleerde toegang;
- [ ] hardware- en fysieke snijvalidatie;
- [ ] acceptatie door Kevin en Patrick;
- [ ] draaiboek voor support en incidenten.

## 12. Readinessbesluit

Visuele review is verantwoord in de lokale developmentomgeving en de workspace-previewbuild. Pilotgebruik met echte klantorders is nog niet verantwoord door het ontbreken van echte auth, gedeelde opslag, hosting/toegangscontrole en fysieke hardwarevalidatie. Productie-live is nadrukkelijk niet gereed.

READY FOR VISUAL REVIEW: YES  
READY FOR PILOT USE: NO  
READY FOR PRODUCTION LIVE: NO  
DIRECT PRINT HARDWARE VALIDATED: NO
