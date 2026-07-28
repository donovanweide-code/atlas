# Production Release Preparation 001

**Status:** kandidaat gereed voor expliciete Production GO

**Canonieke broncommit:** `a0bd3641bafe83587cf210212f2a1e5f0160632a`

**Remote branch:** `origin/codex/production-hardening-006`

**Artefact:** `website/.codex-tmp/release-preparation-001-a0bd364/wbd-a0bd364-production.zip`

**Artefact SHA-256:** `B30E9FEB6D136AD1FBBCEC4EA7A68812A90001823FE6939EE35A48ACBC7936D4`

**Artefactomvang:** 2.149.248 bytes

**Productie- of previewdeployment:** niet uitgevoerd

## Samenvatting

De actuele reviewbranch is als nieuwe Production Candidate voorbereid volgens
Production Validation Hardening 001. De bron is geïsoleerd uit commit
`a0bd364`, buiten de bestaande ongerelateerde worktreewijzigingen gebouwd en
als onveranderlijk ZIP-artefact vastgelegd.

Tijdens de eerste werkelijke HTTPS-preflight werd een fout in de nieuwe
capturelaag aangetoond: Node kon de respons-socket na het uitlezen van de body
al hebben losgekoppeld. De probe stopte daardoor vóór classificatie. Dit was
geen productie- of netwerkstoring. De socketreferentie wordt nu bij ontvangst
vastgelegd.

Een tweede concrete beperking werd eveneens opgelost. De validator kon twee
route-identiteiten vergelijken, maar nog niet afdwingen via welke IP-familie
een capture liep. De capture ondersteunt daarom nu expliciet `--family 4` en
`--family 6`. Daarmee zijn de twee preflightroutes aantoonbaar en
reproduceerbaar van elkaar te onderscheiden.

Er zijn geen Experience-, juridische, hosting- of contentwijzigingen
doorgevoerd. De publieke buildbestanden zijn bytegelijk aan de eerder
goedgekeurde kandidaat `e6aedab`.

## Repository en bron

- lokale broncommit:
  `a0bd3641bafe83587cf210212f2a1e5f0160632a`;
- remote broncommit op de reviewbranch: gelijk aan de lokale broncommit;
- alleen de bewezen HTTPS-probefix, expliciete netwerkroutekeuze en bijbehorende
  test zijn toegevoegd sinds Production Validation Hardening 001;
- bestaande Workspace-, design- en Atlas-wijzigingen zijn niet opgenomen,
  niet teruggedraaid en niet aangepast;
- de kandidaat is opgebouwd met `git archive` uit uitsluitend de canonieke
  broncommit en de bijbehorende Case 0001-testfixture.

## Build- en testresultaten

| Controle | Resultaat |
|---|---|
| Geïsoleerde testsuite | 59 van 59 geslaagd |
| TypeScript | geslaagd |
| Vite-productiebuild | geslaagd |
| Public-only verificatie | 29 bestanden; 9 tekstbestanden gecontroleerd |
| Dependency-audit | 0 bekende kwetsbaarheden |
| Vergelijking met publieke kandidaat `e6aedab` | 0 bestandsverschillen |

De actieve publieke bundels in het artefact zijn:

- `assets/index-DX1T5CEV.js`;
- `assets/index-DWjRSiTi.css`.

Het volledige bestandsmanifest staat in
`WBD-2026-07-28-a0bd364.manifest.json`.

## Artefactbewijs

| Onderdeel | Waarde |
|---|---|
| ZIP | `wbd-a0bd364-production.zip` |
| Bestanden | 29 |
| Bytes | 2.149.248 |
| SHA-256 | `B30E9FEB6D136AD1FBBCEC4EA7A68812A90001823FE6939EE35A48ACBC7936D4` |
| Distmanifest SHA-256 | `02D9694E2EEA2E07F181251E445B56BAB5B92381BF2C84C3306AA347FF1423DD` |
| Vastgelegd repositoriymanifest SHA-256 | `9310B58FE5A547098C63FCC4F2A962273E479973D724A3A771BF2ABB2B5FE698` |

Het verschil tussen de twee manifesthashes is uitsluitend JSON-opmaak. De 29
paden, bestandsgroottes en bestandshashes zijn inhoudelijk exact gelijk.

## Preflightconfiguratie

Het releasegebonden validatieprofiel staat in
`WBD-2026-07-28-a0bd364.validation.json`.

Profiel SHA-256:

`DEDF3F8441A1517A1A9C9C318274DC1FC63DD10472A0C7FB9780C108FC8D0D27`

De configuratie vereist:

- vier pogingen per endpoint;
- een observatievenster van minimaal vijftien seconden;
- twee opeenvolgende geldige meetpunten;
- twee onafhankelijke route-identiteiten;
- productie als target;
- preview als controlehost;
- status, canonieke bundels en preview-`noindex` als controleasserties.

## Preflightbewijs

### Route 1 — IPv4

| Onderdeel | Bewijs |
|---|---|
| Bron | `codex-host-ipv4` |
| Route | `transip-ipv4` |
| Adresfamilie | IPv4 |
| Productie-IP | `85.10.159.158` |
| Preview-IP | `85.10.159.158` |
| TLS | TLS 1.3 |
| Productie | 4 van 4 HTTP 200 |
| Preview | 4 van 4 HTTP 200 |
| Previewasserties | 0 fouten |
| Observatievenster | 15,282 seconden |

Ruw rapport:

`website/.codex-tmp/release-preparation-001-a0bd364/preflight-ipv4.json`

SHA-256:

`08C3CA57A1022AFB13C93D362818BB0D6732AAE8C7FAEA655B8F0F106BF2F21C`

### Route 2 — IPv6

| Onderdeel | Bewijs |
|---|---|
| Bron | `codex-host-ipv6` |
| Route | `transip-ipv6` |
| Adresfamilie | IPv6 |
| Productie-IP | `2a01:7c8:f0:10e2::8c42:d0a3` |
| Preview-IP | `2a01:7c8:f0:10e2::8c42:d0a3` |
| TLS | TLS 1.3 |
| Productie | 4 van 4 HTTP 200 |
| Preview | 4 van 4 HTTP 200 |
| Previewasserties | 0 fouten |
| Observatievenster | 15,226 seconden |

Ruw rapport:

`website/.codex-tmp/release-preparation-001-a0bd364/preflight-ipv6.json`

SHA-256:

`7288937C56CE37A254065801E9D6EA5EE9825C01D69CA32D4EE5DE88E48814F2`

### Classificatie

De hardeningvalidator classificeert het gecombineerde bewijs als:

| Veld | Resultaat |
|---|---|
| Classificatie | `Pass` |
| Geldige onafhankelijke routes | 2 |
| Vereiste routes | 2 |
| Dubbele routes | geen |
| Releasebesluit | `switch-eligible` |
| Rollbackadvies | nee |

Het vastgelegde besluit staat in
`WBD-2026-07-28-a0bd364.preflight-decision.json`.

## Bewijsgrens van de tweede route

De ingebouwde browserroute kon productie openen, maar de bestaande
browserbeveiligingsregel blokkeerde het openen van preview als controlehost.
Deze regel is niet omzeild en de browsermeting is niet als geldig
preflightbewijs gebruikt.

De twee geldige routes zijn daarom expliciet geforceerde IPv4- en IPv6-paden.
Zij gebruiken verschillende DNS-records, remote IP-adressen en netwerkstacks,
maar delen dezelfde host- en runneromgeving. Dit voldoet aan het huidige
route-identiteitsmodel van de validator. Een tweede externe runner blijft
sterker bewijs en is een verbetering voor een volgende release wanneer die
zonder externe wijziging beschikbaar is.

Deze grens is transparant en maakt de huidige classificatie niet ongeldig. Zij
blijft wel een resterend operationeel risico.

## Rollbackcriteria

De nieuwe classificatiegrens is bindend:

| Uitkomst | Actie vóór switch | Actie na switch |
|---|---|---|
| `Pass` | switch toegestaan | release accepteren |
| `Probe invalid` | stoppen; probe herstellen | stoppen; geen automatische rollback |
| `Validation failed` | stoppen; bewijs onderzoeken | stoppen; geen automatische rollback |
| `Production failed` | stoppen | rollback |

Rollback mag na een productieomschakeling uitsluitend plaatsvinden wanneer:

- minstens twee onafhankelijke, geldige routes dezelfde kritieke fout
  bevestigen;
- iedere gebruikte route de controlehost zelf geldig meet;
- het bewijs nog binnen de geldigheidstermijn valt;
- de rapporten hetzelfde validatieprofiel gebruiken.

De eerder bewezen rollbackgrens
`/sites/wbd-20260726-ca3d1bd` moet direct vóór een toekomstige
DocumentRoot-switch opnieuw read-only worden bevestigd. Deze voorbereiding
heeft de hostingconfiguratie niet geopend of gewijzigd.

## Release Readiness

### Is de release technisch gereed?

**Ja.** De canonieke bron is gepusht, reproduceerbaar gebouwd en als
checksumgebonden artefact vastgelegd.

### Zijn alle validaties geslaagd?

**Ja, voor de huidige voorbereidingsfase.** Tests, build, public-only controle,
audit en preflight zijn geslaagd. Post-switchvalidatie is niet uitgevoerd,
omdat er conform scope geen preview- of productiedeployment plaatsvond.

### Zijn er resterende risico's?

Ja:

- IPv4 en IPv6 delen dezelfde runneromgeving;
- de rollbackmap moet vlak vóór publicatie opnieuw worden bevestigd;
- preflightbewijs verloopt en moet onmiddellijk vóór de switch opnieuw worden
  gemaakt;
- TransIP-switchconvergentie is nog niet via een niet-productietest
  gekwantificeerd;
- post-switchbewijs bestaat pas na een expliciet goedgekeurde publicatie.

Geen van deze risico's rechtvaardigt een wijziging aan Experience of artefact.

### Advies

**Production GO aanbevolen voor een strikt gecontroleerde publicatie van
uitsluitend artefact `wbd-a0bd364-production.zip`.**

Dit document is geen Production GO en geeft geen toestemming om hosting,
preview of productie te wijzigen.

Bij een toekomstig expliciet GO zijn vóór de switch verplicht:

1. artefact-SHA-256 opnieuw controleren;
2. rollbackmap read-only bevestigen;
3. nieuwe IPv4- en IPv6-preflightrapporten maken;
4. uitsluitend doorgaan bij classificatie `Pass`.

Na de switch zijn nieuwe post-switchrapporten verplicht. Alleen
`Production failed` mag dan rollback activeren.

## Atlas Reflection

### Waarneming

De eerste toepassing van de hardening vond twee zwakke plekken in de
validatietooling voordat een releasebesluit werd genomen: een vluchtige
HTTPS-socketreferentie en een niet-afdwingbare netwerkroute.

### Begrip

Een validatiemodel wordt pas betrouwbaar wanneer het werkelijk wordt gebruikt.
Unit-tests bewezen de beslislogica, maar de eerste externe capture bewees welke
runtimegrens nog ontbrak.

### Herbruikbare les

Maak routekeuze en meetcontext onderdeel van het bewijs. Een label
`onafhankelijk` is onvoldoende wanneer de onderliggende netwerkroute niet
expliciet is vastgelegd.

### Bewijsgrens

IPv4 en IPv6 zijn afzonderlijke netwerkpaden, maar geen afzonderlijke machines
of organisaties. De browsercontrole kon door de bestaande beveiligingsregel
niet als volledige tweede route worden gebruikt.

### Onzekerheid

De werkelijke TransIP-convergentietijd en het gedrag van de nieuwe release na
een DocumentRoot-switch blijven onbewezen totdat een nieuwe, expliciet
goedgekeurde publicatie plaatsvindt.

### Terugkeertrigger

Heropen de hardening wanneer een externe tweede runner beschikbaar komt, de
IPv4- en IPv6-routes strijdig bewijs geven of een post-switchmeting niet binnen
het huidige observatievenster convergeert.

### Atlas Recommendation

Beoordeel deze kandidaat voor een expliciete Production GO. Publiceer niets
zonder dat besluit en herhaal de volledige preflight direct vóór iedere
toekomstige switch.
