# Sportpaleis Webshop Batch Intake V1.1

Status: BLOCKED — performance acceptance. De interactieve kandidaat is gebouwd en functioneel gecontroleerd; de vastgelegde koude PDF-/orderdetailgrenzen zijn niet consequent gehaald. Geen LIVE-mutatie of deployment.

## Basis en resultaat

Hergebruikt: a91aa41 op 82e7a08; dezelfde geïsoleerde branch codex/spw-mail-pdf-isolated-20260908. Alleen de bestaande intakebestanden en tests aangepast. Geen Teamwear-, centrale Mail-, Product Truth- of algemene productiecode gewijzigd.

De echte 1-012653-order.pdf blijft 138 pagina's / 137 bestellingen / 194 artikelen. De hoofdvoorraad blijft exact 18 bedrukte regels uit 9 bestellingen, oudste eerst. Bronhash en itemidentiteiten blijven gelijk aan V1. Zoeken, selectie, edit, herstel bronwaarde, uitsluiten/herstellen en idempotente PlotJob-proef blijven aanwezig.

## Productbeeld en orderdetail-pariteit

16/18 batchregels hebben een eenduidige bestaande catalogusmatch met lokaal productbeeld. De ontbrekende twee krijgen een rustige placeholder. Eén bestaande catalogusmatchfunctie en één gedeelde thumbnailpresentatie/cache worden in batch en detail hergebruikt. Geen extra catalogus of externe afbeeldingslookup.

Bestaande lokale WebP-assets worden bij aanvraag met de aanwezige canvas-library naar 96×96 WebP verkleind en op 48×48 getoond (42×42 mobiel). Lazy loading, browsercache en een begrensde geheugencache; gelijktijdige aanvragen delen dezelfde lopende thumbnailberekening. Geen afbeeldingsdatabase, grote preload of netwerkverzoek naar Sportpaleis. Alle unieke batchthumbnails samen: 30.204 bytes; voorbeeldshirt: 2.316 bytes. Zonder een aanvraag wordt geen thumbnail opgebouwd.

Bestelnummer 2635358683 opent vijf artikelen: twee bedrukt en drie overige contextregels. Beide bedrukte regels gebruiken exact dezelfde thumbnail-URL als in de batch. Ook het overige trainingsshirt 141550 krijgt een thumbnail; kousen 116347 en thermoshirt 124718 hebben geen eenduidige match in deze bestaande catalogus en tonen een placeholder. Totaal drie beelden / twee placeholders. Niet-bedrukte artikelen hebben geen productie- of selectieactie.

De volledige order wordt pas bij openen uit dezelfde, hashgecontroleerde bron geprojecteerd. Tot acht tijdelijke detailprojecties worden in geheugen gehouden; geen tekstlaag of PDF-bytes blijven daarin bewaard. Heropenen past de actuele overrides en uitsluitingen toe. Meerdere aanvragen van hetzelfde koude detail delen één parse. Echte orders 2635358683, 2635358543 en 2635358648 zijn gecontroleerd.

## Profiel, vrije invoer en eindcheck

116597, maat XL, rugnummer 88 → Senior, automatisch, uit het bestaande createOrder-contract en de authoritative Product Truth van 1 september: 200 mm. Junior op hetzelfde catalogusartikel met maat 128 en een expliciete eenmalige Junior-keuze zijn aanvullend getest. Automatische classificatie wordt alleen getoond wanneer het bestaande contract daadwerkelijk een onderbouwde rugnummerklasse teruggeeft; andere gevallen tonen Niet zeker. Er wordt geen generieke leeftijdsregel bij verzonnen. Junior/Senior-keuzes gebruiken het bestaande backNumberSizeClass-contract waar van toepassing.

Vrij invoeren staat naast geblokkeerde regels. Echte shortnummerwaarde MW is in de browser gecorrigeerd naar 88; de regel passeert daarna de bestaande controle. Echte onbekende artikelregel 131251 met een vrij profiel blijft na opslaan en heropenen bewaard én geblokkeerd zolang productie-authority ontbreekt. Vrije tekst verleent nooit productiebevoegdheid. Leesbare blokkeerreden en directe herstelactie zijn zichtbaar.

De bestaande structurele correctievlag projecteert nu ORDER_CORRECTION_CANDIDATE_V1 / STRUCTURAL_RULE_CANDIDATE met bron-/itemidentiteit, uitsluitend gewijzigde velden, actor en timestamp. Promotion is NOT_AUTHORIZED. Geen automatisch leren, herhalingsdetectie of Product Truth-mutatie.

De compacte eindcheck toont geselecteerde regels, bestellingen, aantallen per foliekleur, blokkades en uitgesloten regels. Eén expliciete proefbevestiging. Werkelijke PlotJob-mutatie blijft bij het bestaande centrale contract en vereist aparte GO.

## Concurrency

Aangetroffen en gericht gecorrigeerd: de V1-review gebruikte één cookie/CSRF/actor voor alle browsers. Nu heeft elke lokale reviewsessie een eigen cookie, CSRF-token, actor en eigen bevestigingsvoorbereiding. Selections blijven uitsluitend in het eigen browserdocument. Caches, batch en sessies zijn per serverinstantie; een tweede instantie begint zonder de batch van de eerste. Geen module-globale gebruikers- of batchstate toegevoegd. Bestaande SQLite-transacties en revisiecontrole blijven de duurzame waarheid.

Gevalideerd: tien gelijktijdige koude loads, honderd reads via tien sessies en vijf gelijktijdige zoek/select/edit-browsersessies. Tien unieke cookies, CSRF-tokens en actors; een token van een andere sessie wordt geweigerd. De vijf browserselecties bleven onafhankelijk. Bij vijf gelijktijdige edits wint één wijziging; de andere vier zien expliciet een conflict en kunnen via Bekijk laatste wijziging bewust opnieuw bewerken. Vijf aparte actors worden bij hun eigen wijzigingen vastgelegd.

Twee edits op dezelfde regel: één 200 en één 409; geen silent overwrite. Gelijktijdige exclude/restore: één 200 en één 409; een expliciete retry op de laatste revisie geeft consistente eindstate. Twee gebruikers bevestigen hetzelfde geldige item: één receipt, één duplicate-resultaat. Tien koude loads veroorzaken één batchparse. Tien aanvragen voor hetzelfde detail veroorzaken één detailparse. Tien gelijktijdige aanvragen van hetzelfde beeld veroorzaken één thumbnailberekening. Geen PDF-parse per artikelregel.

| Onderdeel | Samples | p50 | p95 |
|---|---:|---:|---:|
| Koude load, 10 sessies | 10 | 3461 ms | 3476 ms |
| Batch lezen | 100 | 38 ms | 64 ms |
| Koud detail, 10 sessies | 10 | 2996 ms | 3022 ms |
| Zoekrender, 5 browsers | 5 | 4,6 ms | 4,6 ms |
| Selectie, 5 browsers | 5 | 5,0 ms | 5,6 ms |
| Browser edit/conflict | 5 | 312 ms | 329 ms |
| Twee conflicterende API-edits | 2 | 27,3 ms | 27,5 ms |
| Exclude/restore + retry | 3 | 21,1 ms | 21,3 ms |
| Gelijktijdige handoff | 2 | 13,8 ms | 14,1 ms |

Dit zijn gemeten samples, geen productie-SLA. Bottleneck: de veilige revisiecontrole geldt voor de hele batch. Ook edits op verschillende regels kunnen elkaar daarom laten verversen. Koude details wachten op de ene lopende parse. Geen brede infrastructuurwijziging uitgevoerd. Deze lokale sessies bewijzen concurrency in één serverproces; echte accounts en release blijven via de bestaande Workspace-authenticatie lopen. Geen claim over meerdere productie-instances of live multi-user rollout.

## Performance en blocker

Eerdere V1.1-meting: batch 1,13 s; eerste detail 0,862 s. Laatste volledige HTTP-run: PDF 3,244 s, structurering 171 ms, batch 3,790 s, detail 3,018 s, gecachet detail 4,35 ms. De grens PDF <2,5 s en detail <3 s wordt daarmee overschreden. De test schrijft ook bij performancefalen het functionele bewijs weg en faalt daarna; geen grens is versoepeld.

Gecontroleerde beeld-hotfixvergelijking op dezelfde bron/servercode, uitsluitend detailbeeldmatching uit/aan: vóór 3,282 s; ná 3,367 s (+85 ms, +2,6%, één meetpaar). Ook vóór de hotfix was de oorspronkelijke 0,9 s op dat moment niet reproduceerbaar. Het gemeten koude PDF-deel zat al op 3,15–3,38 s zonder thumbnailverzoeken. Oorzaak van de bredere vertraging is niet vastgesteld; er wordt geen onbewezen CPU-/hostverklaring als feit gebruikt.

Laatste browserproef: detail 2,852 s; zoeken 1,0 ms; selectie 1,5 ms; edit openen 5,7 ms; opslaan/render 20,2 ms. Functionele browserproef groen op desktop, 390 en 320 px; drie detailbeelden visueel gecontroleerd. Geen horizontale overflow, externe requests of browserfouten. De strengere circa-0,9-s-doelstelling is nog niet aangetoond. Daarom blijft de totale acceptatie BLOCKED ondanks functionele en concurrency-successen.

## Opslag, tests en vervolg

Persistente PDF-blobs = 0; full PDF text = 0; full order archive = 0. SQLite bevat alleen V1-deltas/vlaggen en minimale receipts. Geen schema-uitbreiding voor volledige orders, profielcatalogus of beelden. Testdatabase 24.576 bytes. De echte bronhash is onveranderd.

15/15 gerichte unit-/parser-tests groen. De uitgebreide echte HTTP-test doorloopt alle functionele assertions, maar eindigt rood op de twee gemelde prestatielimieten. De finale browserproef is groen; de aparte concurrencyproef is groen. De eerdere gecombineerde worker-stresstest had 26/27 groen, met de koude PDF-performanceassert als enige fout. Bestaande V1-afhankelijkheden (fontbron ontbreekt; Teamkit 220 versus 200 mm-testverwachting) zijn niet aangepast of als opgelost verklaard.

Open: performanceoorzaak en herhaalbare koude meetwaarden binnen de vaste grenzen; bestaande centrale auth/mail/PlotJob-releasekoppeling; catalogus-authority voor 140306/131251. Geen brede productie-refactor voor deze blockers. Zie SPORTPALEIS-WEBSHOP-BATCH-V1-1-PROOF.json voor meetdata en bewijs.

Review: http://127.0.0.1:4187. Klik Laad batch en open een bestelnummer. Alleen lokale proef; geen echte productie. Starten werkt met hetzelfde V1-reviewservercommando. De nieuwe concurrencytest gebruikt SPORTPALEIS_BATCH_PDF, PLAYWRIGHT_MODULE en optioneel SPORTPALEIS_CONCURRENCY_PROOF; alle integratietests gebruiken eigen tijdelijke databases.
