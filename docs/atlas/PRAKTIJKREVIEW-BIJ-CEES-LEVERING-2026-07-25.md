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

### Eerste herleidbare scopebron

Donovan leverde op 25 juli 2026 twee screenshots aan van een doorgestuurde e-mail van 29 januari 2026 om 12:23:46 CET met onderwerp `Menubalk + teksten bijcees website`.

De e-mail en de zichtbare menubalkbijlage zijn privacy-begrensd en met bronhashes vastgelegd in `docs/atlas/sources/bij-cees/EMAIL-SCOPE-2026-01-29.md`.

De bron noemt aangeleverde SEO-teksten en een menubalk, verwijdering van `Woonstore`, zwart en kraft (`#D5B59C`), verzendkosten als bewust open onderwerp en Klarna voor Bij Cees en AquaFlask.

De inhoud van de genoemde SEO-bijlage is niet aangeleverd. Alleen de bestandsnaam en de verwijzing in de e-mail zijn zichtbaar.

**Bewijsgrens:** deze bron bewijst oorspronkelijke scope, maar geen latere acceptatie.

### Actuele publieke webshop

Read-only gecontroleerd op 25 juli 2026:

- `https://www.bijcees.nl/`
- `https://www.bijcees.nl/product-categorie/keuken/pannen/`
- `https://www.bijcees.nl/onze-verkooppunten/`
- `https://www.bijcees.nl/product-categorie/koken-en-tafelen/`
- `https://www.bijcees.nl/product/cabanaz-tea-coffee-pot-theepot/`
- `https://www.bijcees.nl/winkelmand/`
- `https://www.bijcees.nl/afrekenen/`
- `https://aquaflask.nl/afrekenpagina/`

De winkelwagen- en checkoutcontroles gebruikten tijdelijk één product per webshop in geïsoleerde browsersessies. Er is geen bestelling geplaatst, betaling gestart of productie-instelling gewijzigd.

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

Binnen de onderzochte lokale bestanden was geen actuele scopebron gevonden. De later door Donovan aangeleverde e-mail van 29 januari 2026 vult dit scopegat gedeeltelijk. De eerdere zoekconclusie blijft daarmee een herleidbare onderzoeksstap, maar is niet langer de actuele eindconclusie.

## Scope per genoemd onderdeel

| Onderdeel | Oorspronkelijk gevraagd | Aantoonbaar live | Nog open | Bewijs voor acceptatie |
| --- | --- | --- | --- | --- |
| SEO-teksten | SEO-teksten per categorie en subcategorie zijn als DOCX aangeleverd. | De homepage bevat inhoudelijke SEO-tekst. In de gecontroleerde subcategorie Pannen was geen zichtbare categorie-intro of afsluitende SEO-tekst aanwezig. | De inhoud van de bijlage ontbreekt; volledige vergelijking is niet mogelijk. | Niet aanwezig. |
| Menubalk | De vijf hoofdgroepen en subcategorieën uit de PDF. | Alle vijf hoofdgroepen staan live. Woonstyling en Merken volgen de bron. Keuken heeft extra `Overige`; Tafelen gebruikt `Serveerplanken` en extra `Tafel accessoires`; Drinkflessen heeft extra `Tumbler`. | Vaststellen of deze afwijkingen bewust en geaccepteerd zijn. | Niet aanwezig. |
| Woonstore | `Woonstore` verwijderen bij verkooppunten. | `Woonstore` is niet zichtbaar op de live verkooppuntenpagina; Depot 7 en vijf Loods 5-vestigingen worden genoemd. | Alleen menselijke acceptatie ontbreekt. | Niet aanwezig. |
| Layoutkleuren | Zwart en kraft, kleurcode `#D5B59C`. | De live stylesheet gebruikt `#D5B59C` voor onder meer footer en productranden en zwart voor footerlinks. | De bron bevat geen schermspecifiek acceptatiecriterium voor de volledige layout. | Niet aanwezig. |
| Verzendkosten | Geen definitief verzoek; Cees en Isa dachten hier nog over na. | De live webshop communiceert gratis verzending vanaf €49,95 en 1–3 werkdagen levertijd. | Het definitieve besluit na de e-mail ontbreekt. | Niet aanwezig. |
| Klarna bij Bij Cees | Klarna toevoegen aan het betaalsysteem. | Klarna staat live als geselecteerde checkoutmethode. | De keten na `Plaats bestelling` en menselijke acceptatie zijn niet bewezen. | Niet aanwezig. |
| Klarna bij AquaFlask | Klarna ook aan AquaFlask toevoegen. | In de gecontroleerde checkout stonden iDEAL, kaart, overboeking en Bancontact; Klarna was niet zichtbaar. | Klarna staat hier op basis van de live controle nog open. | Niet aanwezig. |

## Aantoonbaar gerealiseerd

### Banners

De live homepage laadt nieuwe Gusta-, Puhlmann-, Cabanaz- en AquaFlask-banners. Voor Gusta bestaat ook een mobiele variant. De live bestandsnamen sluiten aan op de lokale implementatie-assets.

**Bewijsgrens:** zichtbaar en live is niet hetzelfde als door de ondernemer geaccepteerd of op iedere viewport inhoudelijk beoordeeld.

### Menu en categorie-indeling

Het live hoofdmenu toont de vijf gevraagde hoofdgroepen `Keuken`, `Tafelen`, `Woonstyling`, `Drinkflessen` en `Merken`. Woonstyling en Merken volgen de bron. Keuken heeft extra `Overige`; Tafelen gebruikt `Serveerplanken` in plaats van `Planken` en heeft extra `Tafel accessoires`; Drinkflessen heeft extra `Tumbler`.

**Bewijsgrens:** de huidige structuur is live, maar de aantoonbare afwijkingen zijn niet als geaccepteerde wijzigingen vastgelegd.

### Productpagina

De gecontroleerde Cabanaz-productpagina bevat:

- titel en prijs;
- acht productafbeeldingen;
- zeven kleurvarianten;
- beschrijving, aanvullende informatie en beoordelingen;
- een werkende winkelwagenhandeling.

**Bewijsgrens:** dit is één representatieve controle en bewijst niet dat iedere productpagina volledig of consistent is.

### Winkelwagen en checkout

Bij Cees kon een product aan de winkelwagen worden toegevoegd. De checkout toonde Klarna, iDEAL/Wero, kaart, Bancontact en PayPal. In de afzonderlijk gecontroleerde AquaFlask-checkout werden iDEAL, kaart, overboeking en Bancontact aangeboden; Klarna was daar niet zichtbaar.

**Bewijsgrens:** er is bewust geen bestelling geplaatst en geen betaling uitgevoerd. De technische en administratieve afhandeling na `Bestelling plaatsen` is dus niet bewezen.

### Filters

De categoriepagina toont categorieën, sortering, productaantallen en een prijsfilter. De YITH-filtercomponent is in de pagina-assets herkenbaar, maar tijdens de controle verscheen geen aantoonbare aanvullende attribuutfilter.

**Bewijsgrens:** filters worden in de e-mail van 29 januari 2026 niet genoemd. De herkomst en het acceptatiecriterium van de eerder genoemde filterverbetering blijven dus onbewezen.

## Formele afronding

De scope is nu per genoemd onderdeel herleidbaar. Op basis van de beschikbare bronnen kan echter geen afzonderlijk werkitem formeel als geaccepteerd `af` worden aangemerkt.

De implementatie is op meerdere onderdelen aantoonbaar live. Wat ontbreekt is een herleidbare verbinding tussen:

**oorspronkelijke klantvraag → acceptatiecriterium → actuele controle → menselijke acceptatie**

## Wat nog openstaat

1. De inhoud van de oorspronkelijke SEO-bijlage verkrijgen en per categorie en subcategorie vergelijken.
2. De live menuaanvullingen en het label `Serveerplanken` door Cees en Isa laten bevestigen of corrigeren.
3. Het definitieve verzendkostenbesluit na 29 januari 2026 herleiden.
4. Klarna bij AquaFlask toevoegen of herstellen en de checkout opnieuw controleren.
5. Menselijke acceptatie per scopeonderdeel vastleggen.
6. Checkout, betaling, orderbevestiging en verzending end-to-end laten valideren zonder ongecontroleerde productiehandeling.

## Blokkers voor oplevering

- De inhoud van de SEO-bijlage ontbreekt voor vergelijking.
- Klarna is bij AquaFlask niet live aangetroffen.
- De menuafwijkingen en het definitieve verzendkostenbesluit zijn niet door de opdrachtgever bevestigd.
- De volledige orderketen na checkout is niet veilig bewezen.
- Er is nog geen menselijke acceptatie van Cees of Isa op de actuele uitkomst vastgelegd.

De Engelse checkouttekst `Enter your address to view shipping options.` is live waargenomen. Zonder acceptatiegrens is dit een concrete frictie, maar nog niet zelfstandig een opleveringsblokker.

## Beslissende onzekerheden

- Zijn de live menuafwijkingen bewuste verbeteringen of onbedoelde afwijkingen?
- Welke aangeleverde SEO-tekst hoort op iedere categorie en subcategorie?
- Welk verzendkostenbesluit is na 29 januari 2026 genomen?
- Waarom is Klarna bij AquaFlask niet zichtbaar en is het eerder wel actief geweest?
- Welke onderdelen ervaren Cees en Isa zelf nog als onaf?

## Betrouwbare volgende terugkoppeling

Een begrensde voortgangsterugkoppeling kan **nu** worden gegeven:

> De oorspronkelijke scope is nu grotendeels herleidbaar. Woonstore is verwijderd, de gevraagde kleuren zijn toegepast en Klarna staat bij Bij Cees live. Voor afronding vergelijk ik eerst de aangeleverde SEO-teksten, laat ik de menuafwijkingen en verzendkosten bevestigen en herstel ik Klarna bij AquaFlask. Daarna leg ik de acceptatie per onderdeel vast voordat ik een einddatum of afronding bevestig.

Een betrouwbare opleverdatum kan op basis van de huidige bronnen nog niet worden genoemd. Die wordt pas verantwoord nadat de ontbrekende SEO-bron, AquaFlask-Klarna, menuafwijkingen, verzendkosten en acceptatie zijn opgelost of bevestigd.

## Betekenis voor Atlas

Dit onderzoek voegt nieuwe herleidbare werkelijkheid toe aan de bestaande Oriëntatie en activeert daarmee de vastgelegde terugkeertrigger.

Het reviewresultaat:

- maakt Bij Cees niet automatisch tot case;
- kent geen case-ID, CASE-SNAPSHOT, Focus- of Kompaspositie toe;
- neemt geen acceptatiebesluit namens Donovan of Cees;
- introduceert geen nieuwe methode;
- maakt de actuele leveringsgrens wel zichtbaar voor dagelijks gebruik.
