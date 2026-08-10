# Atlas Connector Validation 002 — voorstel

**Datum:** 29 juli 2026  
**Status:** voorstel — nog geen uitvoerings-GO  
**Voorgestelde bron:** Google Search Console Performance  
**Scope:** uitsluitend read-only validatie van Connector Framework 001  
**Niet in scope:** Workspace, productiepublicatie, monitoring of interpretatie

## Besluitvoorstel

Gebruik voor de eerstvolgende praktijkvalidatie een zeer kleine read-only
Search Console Performance-koppeling voor We Build And Design.

De bronvraag is:

> Welke publieke pagina's van We Build And Design worden werkelijk via Google
> gevonden, en welke brondata is nog voorlopig?

Deze vraag heeft vandaag betekenis voor de organisatie, maar verplicht Atlas
niet om al SEO-advies, dashboards of automatische conclusies te bouwen.

## Waarom deze bron

Search Console levert de meeste architectuurwaarde per toegevoegde
complexiteit.

Met één begrensde API-route kan Framework 001 worden getoetst op grenzen die
de sitemapproef niet bewees:

- OAuth 2.0 met uitsluitend `webmasters.readonly`;
- een overlappend tijdvenster in plaats van een volledige snapshot;
- brondata die eerst voorlopig en later definitief kan zijn;
- inhoudelijke actualiteit die verschilt van synchronisatietijd;
- paginering met `rowLimit` en `startRow`;
- een bron die niet garandeert dat alle rijen worden teruggegeven;
- verschillende aggregatieniveaus;
- een brontijdzone die niet gelijk is aan de Atlas-runtime;
- dezelfde bronrij die bij een volgende sync inhoudelijk kan wijzigen.

De officiële Search Analytics API benoemt expliciet `final`, `all` en
`hourly_all`, geeft bij recente data een `first_incomplete_date` of
`first_incomplete_hour`, ondersteunt paginering en waarschuwt dat interne
limieten kunnen betekenen dat niet alle datarijen worden teruggegeven.

## Waarom niet eerst GA4

GA4 kan later eveneens waardevolle grenzen bewijzen, maar voegt voor deze
eerste praktijkvalidatie meer onzekerheid tegelijk toe:

- een bredere en privacygevoeliger gegevenswereld;
- complexere metric- en dimensiesemantiek;
- aanvullende quota- en propertykeuzes;
- een nog onbevestigde property- en runtimeconfiguratie;
- een groter risico dat de proef ongemerkt een analyticsproduct wordt.

Search Console bewijst vrijwel dezelfde fundamentele syncgrenzen met een
kleiner gegevensoppervlak en een directere relatie tot de publieke WBD-site.

## Waarom andere bronnen minder geschikt zijn

### GitHub

Read-only en goed herleidbaar, maar te voorspelbaar. Commitgeschiedenis
bewijst geen voorlopige brondata, overlappende vensters of veranderende
historische aggregaten.

### CSV of PDF

Te statisch. Deze bronnen bewijzen normalisatie, maar nauwelijks
autorisatie, bronhealth, actualiteit of veilige herhaalde synchronisatie.

### E-mail

Te breed en privacygevoelig voor een eerste contractvalidatie.

### WooCommerce, Ads of Meta

Te veel bedrijfs-, privacy- en platformcomplexiteit voordat de generieke
venster- en revisielogica is bewezen.

## Minimale validatiescope

### Eén property

Alleen de bestaande Search Console-property voor
`webuildanddesign.nl`.

De exacte property-identiteit moet vóór uitvoering worden bevestigd:

- `sc-domain:webuildanddesign.nl`; of
- de werkelijk bestaande URL-prefixproperty.

De connector mag dit niet aannemen of zelf een property aanmaken.

### Eén rapport

Search performance, gegroepeerd op:

- `date`;
- `page`.

Metrieken:

- clicks;
- impressions.

Bewust nog niet:

- querytekst;
- land;
- apparaat;
- CTR- of positie-interpretatie;
- Discover;
- Google News;
- URL Inspection.

Door de querydimensie niet op te halen blijft de eerste proef privacyarmer en
inhoudelijk kleiner.

### Eén overlappend venster

Bij iedere handmatige validatiesync:

- haal een klein, vast recent venster opnieuw op;
- markeer via de bronmetadata welke dagen nog onvolledig zijn;
- behandel een ontbrekende rij nooit automatisch als verwijdering;
- wijzig een bestaand record wanneer de bronwaarde voor dezelfde
  `date + page` verandert;
- bewaar de laatst geldige staat wanneer de bron of autorisatie faalt.

De exacte vensterlengte wordt pas bij uitvoering begrensd op basis van de
werkelijk beschikbare data. Het voorstel introduceert geen scheduler.

## Mapping op de canonieke lagen

### Connector

- controleert read-only autorisatie;
- leest de bevestigde Search Console-property;
- voert de begrensde Search Analytics-query uit;
- bewaart responsemetadata en pagineringsbewijs;
- doet geen inhoudelijke duiding.

### Normalizer

- maakt een stabiele recordidentiteit uit `property + date + canonical page`;
- normaliseert de brontijdzone expliciet;
- bewaart clicks en impressions zonder betekenisclaim;
- markeert de bronstatus als voorlopig of definitief;
- legt normalizer- en schemaversie vast.

### Record Change

- `new`: eerste geldige waarneming van de dag-paginacombinatie;
- `changed`: dezelfde combinatie krijgt nieuwe bronwaarden of status;
- geen `removed` op basis van afwezigheid in een top-rowsrespons of
  overlappend venster.

### Translator

De eerste proef gebruikt hoogstens één neutrale vertaling:

> Voor pagina X rapporteert Search Console op datum Y de volgende
> bronwaarden; de gegevensstatus is voorlopig of definitief.

Geen kans, probleem, verklaring of aanbeveling.

### Observation

Een observation candidate blijft:

- bron-gerapporteerd;
- volledig herleidbaar;
- niet geïnterpreteerd;
- buiten de Workspace.

### Interpretation

Niet bouwen binnen Validation 002.

Vragen zoals “deze pagina verdient aandacht” of “de content werkt niet”
vereisen aanvullende context en menselijke beoordeling.

## Contractgrenzen die deze proef moet bewijzen

| Grens | Vereist bewijs |
|---|---|
| Read-only autorisatie | Alleen de minimale Search Console-scope is actief |
| Overlapping window | Dezelfde dagen worden veilig opnieuw opgehaald |
| Provisional/final | Bronmetadata blijft zichtbaar en wijzigingen worden niet als fouten behandeld |
| Idempotentie | Dezelfde response en translatorversie leveren geen duplicaten |
| Revisie | Gewijzigde waarden voor dezelfde recordidentiteit maken één nieuwe lineage-stap |
| Afwezigheid | Niet teruggegeven is nooit automatisch verwijderd |
| Paginering | Iedere pagina is aantoonbaar opgehaald of de batch is expliciet incompleet |
| Actualiteit | Sync-tijd, rapportdatum en bronstatus blijven afzonderlijk |
| Provenance | Property, requestvenster, run, raw hash en schema-/translatorversies zijn herleidbaar |
| Foutgrens | 401/403, 429, 5xx en gedeeltelijke runs behouden laatst geldige staat |

## Voorwaarden vóór een uitvoerings-GO

Alle onderstaande feiten moeten eerst aantoonbaar worden bevestigd:

1. Er bestaat een Search Console-property voor WBD.
2. Donovan heeft toegang tot die property.
3. Een Google Cloud-project en Search Console API zijn beschikbaar of mogen
   voor deze proef worden ingericht.
4. Er is een veilige runtime voor OAuth 2.0 zonder credentials in Git.
5. De read-only scope is voldoende.
6. De eerste response bevat genoeg echte data om minimaal revisie,
   actualiteit of incompleetheid te kunnen beoordelen.

Wanneer punt 6 niet wordt gehaald, is dat geen technisch falen. Dan is Search
Console op dit moment onvoldoende bewijsrijk en wordt geen kunstmatige
dataset geconstrueerd.

## Stopvoorwaarden

Stop zonder implementatie-uitbreiding wanneer:

- de property niet bestaat of niet toegankelijk is;
- alleen bredere schrijfrechten beschikbaar zijn;
- credentials in de repository zouden moeten worden geplaatst;
- de API-respons geen betrouwbare herkomst of datastatus levert;
- uitvoering een Workspace-, scheduler- of productieaanpassing vereist;
- de proef alleen met fictieve data betekenisvol gemaakt kan worden.

## Verwachte oplevering van de latere uitvoering

Indien afzonderlijk goedgekeurd:

- één Search Console Connector;
- één Search Console Normalizer;
- maximaal één neutrale Translator;
- lokale, genegeerde validatiestaat;
- contract- en regressietests;
- één handmatige read-only synchronisatieproef;
- een bewijsrapport per hierboven genoemde contractgrens;
- geen Workspace- of productiepublicatie.

## Kleinste betekenisvolle volgende handeling

Voer nog geen connectorcode uit.

Bevestig uitsluitend:

1. de exacte Search Console-property;
2. dat read-only toegang bestaat;
3. welke veilige lokale of beheerde runtime de OAuth-token mag dragen.

Daarna kan voor precies deze begrensde validatie een afzonderlijke
uitvoerings-GO worden gegeven.

## Officiële bronnen

- [Search Analytics query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
- [Search Console API autorisatie](https://developers.google.com/webmaster-tools/v1/how-tos/authorizing)
- [Search Console-data en beperkingen](https://support.google.com/webmasters/answer/96568)
- [Performance-data: actualiteit en voorlopige data](https://support.google.com/webmasters/answer/17011364)

## Atlas Recommendation

**GO voor Search Console als voorstel voor Validation 002.**

Nog geen uitvoerings-GO. Eerst alleen de drie externe feiten bevestigen:
property, read-only toegang en veilige OAuth-runtime.
