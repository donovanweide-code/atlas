# Praktijkreview Bij Cees — levering

> **Status:** niet-canoniek reviewresultaat
> **Onderzocht op:** 25 juli 2026
> **Grens:** geen casevorming, acceptatiebesluit, productieaanpassing of planning

## Ondernemersvraag

Welke terugkoppeling kan Donovan op basis van de actuele werkelijkheid betrouwbaar aan Cees geven over:

- wat aantoonbaar is gerealiseerd;
- wat nog openstaat;
- wat oplevering blokkeert;
- welke onzekerheden eerst onderzocht moeten worden;
- wanneer een volgende terugkoppeling verantwoord is.

## Onderzochte bronnen

### Actuele publieke webshop

Read-only gecontroleerd op 25 juli 2026:

- `https://www.bijcees.nl/`
- `https://www.bijcees.nl/product-categorie/koken-en-tafelen/`
- `https://www.bijcees.nl/product/cabanaz-tea-coffee-pot-theepot/`
- `https://www.bijcees.nl/winkelmand/`
- `https://www.bijcees.nl/afrekenen/`

De winkelwagen- en checkoutcontrole gebruikte tijdelijk één product. Het product is na de controle weer uit de testsessie verwijderd. Er is geen bestelling geplaatst, betaling gestart of productie-instelling gewijzigd.

### Lokale implementatiesporen

- De map `Desktop/Bijcees` bevat recente banner- en categoriebeelden van 17 tot en met 30 juni 2026.
- Dezelfde bestandsnamen en beelden zijn via `/wp-content/uploads/2026/06/` op de live homepage teruggevonden.
- Een lokale WordPress/WooCommerce-databasedump is gegenereerd op 18 juli 2026 om 20:18.
- Het bestand met API-gegevens is niet geopend of gebruikt.

### Gericht scopeonderzoek

Vier lokale Bij Cees-facturen uit 2024 en 2025 zijn read-only beoordeeld:

- `F00237` noemt updates en een wijziging van verzendkosten;
- `F00241` noemt een thema-update en foutoplossing;
- `F00239` en `F00244` gaan over de bouw en afronding van de AquaFlask-website.

Deze facturen bewijzen een bestaande werkrelatie en eerder uitgevoerd werk. Zij beschrijven niet de wijzigingsronde van juni 2026 en bevatten geen actuele acceptatiecriteria voor banners, Klarna, productpagina's, categorieën, menu, winkelwagen of filters.

Binnen de onderzochte lokale bestanden is geen offerte, briefing, wijzigingsverzoek of ander document uit 2026 gevonden dat de actuele scope verantwoord kan dragen.

**Beslissende ontbrekende bron:** het vroegste herleidbare e-mail-, WhatsApp- of briefingsspoor waarin Cees of Donovan de huidige wijzigingsronde beschrijft.

## Aantoonbaar gerealiseerd

### Banners

De live homepage laadt nieuwe Gusta-, Puhlmann-, Cabanaz- en AquaFlask-banners. Voor Gusta bestaat ook een mobiele variant. De live bestandsnamen sluiten aan op de lokale implementatie-assets.

**Bewijsgrens:** zichtbaar en live is niet hetzelfde als door de ondernemer geaccepteerd of op iedere viewport inhoudelijk beoordeeld.

### Menu en categorie-indeling

Het live hoofdmenu toont de nieuwe hoofdrichting `Keuken`, `Tafelen`, `Woonstyling`, `Drinkflessen` en `Merken`, met onderliggende categorieën. De mobiele pagina bevat dezelfde menustructuur en veroorzaakt bij de gecontroleerde viewport geen horizontale pagina-overflow.

**Bewijsgrens:** de huidige structuur is live, maar de oorspronkelijke gewenste indeling en volledige linkdekking zijn niet als acceptatiebron beschikbaar.

### Productpagina

De gecontroleerde Cabanaz-productpagina bevat:

- titel en prijs;
- acht productafbeeldingen;
- zeven kleurvarianten;
- beschrijving, aanvullende informatie en beoordelingen;
- een werkende winkelwagenhandeling.

**Bewijsgrens:** dit is één representatieve controle en bewijst niet dat iedere productpagina volledig of consistent is.

### Winkelwagen en checkout

Een product kon aan de winkelwagen worden toegevoegd. De winkelwagen berekende subtotaal, btw en totaal en bood een route naar checkout. De checkout toonde Klarna, iDEAL/Wero, kaart, Bancontact en PayPal.

**Bewijsgrens:** er is bewust geen bestelling geplaatst en geen betaling uitgevoerd. De technische en administratieve afhandeling na `Bestelling plaatsen` is dus niet bewezen.

### Filters

De categoriepagina toont categorieën, sortering, productaantallen en een prijsfilter. De YITH-filtercomponent is in de pagina-assets herkenbaar, maar tijdens de controle verscheen geen aantoonbare aanvullende attribuutfilter.

**Bewijsgrens:** de bron vermeldt alleen een `beoogde verbetering van de filters`. Zonder oorspronkelijke bedoeling of acceptatiecriterium kan niet worden vastgesteld of de actuele filterwerking de gevraagde verbetering is.

## Formele afronding

Op basis van de beschikbare bronnen kan geen afzonderlijk werkitem formeel als geaccepteerd `af` worden aangemerkt.

De implementatie is op meerdere onderdelen aantoonbaar live. Wat ontbreekt is een herleidbare verbinding tussen:

**oorspronkelijke klantvraag → acceptatiecriterium → actuele controle → menselijke acceptatie**

## Wat nog openstaat

1. Het vroegste communicatie- of briefingsspoor van de huidige wijzigingsronde verkrijgen; de lokale documentzoektocht leverde geen actuele scopebron op.
2. Per genoemd werkitem vaststellen wat `af` betekende.
3. De bedoelde filterverbetering expliciet maken en gericht toetsen.
4. De dekking van categorieën, productpagina's en menuverbindingen breder controleren.
5. Checkout, betaling, orderbevestiging en verzending end-to-end laten valideren zonder ongecontroleerde productiehandeling.
6. De eerder door Donovan ervaren fricties concreet aan een pagina, handeling en bron verbinden.

## Blokkers voor oplevering

- Er ontbreekt een herleidbare scope- en acceptatiebron per werkitem.
- De filterbedoeling en het bijbehorende acceptatiecriterium zijn onbekend.
- De volledige orderketen na checkout is niet veilig bewezen.
- Er is nog geen menselijke acceptatie van Cees op de actuele uitkomst vastgelegd.

De Engelse checkouttekst `Enter your address to view shipping options.` is live waargenomen. Zonder acceptatiegrens is dit een concrete frictie, maar nog niet zelfstandig een opleveringsblokker.

## Beslissende onzekerheden

- Wat vroeg Cees oorspronkelijk precies?
- Welke fricties zag Donovan bij zijn eerdere controle?
- Welke filterwerking moest aantoonbaar verbeteren?
- Moest de opdracht alleen technisch live staan, of ook inhoudelijk en end-to-end worden geaccepteerd?
- Welke onderdelen ervaart Cees zelf nog als onaf?

## Betrouwbare volgende terugkoppeling

Een begrensde voortgangsterugkoppeling kan **nu** worden gegeven:

> De banners, nieuwe menustructuur, categorie-indeling, productpresentatie, winkelwagenroute en Klarna zijn aantoonbaar live. Ik beschouw de oplevering nog niet als definitief afgerond, omdat de afgesproken acceptatie per onderdeel, de bedoelde filterverbetering en de volledige orderketen nog gecontroleerd moeten worden. Ik breng die punten eerst herleidbaar in kaart voordat ik een einddatum of afronding bevestig.

Een betrouwbare opleverdatum kan op basis van de huidige bronnen nog niet worden genoemd. Die wordt pas verantwoord nadat de oorspronkelijke scope, het filtercriterium en de veilige end-to-end validatieroute bekend zijn.

## Betekenis voor Atlas

Dit onderzoek voegt nieuwe herleidbare werkelijkheid toe aan de bestaande Oriëntatie en activeert daarmee de vastgelegde terugkeertrigger.

Het reviewresultaat:

- maakt Bij Cees niet automatisch tot case;
- kent geen case-ID, CASE-SNAPSHOT, Focus- of Kompaspositie toe;
- neemt geen acceptatiebesluit namens Donovan of Cees;
- introduceert geen nieuwe methode;
- maakt de actuele leveringsgrens wel zichtbaar voor dagelijks gebruik.
