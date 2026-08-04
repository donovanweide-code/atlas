# WBD Workspace - Business Foundation v1

**Status:** canonieke bedrijfsfundering voor herbruikbare WBD-documenten  
**Geregistreerd:** 4 augustus 2026  
**Eerste toepassing:** Project 001A - WBD-factuursjabloon  
**Eigenaar:** We Build And Design

## Doel

De WBD Workspace Business Foundation bewaart de vaste basis voor zakelijke documenten van We Build And Design. De eerste gerealiseerde toepassing is het factuursjabloon. Dezelfde merk- en documentbasis kan later worden gebruikt voor offertes, opdrachtbevestigingen, zakelijke brieven en andere gecontroleerde bedrijfsdocumenten.

Dit is een blijvend bedrijfsmiddel van We Build And Design. Het is geen Sportpaleis-projectbestand. Sportpaleis is uitsluitend de eerste klantgebonden data-instance en PDF-output die met de fundering is gemaakt.

## Permanente locatie

| Onderdeel | Locatie | Verantwoordelijkheid |
|---|---|---|
| Officiële documentbranding | `invoices/wbd/brand.py` | Eén vectoriële implementatie van het actuele officiële WBD-logo voor zakelijke documenten |
| Factuurtemplate | `invoices/wbd/invoice.py` | A4-layout, Nederlandse notatie, btw-berekening en releasevalidatie |
| Factuurdata | `invoices/wbd/data/*.json` | Afzender-, klant-, factuur- en regeldata per document, los van de layout |
| Rekentests | `invoices/wbd/tests/` | Inclusieve en exclusieve btw-invoer, afronding en blockerbewaking |
| Definitieve uitvoer | `output/pdf/` | Gegenereerde, gecontroleerde PDF-artefacten |
| Visuele controle | `output/pdf/screenshots/` | Gerenderde pagina's voor layoutreview |

## Herbruikbare lagen

### 1. Merklaag

`invoices/wbd/brand.py` is de enige logocomponent voor documenten uit deze fundering. De component volgt het actuele publieke `W / BD`-merk met de volledige naam `WE BUILD AND DESIGN`. Facturen, offertes en andere zakelijke documenten bouwen geen eigen woordmerk, tijdelijke lock-up of klantgebonden logovariant.

De huidige bronlijn is:

- publieke merkcomponent: `website/src/main.ts`;
- actuele merkgeometrie en typografie: `website/src/styles/main.css` en `website/src/styles/public-pages.css`;
- zakelijke documentimplementatie: `invoices/wbd/brand.py`.

Wanneer de officiële publieke branding bewust verandert, wordt eerst deze merklaag aangepast en visueel gevalideerd. Documenttemplates nemen de wijziging daarna centraal over.

### 2. Documentlaag

Zakelijke documenten delen waar passend:

- WBD-kleuren en typografische hiërarchie;
- het officiële logo;
- A4-marges, metadata en footerprincipes;
- Nederlandse datum-, getal- en geldnotatie;
- gescheiden data en layout;
- nette afbreking en vervolgpagina's;
- expliciete concept- en definitieve status.

Een toekomstige offerte of zakelijke brief mag eigen inhoudelijke secties hebben, maar gebruikt dezelfde merklaag en documentprincipes. Er wordt geen klanttemplate gekopieerd als nieuwe bedrijfsbasis.

### 3. Factuurlaag

Het factuursjabloon ondersteunt meerdere regels en twee invoermethoden:

- bedragen inclusief btw, waarbij exclusief bedrag en btw automatisch worden teruggerekend;
- bedragen exclusief btw, waarbij btw en inclusief totaal automatisch worden toegevoegd.

Berekeningen gebruiken decimale centafronding per regel. Verwachte totalen kunnen als onafhankelijke validatie in de data worden vastgelegd. Een definitieve factuur wordt technisch geweigerd zolang expliciete blockers bestaan.

## Eerste klantgebonden toepassing

`invoices/wbd/data/sportpaleis-f00248-concept.json` bevat uitsluitend de eerste conceptdata:

- Bedrukkingsmodule - voorschot Codex-credits: € 100,00 inclusief btw;
- Bedrukkingsmodule - reeds gemaakte ontwikkelkosten: € 231,01 inclusief btw;
- totaal inclusief btw: € 331,01.

Deze bedragen, klantnaam en projectreferentie behoren tot de Sportpaleis-conceptfactuur. De generator, branding, tests en documentprincipes blijven eigendom en bedrijfsfundering van We Build And Design.

## Governance en grens

- Nieuwe klantfacturen krijgen een eigen databestand; zij wijzigen het basistemplate niet zonder algemene bedrijfsreden.
- Nieuwe documentsoorten gebruiken de gedeelde merklaag en documentprincipes.
- Factuurnummers worden bewust niet automatisch uitgegeven.
- IBAN, btw-nummer, KvK, klantgegevens en nummerbeschikbaarheid blijven vóór definitief gebruik menselijke controlepunten.
- Het bestaan van deze fundering maakt een conceptfactuur niet automatisch definitief.
- Klantbeheer, verzending, betaalstatus, herinneringen, boekhoudkoppelingen en abonnementenbeheer vallen buiten deze fundering.

## Hergebruikspad

1. Kies het zakelijke documenttype.
2. Gebruik de centrale merklaag uit `invoices/wbd/brand.py`.
3. Houd documentdata buiten de layout.
4. Voeg gerichte berekenings- en releasevalidatie toe.
5. Genereer naar `output/pdf/`.
6. Render iedere pagina en keur de visuele uitvoer goed vóór gebruik.

Zo groeit de WBD Workspace vanuit één herkenbare Business Foundation, zonder een facturatiesysteem of klantgebonden templateverzameling te bouwen.
