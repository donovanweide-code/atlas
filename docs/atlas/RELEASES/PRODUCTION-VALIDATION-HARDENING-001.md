# Production Validation Hardening 001

**Datum:** 28 juli 2026

**Status:** kandidaat voor review

**Productiepublicatie:** niet uitgevoerd

## Voorstel

De releasebeslissing wordt voortaan niet meer rechtstreeks afgeleid uit één
`curl`-uitkomst. De validatie bestaat uit drie afzonderlijke stappen:

1. **Capture** — een runner legt DNS, transport, TLS, HTTP en
   artefactasserties afzonderlijk vast.
2. **Routevalidatie** — dezelfde runner moet gelijktijdig de productiehost en
   een bekende controlehost kunnen meten. Een falende controlehost maakt de
   meetroute ongeldig.
3. **Beslissing** — minstens twee verschillende netwerkroute-identiteiten
   moeten overeenstemmend bewijs leveren voordat de release wordt geaccepteerd
   of rollback wordt geadviseerd.

De validator kent vier uitkomsten:

| Uitkomst | Betekenis | Releaseactie | Rollback |
|---|---|---|---|
| `Pass` | Onafhankelijke routes bevestigen dezelfde geldige release | preflight: switch toegestaan; post-switch: accepteren | nee |
| `Probe invalid` | De meetomgeving, actualiteit, observatieduur of onafhankelijkheid is onvoldoende | stoppen en meetroute herstellen | nee |
| `Validation failed` | Geldige meetroutes spreken elkaar tegen of bewijzen de kandidaat niet eenduidig | stoppen en aanvullend bewijs verzamelen | nee |
| `Production failed` | Minstens twee onafhankelijke geldige routes bevestigen een kritieke fout | preflight: stoppen; post-switch: rollback | alleen post-switch |

## Bewijsmodel

Ieder meetrapport bevat:

- bron- en netwerkroute-identiteit;
- SHA-256 van het volledige validatieprofiel;
- begin- en eindtijd;
- DNS-resultaat en resolved IP-adressen;
- transportstatus en remote endpoint;
- TLS-autorisatie en protocol;
- HTTP-status, headers en responstijd;
- bodygrootte en SHA-256;
- expliciete releaseasserties, zoals bundelnamen, indexeerbaarheid en status.

Een body- of bundelmismatch kan alleen worden beoordeeld wanneer daadwerkelijk
een HTTP-response is ontvangen. Een transportfout kan daardoor niet langer
onbedoeld als inhoudelijke mismatch worden behandeld.

De evaluator weigert rapporten die niet exact met hetzelfde validatieprofiel
zijn gemaakt. Daardoor kunnen twee op zichzelf geldige probes met verschillende
bundelverwachtingen niet samen een releasebesluit vormen. Een oningevulde
`REPLACE`-waarde wordt al vóór de eerste netwerkprobe afgewezen.

## Preflight

Voor de DocumentRoot-switch worden vanuit twee werkelijk verschillende
netwerkroutes nieuwe rapporten gemaakt voor:

- `https://webuildanddesign.nl/`;
- `https://preview.webuildanddesign.nl/` als controlehost.

De switch is alleen toegestaan bij `Pass`. Iedere andere uitkomst stopt de
release vóór een mutatie. De voorbeeldconfiguratie vereist vier pogingen over
minstens vijftien seconden en twee opeenvolgende geldige meetpunten.

## Post-switch

Na de switch worden nieuwe rapporten gemaakt. De targetasserties controleren
de canonieke JS- en CSS-bundels en de afwezigheid van productie-`noindex`.
De controlehost blijft gelijktijdig onderdeel van ieder rapport.

Rollback is alleen toegestaan wanneer de evaluator `Production failed`
classificeert. Eén falende route, strijdige resultaten of een ongeldige
controlehost leiden tot stoppen zonder automatische rollback.

## Uitvoering

Maak voor iedere release een kopie van
`website/release-validation.example.json` en vul daarin de werkelijk
vastgelegde bundelnamen en eventuele checksums in.

Per onafhankelijke runner:

```text
npm run validate:release -- capture --config <config.json> --phase preflight --source <runner-id> --route <netwerkroute-id> --output <rapport.json>
```

Beoordeel daarna gezamenlijk:

```text
npm run validate:release -- evaluate --config <config.json> --phase preflight --report <rapport-a.json> --report <rapport-b.json> --output <besluit.json>
```

Na een toegestane switch worden `capture` en `evaluate` herhaald met
`--phase post-switch`.

De exitcodes zijn bedoeld voor een gecontroleerde pipeline:

- `0` — `Pass`;
- `20` — `Probe invalid`;
- `30` — `Validation failed`;
- `40` — `Production failed`;
- `2` — ongeldige CLI-invoer of configuratie.

Geen van deze scripts wijzigt hosting, DocumentRoot, preview of productie.

## Bewijsgrenzen

- Een opgegeven `routeId` is operatorbewijs; het script kan niet zelfstandig
  bewijzen dat twee runners fysiek verschillende netwerkpaden gebruiken.
- De validator kan TransIP-switchconvergentie meten, maar de vereiste
  observatieduur blijft een expliciet releasebesluit.
- Serverlogs zijn geen voorwaarde voor classificatie wanneer twee
  onafhankelijke routes overeenstemmend bewijs leveren; zij blijven wel
  waardevol incidentbewijs.
- Deze kandidaat voert geen deployment uit en verandert geen rollbackmap.

## Reviewpunten

1. Is de grens tussen een ongeldige probe en een productiefout scherp genoeg?
2. Is twee onafhankelijke, gevalideerde routes een passende minimumgrens?
3. Is de standaard van vier pogingen over vijftien seconden voldoende voor een
   gecontroleerde TransIP-test, of moet dit na niet-productieonderzoek worden
   verruimd?
4. Is het terecht dat strijdig bewijs altijd stopt zonder automatische
   rollback?
5. Zijn de releaseasserties per kandidaat concreet genoeg vast te leggen?

## Atlas Reflection

### Waarneming

De vorige releaseprocedure kon één transportfout rechtstreeks vertalen naar
een productiebesluit. De inhoudelijke checks waren goed, maar de meetroute zelf
was niet vooraf gekwalificeerd.

### Begrip

Een healthcheck is geen bewijs zolang niet duidelijk is dat de meetomgeving
gezond is. Releasevalidatie moet daarom eerst de waarnemer valideren en pas
daarna de productie.

### Herbruikbare les

Scheiding van meten, interpreteren en handelen voorkomt dat een technisch
signaal meer betekenis krijgt dan het bewijs rechtvaardigt.

### Bewijsgrens

De code kan route-identiteiten afdwingen en resultaten vergelijken, maar niet
bewijzen dat twee door een operator benoemde routes werkelijk onafhankelijk
zijn.

### Onzekerheid

De werkelijke convergentietijd van een TransIP-DocumentRoot-switch is nog niet
met een gecontroleerde niet-productietest vastgesteld.

### Terugkeertrigger

Herbeoordeel de observatieduur na aantoonbaar TransIP-bewijs of zodra een
preflight/post-switch-validatie legitieme convergentie als fout classificeert.

### Atlas Recommendation

Eerst deze Production Hardening-kandidaat reviewen. Daarna pas beslissen of een
afzonderlijke, niet-productieve validatie van twee onafhankelijke runners en de
TransIP-convergentietijd nodig is. Geen nieuwe productiepublicatie starten.
