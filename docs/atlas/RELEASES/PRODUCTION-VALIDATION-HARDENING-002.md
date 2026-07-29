# Release Validation Hardening 002

**Datum:** 28 juli 2026
**Status:** geïmplementeerde kandidaat
**Publicatie:** niet uitgevoerd
**DocumentRoot-switch:** niet uitgevoerd

## Doel

Hardening 002 maakt de uitvoeringscontext onderdeel van het releasebewijs. Een
netwerkmeting is voortaan alleen geldig wanneer vooraf vaststaat welke
goedgekeurde runner en welke netwerkcontext de meting uitvoeren.

De veiligheidsregel blijft ongewijzigd:

> `Probe invalid` betekent stoppen.

Deze wijziging voorkomt dat een lokale runner zonder socketbevoegdheid wordt
geïnterpreteerd als een onbereikbare controlehost of falende productieomgeving.

## Wijzigingen

### Expliciet bewijscontract

Het validatieprofiel bevat een allowlist van netwerkgeschikte
runnercontexten. Iedere runner vermeldt de netwerkcontexten die hij mag
meten. `capture` vereist daarom voortaan:

```text
--runner-context <id> --network-context <id>
```

Een onbekende combinatie wordt vóór de eerste netwerkrequest geweigerd. Het
rapport blijft bewaard als ongeldig bewijs, met
`RUNNER_CONTEXT_NOT_APPROVED` als reden.

### Lokale permissiefouten

`EACCES` en `EPERM` worden expliciet vastgelegd als:

```text
local-runner-not-authorized
```

Dit is een fout in de lokale uitvoeringscontext. Het is geen uitspraak over
DNS, de controlehost, preview of productie.

### Eén begrensde herhaalmeting

Wanneer een goedgekeurde runner tijdens een meetronde `EACCES` of `EPERM`
registreert, voert de capture precies één volledige herhaalmeting uit.

- slaagt de herhaalmeting, dan wordt de eerste lokale false negative niet
  gebruikt en gaat uitsluitend de nieuwe meetronde naar de evaluator;
- blijft de permissiefout bestaan, dan krijgt het rapport expliciet
  `local-runner-not-authorized` en blijft het ongeldig bewijs;
- er is geen derde poging en geen degradatie naar minder meetroutes.

De validator kan niet zelf een proces naar een andere beveiligingsgrens
verplaatsen. De releaseprocedure moet `capture` daarom starten vanuit de
vooraf goedgekeurde netwerkgeschikte runner. Een beperkte runner mag zich niet
als die context voordoen en levert nooit geldig bewijs.

### Onafhankelijkheid

De evaluator vereist nog steeds minimaal twee geldige metingen. Hardening 002
controleert daarbij zowel:

- een unieke `routeId`;
- een unieke `networkContext`.

Twee rapporten met verschillende namen maar dezelfde netwerkcontext tellen
niet als onafhankelijk bewijs.

### Rapportage

Rapportschema 2 bevat per meting:

- runnercontext;
- netwerkcontext;
- goedkeuringsstatus en netwerkgeschiktheid;
- status van de lokale permissieherhaling;
- expliciete reden en code van eventuele probe-uitval;
- de bestaande DNS-, transport-, TLS-, HTTP- en artefactbewijzen.

Rapporten uit het oude schema of uit een ander validatieprofiel worden
geweigerd.

## Gebruik

IPv4:

```text
npm run validate:release -- capture --config <config.json> --phase preflight --source <bron-id> --route <route-id> --runner-context <goedgekeurde-runner> --network-context <ipv4-context> --family 4 --output <ipv4.json>
```

IPv6:

```text
npm run validate:release -- capture --config <config.json> --phase preflight --source <bron-id> --route <route-id> --runner-context <goedgekeurde-runner> --network-context <ipv6-context> --family 6 --output <ipv6.json>
```

Evaluatie:

```text
npm run validate:release -- evaluate --config <config.json> --phase preflight --report <ipv4.json> --report <ipv6.json> --output <besluit.json>
```

## Post-switch: propagatiebewuste activatie

De directe evaluator is uitsluitend nog voor preflight beschikbaar.
Post-switchvalidatie loopt via één activatiesessie:

```text
npm run validate:release -- activate --config <config.json> --switch-requested-at <ISO-8601> --output <activatierapport.json>
```

Het vaste `switchRequestedAt` voorkomt dat het propagatievenster bij iedere
meetronde opnieuw begint. TransIP heeft aangegeven dat de backendwijziging
achter de nginx-proxy circa vijftien minuten kan vragen. Het huidige profiel
gebruikt twintig minuten als configureerbare veiligheidsmarge en meet eenmaal
per minuut.

Het profiel legt expliciet vast:

- de vorige productie-identiteit;
- de kandidaat-identiteit;
- de release-onafhankelijke kritieke gezondheidsasserties;
- minimaal twee onafhankelijke netwerkcontexten;
- minimaal drie opeenvolgende stabiele kandidaatrondes.

Een gezonde vorige release heet tijdens het budget `Propagation pending`; een
gezonde oude/nieuwe mix heet `Propagation converging`; een overal zichtbare
kandidaat heet eerst `Candidate stabilizing`. Alleen na voldoende stabiele
rondes volgt `Pass`.

Wanneer na het budget nog uitsluitend de gezonde vorige release of een gezonde
mix zichtbaar is, volgt `Activation timeout` met
`restore-previous-root`. Dit is herstel van een niet-afgeronde activatie en
geen bewijs van `Production failed`. Rollback blijft uitsluitend gerechtvaardigd
bij meervoudig bevestigd hard productiefalen.

## Veiligheidsgrens

Niet gewijzigd:

- minimaal twee onafhankelijke geldige netwerkmetingen;
- classificaties en exitcodes;
- rollbackcriteria;
- DocumentRoot-procedure;
- releasebeslissing;
- verbod op deployment vanuit deze hardening.

Een `Probe invalid` wordt nooit `Pass`, `Validation failed` of
`Production failed` op basis van een lokale permissiefout. Rollback blijft
alleen mogelijk wanneer minstens twee onafhankelijke geldige routes een
kritieke productiefout bevestigen tijdens `post-switch`.

Een directe aanroep van de oude core-evaluator met `phase: post-switch` wordt
expliciet geweigerd. Daardoor kan geen interne aanroeper de activatielaag, het
vaste switchtijdstip of de vereiste stabiele rondes omzeilen.

## Verificatie

De regressiesuite bewijst:

- een niet-goedgekeurde context start geen netwerkprobe;
- `EACCES` en `EPERM` worden als lokale runnerfout vastgelegd;
- precies één herhaalmeting kan een tijdelijke lokale false negative
  opvangen;
- een blijvende lokale permissiefout blijft `Probe invalid`;
- een ongeldige probe telt nooit als geldig bewijs of rollbackgrond;
- dezelfde netwerkcontext telt niet dubbel;
- de bestaande release- en rollbackclassificaties blijven intact.

Uitgevoerde kandidaatvalidatie:

- volledige regressiesuite: **65/65 geslaagd**;
- productiebuild en public-only grenscontrole: **geslaagd**;
- expliciet niet-goedgekeurde runner: vóór netwerkverkeer geweigerd en door
  de evaluator geclassificeerd als **`Probe invalid`**;
- IPv4 vanuit `codex-network-enabled` / `transip-ipv4`: **4/4 geldige target-
  en 4/4 geldige controlmetingen**;
- IPv6 vanuit `codex-network-enabled` / `transip-ipv6`: **4/4 geldige target-
  en 4/4 geldige controlmetingen**;
- gezamenlijk preflightbesluit: **`Pass`**, twee onafhankelijke geldige
  netwerkcontexten, `switch-eligible`;
- validatieprofiel:
  `920EE02400357FCF07F7953BDDCEE388E398EDDB43F2D34C857A98D7F7995942`.

De live netwerkmetingen waren read-only. Preview, productie en DocumentRoot
zijn niet gewijzigd.

## Atlas Reflection

### Waarneming

De vorige validator kwalificeerde de route, maar niet de bevoegdheid van het
proces dat de route probeerde te gebruiken.

### Begrip

Een netwerkroute en een uitvoeringscontext zijn twee verschillende
bewijsgrenzen. DNS kan gezond zijn terwijl lokale sockettoegang wordt
geweigerd.

### Herbruikbare les

Valideer niet alleen de waarnemer en de route, maar ook de bevoegdheid waarmee
de waarneming wordt uitgevoerd.

### Bewijsgrens

De code kan de afgesproken runner- en netwerkidentiteit afdwingen en
permissiefouten herkennen. De fysieke onafhankelijkheid van twee door een
operator opgegeven netwerkcontexten blijft operationeel bewijs.

### Onzekerheid

De eerstvolgende echte releasevalidatie moet aantonen dat de gekozen
goedgekeurde runnercontext ook op het publicatiemoment netwerkgeschikt blijft.

### Terugkeertrigger

Heropen deze hardening wanneer een goedgekeurde runner opnieuw structureel
`EACCES`/`EPERM` levert, of wanneer twee als onafhankelijk geregistreerde
netwerkcontexten aantoonbaar hetzelfde pad gebruiken.

### Atlas Recommendation

Na geslaagde regressie-, build- en netwerkvalidatie kan een nieuwe,
afzonderlijk goedgekeurde publicatiepoging worden voorbereid. Deze hardening
zelf publiceert niets.
