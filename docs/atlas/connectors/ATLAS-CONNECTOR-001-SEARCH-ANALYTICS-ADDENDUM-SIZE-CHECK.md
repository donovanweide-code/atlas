# Connector 001 addendum — minimale Search & Analytics foundation

**Datum:** 12 augustus 2026
**Besluit:** COST GUARDRAIL STOP
**Search Console:** BLOCKED
**Google Analytics 4:** BLOCKED

## Size-check conclusie

Search Console en GA4 kunnen niet als kleine hergebruikuitbreiding stil in
Connector 001 worden meegenomen. Samen vereisen zij nieuwe menselijke Google-
autorisatie, externe propertykeuzes en voor GA4 bovendien een nieuwe publieke
meetconfiguratie plus productie- en rechtmatigheidsvalidatie. Dat is een
substantiële uitbreiding van de eerdere Connector 001-raming.

Daarom zijn geen Google SDK, OAuth-flow, tokenopslag, GA4-tag, consentwijziging,
API-connector, dashboard of Workspace-UI gebouwd.

## Wat al bestaat

| Onderdeel | Werkelijke status |
|---|---|
| Generieke Atlas connectorengine | aanwezig en herbruikbaar: authstatus, overlapping-window-contract, retry, laatst-goed, provenance en contextisolatie |
| Search Console ontwerp | aanwezig als begrensd voorstel in `ATLAS-CONNECTOR-VALIDATION-002-PROPOSAL.md` |
| Search Console implementatie | niet aangetroffen |
| Google OAuth runtime/credentials | niet aangetroffen; geen relevante lokale env-configuratie |
| Google API SDK | niet aanwezig in `package.json` / lockfile |
| GA4 connector | niet aangetroffen |
| GA4 property-/datastream-/Measurement ID-config | niet aangetroffen |
| Publieke GA4-tag | niet aangetroffen in de actuele HTML of de actuele 82.156-byte JavaScript-bundle |
| Publieke dubbele meting | geen tagsignaal aangetroffen; daardoor ook geen actieve dubbele tag bewezen |

De publieke controle is een momentopname van 12 augustus 2026. Afwezigheid
van een tag bewijst niet dat er buiten de repository geen Google-account of
ongekoppelde property bestaat.

## Search Console — BLOCKED

### Bewezen

- Het bestaande ontwerp kiest terecht de minimale read-only scope
  `webmasters.readonly`.
- De generieke connectorengine kan later de window-, revision-, failure- en
  provenancegrenzen dragen.
- Een minimale performancequery kan `date + page` met `clicks + impressions`
  gebruiken, zonder querytekst of SEO-duiding.

### Menselijke blockers

1. Welke property werkelijk beschikbaar is:
   `sc-domain:webuildanddesign.nl` of een concrete URL-prefixproperty.
2. Welk Google-account daarop minimaal read access heeft.
3. Welk bestaand of toegestaan Google Cloud-project de API en OAuth-client
   draagt.
4. Welke veilige lokale/beheerde runtime een user OAuth-token mag bewaren.

Deze feiten kunnen niet uit publieke DNS, repositorycode of een anonieme API-
call worden afgeleid. De Search Console API vereist OAuth2 en propertyrechten.

### Kleinste werkende variant na autorisatie

1. Met uitsluitend `webmasters.readonly` één `sites.list` uitvoeren en de
   exacte WBD-property plus permission level vastleggen.
2. Eén kleine `searchAnalytics.query` over een vast recent venster uitvoeren,
   gegroepeerd op `date` en `page`, met `clicks` en `impressions`.
3. Property, requested period, source data state, response observed-at,
   sync-run en hashes via de bestaande connectorstaat bewaren.
4. Geen Workspace-output en geen SEO-interpretatie.

**Raming na menselijke configuratie:** 1,5–2,5 engineer-days. Externe
account-/Cloud-configuratie en eventuele wachttijd vallen daarbuiten.

## Google Analytics 4 — BLOCKED

### Bewezen

- De actuele publieke homepage bevat geen `gtag`, Google Tag Manager,
  `dataLayer`, GA4 Measurement ID of Google Analytics-script.
- De actuele publieke JavaScript-bundle bevat evenmin zo'n signaal.
- Repository en lokale runtime bevatten geen property-ID, datastream-ID,
  Measurement ID, Data API-client of Google-autorisatie.
- Daardoor is niet bewezen dat page views of sessions nu binnenkomen; er wordt
  geen startdatum voor betrouwbare analyticsdata verzonnen.

### Menselijke blockers

1. Bevestigen of er al een WBD GA4-property bestaat en wie beheerder is.
2. Bevestigen of een bestaande webdatastream voor exact
   `https://webuildanddesign.nl/` bestaat, of er één mag worden gemaakt.
3. De Measurement ID en productieroute gecontroleerd beschikbaar stellen.
4. Bevestigen welke bestaande rechtmatige/consentbasis tagging toelaat; dit
   addendum opent geen nieuwe consentarchitectuur.
5. Voor latere Atlas-read: een read-only identiteit en GA4 property-ID veilig
   beschikbaar stellen.

### Kleinste werkende variant na autorisatie

1. Bestaande property/datastream eerst inspecteren; niets dupliceren.
2. Alleen wanneer toegestaan exact één bestaande GA4 webtag in de publieke
   entrypoint opnemen, met standaard page-view/session measurement.
3. In browsernetwork en GA4 Realtime/DebugView één echte ontvangst bewijzen.
4. Configuratie, website/datastream, activatiemoment en verificatietijd
   vastleggen; betrouwbare data begint niet vóór dat bewezen activatiemoment.
5. Pas daarna eventueel één kleine Data API `runReport` via dezelfde Atlas-
   connectorgrenzen; geen dashboard, attribution, funnels of custom events.

**Raming na menselijke keuzes:** 2–4 engineer-days plus de noodzakelijke
periode om werkelijke ontvangst/verwerking te verifiëren. Een Data API-proef
kan extra Google-authconfiguratie vragen.

## Waarom STOP

De gecombineerde technische raming is circa **3,5–6,5 engineer-days**, nog
zonder externe autorisatie- of meetwachttijd. Dat is niet langer een minimale
toevoeging aan de eerder geraamde Connector 001 en raakt OAuth, publieke
tracking, productie en rechtmatigheid. De cost guardrail schrijft daarom een
stop vóór substantieel nieuw werk voor.

## Officiële contractreferenties

- Search Console `sites.list` en Search Analytics vereisen OAuth2 en passende
  propertyrechten; de minimale scope is `webmasters.readonly`.
- Search Analytics accepteert een property-identiteit als domain property of
  URL-prefix en ondersteunt een begrensde date/page-query.
- De GA4 Data API vereist een GA4 property-ID in de vorm
  `properties/GA_PROPERTY_ID`; dit vervangt geen webdatastream of actieve tag.

Referenties:

- https://developers.google.com/webmaster-tools/v1/prereqs
- https://developers.google.com/webmaster-tools/v1/sites/list
- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://developers.google.com/analytics/devguides/reporting/data/v1/property-id
- https://developers.google.com/analytics/devguides/reporting/data/v1/basics

## Eindstatus

- **Search Console: BLOCKED** — uitsluitend op property, menselijke read-only
  autorisatie en veilige OAuth-runtime.
- **Google Analytics 4: BLOCKED** — uitsluitend op property/datastream,
  meettoestemming, gecontroleerde productieconfiguratie en latere read-only
  identiteit.

Er is geen dashboard, groot framework, Workspace-uitbreiding, autonome
optimalisatie, andere organisatie of fictieve historische data toegevoegd.

**Addendum stopt hier.**
