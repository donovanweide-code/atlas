# Sportpaleis Workspace — PRE-PILOT MASTER completion/correction

## A. Release/build ID en grens

`SPW-PRE-PILOT-MASTER-CORRECTION-20260811`

Dit is uitsluitend een lokale, ongepubliceerde human-reviewbuild. Er is niets gedeployed; productie, DNS, TransIP, externe mail, WinPlot-hardware en plotter zijn onaangeraakt gebleven.

## B. KEEP / MODIFY / ADD / REMOVE

### KEEP

- Bestaande Sportpaleis-shell, beeldtaal, centrale orderwaarheid, audit, revision en idempotency.
- Canonieke orderflow: Klant → Vereniging → Artikelen → Bedrukking → Controleren/invoeren.
- ACA XPRT als transactionele webshopautoriteit.
- Menselijke GO vóór productie; geen automatische Illustrator-, WinPlot-, Summa-, mail- of hardwarehandeling.

### MODIFY

- Artikelen zijn per productieprofiel gegroepeerd met een representatieve kaart en compacte vervolgkaarten.
- Productieprofielen zijn binnen het begrensde productiedomein ook door de operator te beheren; gebruikers, commercie en algemeen beheer blijven admin-only.
- Pilotdatamodel is schema 10 en bewaart productie-elementen, varianten, orderbehoefte en Mailbatch-inputmetadata.

### ADD

- Productie-gapmatrix voor alle 20 vastgelegde verenigingen/profielen.
- Herbruikbare productie-elementen voor vereniging, klant, sponsor of eigen merk, met interne/externe productiewijze en bronstatus.
- Minimum, doelvoorraad, open orderbehoefte, effectief vrije voorraad en menselijk aanvulvoorstel.
- Veilige Quick PIN voor winkel/operator op een gedeeld apparaat: scrypt + unieke salt, 4–8 cijfers, vijf pogingen per 15 minuten, lockout, audit en wachtwoord-step-up voor admin/support.
- Handmatige CSV/TSV-import met headercontract, SHA-256, bestandsnaam, rijtelling, provenance en bron-idempotency.
- Tien representatieve WinPlot-specificatiecases: vier positief bewezen en zes expliciet geblokkeerd.

### REMOVE / niet toegevoegd

- Geen universele PIN-login, geen PIN voor admin/support en geen stil herstel van een lockout.
- Geen IMAP, mailboxscraping, PDF/OCR of automatische terugschrijving naar XPRT.
- Geen verzonnen logo, contour, voorraad, maat, exportrecord of fysieke validatie.

## C. Productie-gapmatrix

Artefacten:

- `outputs/sportpaleis-prepilot-completion-20260811/PRODUCTION-GAP-MATRIX.json`
- `outputs/sportpaleis-prepilot-completion-20260811/PRODUCTION-GAP-MATRIX.md`

De matrix bevat 20/20 vastgelegde verenigingen met artikelgroepprofiel, letterprofiel, folie, toegestane bedrukopties, bronmaten, Juniorregel, maakbaarheidsstatus en precieze DATA_GAPS.

Belangrijkste feit: geen enkel volledig verenigingsprofiel is end-to-end cut-ready bewezen. Almerer Pioneers heeft één partiële fysieke scope: uitsluitend Senior-rugnummers 2, 34 en 77 op 200 mm. De bronmatrix configureert andere profielen, maar bewijst geen lokaal vectorbestand, snijcontour of fysieke output.

## D. Productie-elementen en min/max

- Elementen en varianten zijn centraal, gereviseerd en geaudit beheerbaar door admin/operator.
- Eigenaarschap is expliciet: vereniging, klant, sponsor of eigen merk.
- Iedere variant houdt interne plotproductie en externe bestelling uit elkaar.
- Effectief vrij = huidige voorraad − behoefte van open orders. Afgeronde orders tellen niet mee.
- Tekort = effectief vrij onder minimum. Voorstel = aanvullen tot doelvoorraad; dit is advies, geen automatische bestelling of mail.
- Onbekende bron, afmeting, voorraad, minimum of doel blijft zichtbaar als DATA_GAP.
- Er zijn bewust geen echte productie-elementen of voorraden vooringevuld omdat daarvoor geen betrouwbare bronbestanden zijn aangetroffen.

## E. WinPlot-acceptatieset

Map: `outputs/sportpaleis-prepilot-completion-20260811/`

- 10 cases gespecificeerd.
- 4 `READY_FOR_OFFLINE_HUMAN_REVIEW`: Pioneers 2, 34, 77 en een representatieve teammix van dezelfde bewezen contouren.
- Voor deze 4 cases: CutJob JSON, DM/PL, SVG-preview en roundtrip JSON; alle vier roundtrips slagen op schaal 1:1.
- 6 `BLOCKED_DATA_GAP`: Waterwijk, Buitenhout MHC, DCG, MHC Lelystad, FC Huizen en HBSA.
- Voor de 6 geblokkeerde cases bestaat alleen een `.blocked.json`; er is bewust geen onbewezen CutJob, DM/PL, SVG of roundtrip gemaakt.
- `hardwareSendEnabled=false`, `physicalPlotPerformed=false`.

Dit is de maximaal betrouwbare positieve set met de lokaal aanwezige bewijsbasis: **4 cases**.

## F. Folie-optimalisatie

De vier uitvoerbare cases gebruiken de bestaande deterministische multi-heuristic, contourveilige nesting zonder schaling, met 440 mm werkbreedte, 450 mm absoluut maximum, 6,4 mm minimale tussenruimte en 5 mm rand.

- Alle cases blijven op schaal 1:1 en binnen de absolute breedte.
- De grote teammix gebruikt 416,4 mm breedte en 548,925 mm lengte, met 87,13% bounding-boxefficiëntie.
- De engine evalueert 31 kandidaten voor die teammix. In deze specifieke bewezen set is de gekozen lengte gelijk aan de bestaande baseline; er wordt dus geen fictieve foliebesparing geclaimd.
- Het manifest bewaart strategie, kandidaten, gebruikte/baselinelengte, besparing, efficiency en verspild oppervlak per positieve case.

## G. Mailbatch / XPRT-export

### PASS

- Handmatige lokale CSV/TSV-import werkt met verplichte externe regel-ID, orderreferentie en klant.
- Nederlandse/Engelse headeraliassen, quotes, scheidingstekenherkenning, dubbele regel-ID-blokkade, maximaal 1 MB/500 records, SHA-256 en provenance zijn getest.
- Een identiek `sourceMessageId` maakt geen tweede batch.
- Workspace bewaart `REAL_EXPORT_UNCONFIRMED` totdat de exportvorm menselijk als werkelijke ACA XPRT-output is bevestigd.

### BLOCKED

Er is lokaal geen daadwerkelijk ACA XPRT/Mailbatch-exportbestand aangetroffen. Acceptatie op een echte export en definitieve headermapping kan daarom niet eerlijk als PASS worden gemeld. Er is geen export nagebouwd of als echt voorgesteld.

## H. Quick PIN

Status: **technisch PASS voor lokale human review**.

- Alleen admin kan een PIN instellen, resetten of verwijderen voor winkel/operator.
- PIN wordt nooit plaintext opgeslagen of aan bootstrap/API teruggegeven.
- Scrypt met unieke salt en timing-safe verificatie.
- Alleen gedeelde sessie; persoonlijke sessie weigert PIN-switch.
- Admin/support blijven volledig wachtwoord-only.
- Vijf foutieve PIN-pogingen binnen 15 minuten activeren lockout; fouten en succesvolle wissels krijgen audit met authmethode.
- Gevoelige beheeracties blijven server-side rolbegrensd; Quick PIN verbreedt geen bevoegdheden.

## I. Artikelgroepen en productieregels

- De orderflow toont artikelen gegroepeerd op productieprofiel met één representatieve foto en thumbnails/vervolgkaarten.
- De bestaande `+`-actie, aantallen, selectie en zoekfunctie blijven werken.
- Admin én operator kunnen productieprofielen corrigeren binnen hetzelfde gereviseerde/audited contract.
- Winkelrol kan productie-elementen en profielen niet beheren; commercie, gebruikerstoegang, folieprijzen en algemene instellingen blijven admin-only.

## J. Verificatie

- Volledige regressie: **480/480 geslaagd**, 0 fouten.
- Publieke build + boundaryverificatie: geslaagd.
- Workspace-only build + boundaryverificatie: geslaagd; 11 bestanden en 8 tekstbestanden gecontroleerd.
- Nieuwe tests: schema-10-migratie, PIN-hash/rollen/device/rate-limit/audit, operatorprofielen, productie-elementen/min-max/open vraag, CSV/TSV-provenance/header/idempotency.
- Desktopbrowser 1440 × 900: Build ID, adminroutes, 19 profielvormen, productie-elementvorm, requirementvorm, Mailbatchimport en artikelgroepen gecontroleerd; geen horizontale overflow.
- Mobiel 390 × 844: Home, productie-elementen, Webshop en vijfstappenorder gecontroleerd; vaste mobiele navigatie, correcte volgorde en geen horizontale overflow.
- Browserconsole: 0 errors, 0 warnings.
- Bekende bestaande buildwaarschuwing: groot workspacechunk; functioneel en boundary-technisch niet blokkerend voor deze lokale review.

## K. Human Acceptance en GO/NO-GO

### Human Acceptance

1. Bevestig lokaal Build ID `SPW-PRE-PILOT-MASTER-CORRECTION-20260811`.
2. Laat Kevin een Quick PIN voor winkel/operator instellen; test gedeeld, persoonlijk, foutpogingen, lockout, reset/verwijderen en wachtwoord-step-up. Gebruik geen productie-PIN in reviewnotities.
3. Controleer als Patrick dat productieregels en productie-elementen beheerbaar zijn, maar gebruiker/commercieel/adminbeheer niet.
4. Voeg uitsluitend met echte bron/provenance een productie-element en variant toe; koppel open orderbehoefte en controleer huidig − open vraag, minimum, doel en aanvulvoorstel.
5. Controleer de 20 regels in de productie-gapmatrix met Sportpaleis-vakkennis en vul alleen aantoonbare bronbestanden/contouren/fysieke validatie aan.
6. Lever één echte ACA XPRT/Mailbatch CSV/TSV-export aan en bevestig de header-/recordmapping vóór operationeel gebruik.
7. Open uitsluitend de vier READY-DM/PL-bestanden offline in WinPlot. Controleer contouren, 200 mm, schaal, spiegeling, rotatie, tussenruimte, pelbaarheid en praktisch foliegebruik. Plot niets zonder aparte GO.
8. Bevestig dat de zes `.blocked.json`-cases geen DM/PL bevatten en pas na echte bron + fysieke validatie naar READY mogen.
9. Test desktop en fysieke telefoon/PWA; browseremulatie is geen echte apparaatacceptatie.

### Advies

- **GO** voor lokale menselijke review van deze completion/correction build.
- **NO-GO** voor fysieke productie buiten de vier bewezen Pioneers-cases.
- **NO-GO** voor operationele XPRT-import totdat een echt exportbestand is geaccepteerd.
- **NO-GO** voor live/deploy/DNS/TransIP/externe mail/hardware zonder afzonderlijke menselijke GO.
