# Orderdetail performance — diagnose en gerichte optimalisatie

Resultaat: PASS. Gebouwd bovenop 855071b; alle beeldpariteit behouden. Geen refactor, nieuwe feature, UI-wijziging of persistente opslag. De eerder gemelde performanceblokkade is met deze metingen en gerichte verbetering afgedekt voor de lokale review; geen LIVE-vrijgave.

## Diagnose

Vijf verschillende koude orderdetails uit de echte 138-pagina 1-012653-order.pdf, plus één heropening uit de bestaande tijdelijke cache, zijn vóór en na de wijziging met hetzelfde browserscript gemeten. Orders: 2635358683, 2635358543, 2635358614, 2635358648 en 2635358566.

98,7% van de gemeten servertijd vóór de wijziging ging naar het opnieuw uitlezen van alle 138 pagina's. Er was geen dubbele cataloguslookup of imagefetch die de vertraging verklaarde. Bronaccess, orderreconstructie, Product Truth-cache en browserrender waren klein. De Server-Timing-header meet bovendien handler en JSON-serialisatie afzonderlijk; serialisatie kostte circa 0,03 ms.

De oude 3,3 s bleek bij deze diagnose niet reproduceerbaar. Ook circa 0,9 s is geen vaste baseline: de gecontroleerde nulmeting was 0,70–0,72 s. Zonder gelijktijdige omgevingsmetingen is de eerdere bredere vertraging niet causaal vastgesteld; deze verbetering wordt daarom vergeleken met de nieuwe gecontroleerde nulmeting, niet met 3,3 s.

## Kleinste gerichte wijziging

De batch kent al de bronpagina's van elke bestelling uit de volledige parse. Alleen bij een koud orderdetail worden nu die bekende pagina's opnieuw tekstueel uitgelezen. Voor 2635358683 is dat pagina 122 in plaats van alle 138 pagina's. Het volledige bestand wordt nog steeds op hash gecontroleerd. De initiële batchparse blijft volledig en alle bestaande byte-, pagina-, tekst-, geheugen-, timeout- en OCR-grenzen blijven behouden.

Dezelfde geïsoleerde worker, dezelfde reconstructie, Product Truth-cache en thumbnailcache worden gebruikt. Er is geen tweede parser of blijvende worker/cache toegevoegd. Scope in de evidence is expliciet SELECTED_PAGES_ONLY, met de oorspronkelijke paginanummers en een eigen scopegebonden evidence-identiteit. De bron-/itemidentiteiten van de batch blijven gelijk. Bij ambigu herhaalde orderkoppen blijft de bestaande volledige bronroute gelden. De bestaande tijdelijke detailcache voorkomt een tweede parse bij heropenen of gelijktijdige aanvragen.

## Gescheiden metingen

Mediaan, milliseconden; vijf koude details per kant. De totaalregels omvatten eerdere stappen en moeten niet bij elkaar worden opgeteld.

| Stap | Vóór | Na |
|---|---:|---:|
| Bronaccess: stat, lezen en hash | 1.927 | 2.455 |
| PDF-parse inclusief geïsoleerde worker/IPC | 697.370 | 367.081 |
| Orderreconstructie | 6.466 | 0.876 |
| Catalogus-/imagematch | 0.140 | 0.178 |
| Junior/Senior/Product Truth lookup | 0.488 | 0.382 |
| Serverhandler totaal, inclusief bovenstaande | 706.328 | 371.179 |
| Browser: request t/m JSON ontvangen/gedecodeerd | 710.300 | 376.000 |
| Browser DOM-render | 0.600 | 0.600 |
| Orderdetail zichtbaar, totaal | 710.900 | 376.500 |

Browser-totaal p50: 710,9 → 376,5 ms (47% sneller). p95: 717,0 → 426,7 ms (40% sneller). Heropenen uit de bestaande detailcache: circa 4,7 ms in de browser. De resterende parsekost omvat het starten van de geïsoleerde worker en het openen van het PDF-document; daarop is geen tweede optimalisatie toegepast.

De nieuwe reproduceerbare baseline in deze vijf metingen is circa 0,38 s p50 / 0,43 s p95 voor een koud detail. Dit is een gemeten lokale baseline, geen garantie voor iedere machine of belasting. De aparte volledige HTTP-integratietest mat 313 ms voor order 2635358683 en 884 ms voor de complete batch.

## Behoud en validatie

- Beeldpariteit: order 2635358683 blijft vijf artikelen tonen, waarvan twee bedrukt; dezelfde drie thumbnails en twee placeholders. De overige geteste orders houden eveneens hun beeldmatches. Geen thumbnail-, lookup- of preloadwijziging.
- Persistent: PDF = 0; volledige PDF-tekst = 0; volledig orderarchief = 0. SQLite-deltas en receipts ongewijzigd. Geen schemawijziging.
- 28/28 gerichte worker-/parser-/batchtests groen. Nieuwe tests controleren paginaselectie, oorspronkelijke nummering, scope-identiteit, ongeldige/ontbrekende pagina's, OCR en volledige documentpaginacap, plus identieke item-ID's bij vervolgpagina's en meerdere orders op één pagina.
- Echte HTTP-integratietest groen: alle prestatiegrenzen, volledige ordercontext, images, overrides, exclude/restore, restart en idempotente proefbevestiging.
- Browserdiagnose: vijf koude orders en één cacheheropening; alle representatieve order- en beeldcontroles groen.
- Concurrency groen: tien aparte read-sessies, vijf zoek/select/edit-browsersessies, onafhankelijke selecties, zichtbare editconflicten, consistente exclude/restore en één idempotente handoffreceipt. Eén batchparse en één detailparse bij gelijktijdige aanvragen.

Concurrency p50/p95: batch lezen 12,1/23,9 ms; koud detail 338,5/343,7 ms; browser edit 136,2/140,1 ms; tien koude batchloads 969,5/976,0 ms. De reeds bekende batchbrede revisiecontrole blijft de write-bottleneck en is niet gewijzigd.

De complete ruwe meetdata, afzonderlijke requests en Server-Timing-waarden staan in SPORTPALEIS-ORDERDETAIL-PERFORMANCE-PROOF.json. Het herhaalbare diagnosebrowserscript is website/tests/sportpaleis-orderdetail-diagnosis.integration.mjs; het gebruikt dezelfde SPORTPALEIS_BATCH_PDF en PLAYWRIGHT_MODULE als de bestaande browsertest, plus DIAGNOSIS_OUTPUT en optioneel DIAGNOSIS_LABEL.

Review: http://127.0.0.1:4187. Alle bestaande V1.1-bedieningen blijven gelijk. Geen LIVE-mutatie of deployment; centrale productie-/auth-/mailafhankelijkheden zijn niet gewijzigd.
