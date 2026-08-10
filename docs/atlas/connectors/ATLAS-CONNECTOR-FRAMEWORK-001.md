# Atlas Connector Framework 001
## Onderzoek en begrensde synchronisatieproef

**Datum:** 29 juli 2026  
**Status:** kandidaat gereed voor review  
**Proefbron:** WBD preview-sitemap  
**Workspace 002:** ongewijzigd  
**Productie:** ongewijzigd

> **Architectuurreview:** de beslissende review heeft vier kleine generieke
> contractcorrecties opgeleverd en is afgesloten met GO. De definitieve
> begrippen en bewijsgrenzen staan in
> `ATLAS-CONNECTOR-FRAMEWORK-001-ARCHITECTURE-REVIEW.md`. Waar dit eerste
> proefverslag nog spreekt over een genormaliseerde observatie, geldt vanaf de
> review het preciezere begrip **Record Change**; pas een geversioneerde
> Translator maakt daarvan een Atlas Observation Candidate.

## Executive summary

Atlas heeft nu een minimaal, leverancier-onafhankelijk connectorcontract en
een werkende end-to-end synchronisatieproef.

De voorkeursbron Google Analytics 4 is inhoudelijk passend, maar was niet de
veiligste uitvoerbare eerste proef. Voor de GA4 Data API zijn een Google
Cloud-project, een ingeschakelde API, een property-ID en expliciete
leesrechten nodig. Geen van deze configuraties is aantoonbaar aanwezig in de
repository of lokale uitvoeringsomgeving.

De proef gebruikt daarom de publieke WBD-preview-sitemap:

- extern maar read-only;
- klein en begrensd;
- privacyarm;
- zonder credentials;
- geschikt om snapshots, wijzigingen, verwijderingen en duplicatie te testen;
- relevant voor de bestaande WBD-context.

De proef bewijst geen analyticsintegratie. Zij bewijst het connectorcontract.

## Vastgestelde werkelijkheid

### Bevestigd

- Er bestond nog geen actief Atlas Connector Framework.
- De repository bevat geen GA4 property-ID, Google Cloud-projectconfiguratie,
  Application Default Credentials of service-accountconfiguratie.
- De lokale omgeving bevat geen relevante Google- of GA4-omgevingsvariabelen.
- Het bestand `Analytics@webuildanddesign.nl.txt` bevat geen API-configuratie,
  property-ID, service-account of private key.
- `gcloud` is lokaal niet geïnstalleerd.
- De preview-sitemap levert een begrensde XML-bron met dertien publieke WBD
  routes.
- De productie-sitemap levert op dit moment HTML en is daarom bewust niet als
  proefbron gebruikt.

### Architectuurkeuze

- De eerste proef gebruikt `snapshot_diff`.
- De lokale connectorstaat staat buiten Git in `.atlas-data/`.
- De connector bewaart bronrecords en Record Changes, maar maakt geen
  Atlas-inzicht.
- Een bronfout verwijdert de laatst bekende geldige staat niet.
- Contextscheiding wordt afgedwongen bij het laden en bewaren van staat.

### Hypothese

- GA4 is waarschijnlijk een waardevolle tweede connector zodra de
  autorisatie- en propertygrens expliciet is ingericht.
- Een dagelijkse GA4-sync met een overlappend venster is waarschijnlijk
  passender dan een cursor die een kalenderdag definitief afsluit.
- Een Workspace-bronstatus kan later waardevol zijn wanneer de bron echte
  besluitinformatie levert. De sitemapproef is daarvoor inhoudelijk nog te
  technisch.

## Waarom GA4 nog niet de proefbron is

De officiële GA4 Data API-quickstart vereist:

1. een Google Cloud-project;
2. de ingeschakelde Google Analytics Data API v1;
3. geldige gebruikers- of service-accountautorisatie;
4. toegang van die identiteit tot de Analytics-property;
5. de GA4 property-ID.

Google adviseert voor server-to-servergebruik een service account of passende
workloadidentiteit en waarschuwt dat losse service-accountkeys een
beveiligingsrisico vormen. De repository is daarom niet de plaats voor een
JSON-key of refresh token.

GA4-data is bovendien geen onveranderlijk eventlog. Standaardpropertydata kan
24–48 uur worden verwerkt en attributie voor key events kan nog tot twaalf
dagen veranderen. Een latere GA4-connector moet recente dagen dus opnieuw
bevragen en wijzigingen herkennen.

Officiële bronnen:

- [GA4 Data API quickstart](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart)
- [runReport](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport)
- [Data API-quota's](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas)
- [Data freshness](https://support.google.com/analytics/answer/11198161)
- [Reporting data expectations](https://developers.google.com/analytics/devguides/reporting/data/v1/reporting-data-expectations)
- [API error responses](https://developers.google.com/analytics/devguides/reporting/data/v1/errors)
- [Google Cloud-authenticatie](https://docs.cloud.google.com/docs/authentication)
- [Service-accountbest practices](https://docs.cloud.google.com/iam/docs/best-practices-service-accounts)

## Connectorcontract

### Identiteit en context

| Veld | Betekenis |
|---|---|
| `connectorId` | Stabiele identiteit van één connectorconfiguratie |
| `connectorType` | Leverancier- of brontype, zonder context te impliceren |
| `contextId` | Strikte Atlas-context waartoe de bronstaat behoort |
| `displayName` | Menselijke naam voor statusweergave |

De opslagkey bestaat uit `contextId + connectorId`. Een staat uit een andere
context wordt geweigerd.

### Autorisatie

| Veld | Mogelijke waarden |
|---|---|
| `authorizationMode` | `none`, `oauth2_user`, `service_account`, `application_default_credentials` |
| `authorizationStatus` | `not_required`, `not_configured`, `ready`, `expired`, `denied` |

Een connector leest zijn bron pas wanneer de status `ready` of
`not_required` is.

Secrets worden niet onderdeel van het contract, de staat, logs of
repository. Alleen de autorisatiestatus wordt bewaard.

### Synchronisatiestrategie

| Veld | Betekenis |
|---|---|
| `syncStrategy` | `snapshot_diff`, `incremental_cursor` of `overlapping_window` |
| `syncFrequency` | Handmatig, per uur, dagelijks of wekelijks |
| `checkpoint` | Opaque broncheckpoint; nooit zelfstandig bewijs van volledigheid |
| `lastSyncStartedAt` | Laatste poging |
| `lastSyncSucceededAt` | Laatste bewezen succesvolle synchronisatie |

Handmatig en gepland synchroniseren gebruiken dezelfde engine. Een scheduler
is bewust nog niet gebouwd.

### Actualiteit en gezondheid

| Veld | Betekenis |
|---|---|
| `sourceFreshness.status` | `fresh`, `stale` of `unknown` |
| `sourceFreshness.sourceObservedAt` | Laatst aantoonbare actualiteit van de bron |
| `healthStatus` | `never_synced`, `healthy`, `degraded`, `failed`, `authorization_required` |
| `errorStatus` | Code, veilige melding, tijdstip, retrybaarheid en aantal pogingen |

`lastSyncSucceededAt` zegt wanneer Atlas succesvol las.
`sourceObservedAt` zegt hoe actueel de bron zelf aantoonbaar is. Deze waarden
worden niet met elkaar verward.

### Bronrecords en observaties

#### Ruwe bronlaag

Ieder bronrecord bevat:

- `sourceKey`;
- `sourceUpdatedAt`, indien de bron dit levert;
- `rawReference`;
- brondata;
- een canonieke SHA-256-inhoudshash.

#### Genormaliseerde observatielaag

Alleen nieuwe, gewijzigde en verwijderde records maken een observatie:

- `changeType`: `new`, `changed` of `removed`;
- deterministische `observationId`;
- herkomst naar connector, context, bron en synchronisatierun;
- `evidenceStatus: source_reported`;
- `interpretationStatus: uninterpreted`.

Een verwijdering wordt als tombstone-observatie bewaard. Historie wordt niet
stilzwijgend gewist.

#### Atlas-interpretatie

Niet onderdeel van de connector.

Een bronrecord of wijziging is nog geen:

- inzicht;
- werkelijke vraag;
- aanbeveling;
- Focus;
- casefeit;
- automatische conclusie.

Menselijke beoordeling en de bestaande Atlas-bewijsgrenzen blijven vereist.

## Wijzigings- en duplicatielogica

1. Brondata wordt canoniek geserialiseerd.
2. Atlas berekent een SHA-256-hash per record.
3. De recordkey bepaalt identiteit.
4. De hash bepaalt of de inhoud gewijzigd is.
5. Een deterministische observatie-ID voorkomt dubbele observaties.
6. Records die uit een volledige snapshot verdwijnen krijgen één
   `removed`-observatie.
7. Een identieke volgende sync telt de records als `unchanged`.

## Fout- en retrybeleid

- tijdelijke netwerkfouten, HTTP 429 en 5xx zijn retrybaar;
- de retry gebruikt begrensde exponentiële backoff;
- `Retry-After` wordt binnen de maximale wachttijd gerespecteerd;
- ongeldige brondata, onverwachte origins en dubbele source keys zijn niet
  retrybaar;
- ontbrekende, verlopen of geweigerde autorisatie veroorzaakt geen
  bronrequest;
- na een fout blijft de laatst succesvolle bronstaat beschikbaar;
- gezondheid wordt dan `degraded` in plaats van dat bekende data verdwijnt.

Voor GA4 worden later de officiële foutcodes gevolgd:

- 401/403: autorisatie of rechten herstellen; niet blind herhalen;
- 429: quota/rate limit; begrensd terugkeren;
- 500/503: tijdelijk; exponentiële backoff met limiet.

## Synchronisatiefrequentie

### WBD preview-sitemap

- strategie: `snapshot_diff`;
- advies: dagelijks plus handmatig;
- freshness-grens proef: 36 uur;
- realtime heeft geen betekenisvolle meerwaarde.

### GA4 — nog niet geïmplementeerd

- strategiehypothese: `overlapping_window`;
- advies: één dagelijkse sync;
- recent venster opnieuw ophalen vanwege verwerkings- en attributiewijzigingen;
- realtime alleen later bij een aantoonbare operationele vraag;
- quota-informatie opvragen met `returnPropertyQuota: true`.

## End-to-end proef

### Proefconfiguratie

- connector: `wbd-preview-sitemap`;
- type: `sitemap`;
- context: `organization:wbd`;
- bron: `https://preview.webuildanddesign.nl/sitemap.xml`;
- autorisatie: `not_required`;
- lokale staat: `website/.atlas-data/connectors-v2/`;
- repository: uitgesloten via `.gitignore`.

### Resultaat

#### Eerste geldige synchronisatie

- gezondheid: `healthy`;
- opgehaald: 13;
- nieuw: 13;
- gewijzigd: 0;
- verwijderd: 0;
- ongewijzigd: 0;
- pogingen: 1;
- freshness: `fresh`.

#### Tweede geldige synchronisatie

- gezondheid: `healthy`;
- opgehaald: 13;
- nieuw: 0;
- gewijzigd: 0;
- verwijderd: 0;
- ongewijzigd: 13;
- observatietotaal bleef 13.

Daarmee is aangetoond dat een identieke synchronisatie geen dubbele
observaties maakt.

#### Foutpad

Een uitvoeringscontext zonder uitgaande netwerktoegang veroorzaakte een
zichtbare `NETWORK_ERROR`.

- na eerder succes bleef de laatst succesvolle sync bewaard;
- gezondheid werd `degraded`;
- bronrecords verdwenen niet;
- een volgende geldige netwerkmeting herstelde gezondheid naar `healthy`;
- de fout werd niet als broninhoud of Atlas-inzicht behandeld.

### Aanvullende verificatie

- connector- en regressietests: 72 van 72 geslaagd;
- productiebuild: geslaagd;
- publieke buildgrens: geslaagd;
- alle 13 observaties hebben `interpretationStatus: uninterpreted`;
- alle observaties behoren uitsluitend tot `organization:wbd`.

## Workspace-koppeling

Er is bewust geen Workspace-interface toegevoegd.

Reden:

- Workspace 002 is recent praktijkgevalideerd en blijft stabiel;
- de sitemapstatus is technisch bewijs, maar nog geen dagelijks
  ondernemerssignaal;
- een statuskaart zou de interface uitbreiden voordat de bron betekenis voor
  een beslissing heeft bewezen.

De connectorstaat bevat wel alle gegevens voor een latere rustige bronstatus:

- naam;
- verbinding;
- laatste succesvolle sync;
- freshness;
- aantallen;
- foutstatus;
- handmatige trigger.

Dit blijft een kandidaat, geen impliciete feature.

## Veiligheidsgrenzen

- geen secrets in code, staat, logs of Git;
- HTTPS verplicht voor de proefbron;
- redirects worden geweigerd;
- alleen expliciet toegestane record-origins;
- maximaal 1 MB en 500 sitemaprecords;
- atomische lokale state-overdracht;
- contextboundary wordt bij load en save gecontroleerd;
- laatst geldige data blijft bij fouten intact;
- geen automatische interpretatie;
- geen Workspace-, preview- of productiepublicatie.

## Bestanden

- `website/src/atlas-connectors.ts`
- `website/src/atlas-connector-wbd-sitemap.ts`
- `website/scripts/atlas-connector-file-store.mjs`
- `website/scripts/atlas-connector-sync.mjs`
- `website/tests/atlas-connectors.test.mjs`
- `website/.gitignore`
- `website/package.json`

## Gerichte menselijke GO voor GA4

Een echte GA4-proef vereist één afzonderlijke externe configuratie-GO:

> **GO om een bestaand of nieuw Google Cloud-project voor Atlas te selecteren,
> de Google Analytics Data API v1 in te schakelen, een uitsluitend-lezen
> identiteit toegang te geven tot de WBD GA4-property en project-ID plus
> property-ID uitsluitend via een lokale of beheerde runtimeconfiguratie
> beschikbaar te stellen. Geen credentials of private keys worden aan de
> repository toegevoegd.**

Voor die GO moet eerst worden gekozen waar geplande synchronisatie later
draait. Dat bepaalt of Application Default Credentials, een service account
zonder losse key of Workload Identity Federation de veiligste route is.

`gcloud` wordt niet geïnstalleerd en externe Google-configuratie wordt niet
gewijzigd binnen deze kandidaat.

## Aanbevolen kleine vervolgstap

**Eerst review van het connectorcontract en de bewijsgrens.**

Wanneer die GO krijgt:

1. bevestig de toekomstige runtime voor geplande sync;
2. verleen de gerichte Google-configuratie-GO;
3. implementeer één read-only GA4 `runReport` voor een klein dagrapport;
4. gebruik een overlappend venster;
5. toon nog geen Workspace-status totdat de gegevens een echte dagelijkse
   beslissing helpen.

## Atlas Reflection

### Waarneming

Een connector kan technisch succesvol zijn en toch nog geen waardevolle
Workspace-informatie opleveren. De sitemapproef bewijst de keten, niet de
betekenis.

### Begrip

Atlas heeft naast bronconnectiviteit vooral een harde scheiding nodig tussen
wat een bron meldt, wat daaruit genormaliseerd kan worden en wat pas na
menselijke beoordeling betekenis krijgt.

### Herbruikbare les

Actualiteit is tweedelig: wanneer Atlas voor het laatst succesvol las en hoe
actueel de bron zelf aantoonbaar is. Eén groen synchronisatie-icoon zou deze
twee werkelijkheden ten onrechte samenvatten.

### Bewijsgrens

Bewezen zijn snapshot-diff, deduplicatie, foutzichtbaarheid,
laatst-goed-behoud, herkomst en contextisolatie. Niet bewezen zijn GA4-auth,
periodieke uitvoering, analyticsbetekenis en Workspace-waarde.

### Onzekerheid

De toekomstige synchronisatieruntime en daardoor de veiligste
Google-autorisatievorm zijn nog niet gekozen.

### Terugkeertrigger

Heropen GA4 wanneer:

- de synchronisatieruntime is bevestigd;
- een Google Cloud-project en GA4-property-ID beschikbaar zijn;
- read-only toegang expliciet mag worden ingericht;
- minimaal één ondernemersvraag is benoemd die GA4-data helpt beantwoorden.

### Atlas Recommendation

**Geen Workspace-uitbreiding. Eerst contractreview; daarna hoogstens één
read-only GA4-proef na gerichte externe GO.**
