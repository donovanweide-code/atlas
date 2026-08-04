# Project 001A - WBD factuursjabloon

Dit is een vast, herbruikbaar factuursjabloon voor We Build And Design. Het is bewust geen facturatiesysteem: er is geen klantbeheer, automatische nummering, verzending, betaalstatus, abonnementenmodule of boekhoudkoppeling.

## Opbouw

- `invoice.py` bevat uitsluitend berekeningen, validatie en de A4-layout.
- `data/sportpaleis-f00248-concept.json` bevat alle afzender-, klant-, factuur- en regeldata van het eerste concept.
- `tests/test_invoice.py` controleert beide prijsinvoermethoden en voorkomt definitieve uitvoer zolang blockers bestaan.
- De gegenereerde PDF staat in `output/pdf/`; de visuele controle staat in `output/pdf/screenshots/`.

De vormgeving vertaalt de huidige WBD-identiteit naar een rustige zakelijke toepassing: inktgroen, warm papier, mineraalgroen en het gedempte goud uit de bestaande tokens; een redactionele serif voor betekenis en een rustige sans-serif voor gegevens. Omdat de repository nog geen goedgekeurd definitief vectorwoordmerk bevat, gebruikt het document de vastgestelde tweeregelige naam als ingetogen typografische lock-up en niet het verouderde `W / BD`-beeldmerk uit F00247.

## Bedragen inclusief en exclusief btw

Iedere regel heeft een expliciete `price_mode`:

- `inclusive`: `unit_price` is inclusief btw. De generator berekent eerst het regeltotaal inclusief btw, deelt dit door `1 + btw-tarief`, rondt commercieel af op centen en bepaalt btw als verschil.
- `exclusive`: `unit_price` is exclusief btw. De generator berekent btw over het exclusieve regeltotaal en telt die bij het totaal op.

Alle geldberekeningen gebruiken `Decimal` en `ROUND_HALF_UP`. Totalen worden opgebouwd uit de afgeronde regeltotalen. Met het optionele blok `expected_totals` stopt de generator direct als de berekende en verwachte bedragen verschillen.

Voorbeeld abonnement, exclusieve invoer:

```json
{
  "description": "Workspace Basis",
  "quantity": "1",
  "unit_price": "75.00",
  "vat_rate": "21",
  "price_mode": "exclusive"
}
```

Dit levert € 75,00 exclusief btw, € 15,75 btw en € 90,75 inclusief btw op.

## Genereren en testen

Gebruik de gebundelde Codex-Pythonruntime of een Pythonomgeving met ReportLab:

```powershell
python invoices/wbd/invoice.py `
  invoices/wbd/data/sportpaleis-f00248-concept.json `
  output/pdf/wbd-factuur-F00248-concept.pdf

python -m unittest discover invoices/wbd/tests
```

Lange omschrijvingen worden als alinea afgebroken. De factuurregeltabel herhaalt de kop op vervolgpagina's en ondersteunt een willekeurig aantal regels binnen de A4-printlayout.

## Uitgevoerde broncontroles

| Gegeven | Waarde in concept | Controle |
|---|---|---|
| Bedrijfsnaam | We Build And Design | F00247, interne eigenaarbevestiging en actuele publieke site |
| Adres | Gerard Terborchstraat 35, 1318 LE Almere | F00247, interne eigenaarbevestiging en actuele publieke site |
| KvK | 69326126 | F00247, interne eigenaarbevestiging en actuele publieke site |
| Btw | NL190255879B01 | Afzenderblok F00247, interne eigenaarbevestiging en actuele publieke site; conflict met footer blijft blocker |
| IBAN | NL16 KNAB 0603 6280 95 | Alleen F00247; moet vóór definitief gebruik door rekeninghouder worden bevestigd |
| BIC | KNABNL2H | F00247 en actuele officiële Knab-informatie |
| Telefoon | 06 100 67 964 | F00247, interne eigenaarbevestiging en actuele publieke site |
| E-mail | info@webuildanddesign.nl | F00247, interne eigenaarbevestiging en actuele publieke site |
| Website | webuildanddesign.nl | F00247 en actuele publieke site |

## Blockers vóór definitief gebruik

1. Bevestig dat `F00248` nog beschikbaar is. De repository bevat geen factuurregister en er wordt bewust geen automatische nummergenerator gebouwd.
2. Bevestig het juiste btw-nummer. F00247 bevat twee waarden: `NL190255879B01` in het afzenderblok en `NL190255870B01` in de footer. Het concept gebruikt `NL190255879B01`, omdat dit overeenkomt met de interne eigenaarbevestiging en de actuele publieke site.
3. Bevestig dat IBAN `NL16 KNAB 0603 6280 95` nog actief is en bij We Build And Design hoort. Een openbare IBAN-naamcontrole is niet mogelijk; controleer dit in de Knab-omgeving.
4. Vul de ontbrekende klantgegevens en klantreferentie in. Er zijn geen gegevens verzonnen.

De generator weigert `document_status: "final"` zolang `validation.blockers` niet leeg is.
