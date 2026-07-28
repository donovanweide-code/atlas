# We Build And Design — productie-handoff

Datum: 2026-07-28
Tijdvenster: 02:24–02:28 CEST
Releasebesluit: expliciete Production GO
Uitkomst: **NO GO voor de nieuwe live release; rollback uitgevoerd en geslaagd**

## Vastgelegde release

- Canonieke broncommit: `e6aedabe91946f0b93df0bbbb8a91d3bcd107ac7`
- Releaseartefact: `wbd-e6aedab-preview.zip`
- SHA-256 artefact: `F95D1819EFC513E8782452082BA67DDFB471E7F6094D12AED336773F30064163`
- Beoogde productie-DocumentRoot: `/sites/wbd-20260728-e6aedab`
- Rollback-DocumentRoot: `/sites/wbd-20260726-ca3d1bd`

## Voorbereiding

Het vastgelegde artefact is zonder inhoudelijke wijzigingen geüpload naar:

`/sites/wbd-20260728-e6aedab`

De versioned map is vóór de omschakeling gecontroleerd:

- 7 rootbestanden aanwezig;
- 22 assets aanwezig;
- actieve kandidaatbundels aanwezig:
  - `assets/index-DX1T5CEV.js`
  - `assets/index-DWjRSiTi.css`
- tijdelijk uploadarchief na uitpakken verwijderd;
- bestaande rollbackmap ongemoeid gelaten.

## Productieomschakeling

Het productiepad is in TransIP gewijzigd van:

`/sites/wbd-20260726-ca3d1bd`

naar:

`/sites/wbd-20260728-e6aedab`

Het TransIP-controlepaneel bevestigde de wijziging met `Website opgeslagen`.

## Kritieke rooktest

De eerste aanvraag gaf nog de eerdere productie-index terug. Daarna mislukten acht opeenvolgende HTTPS-aanvragen naar de primaire productie-URL met:

`Failed to connect to webuildanddesign.nl:443`

Omdat bereikbaarheid van de primaire productie-URL een kritieke rooktest is, is de releaseprocedure onmiddellijk gestopt. De overige rooktesten van de nieuwe release zijn daarom niet uitgevoerd.

## Rollback

Het productiepad is direct teruggezet naar:

`/sites/wbd-20260726-ca3d1bd`

Het TransIP-controlepaneel bevestigde opnieuw `Website opgeslagen`.

Na rollback is vastgesteld:

- `https://webuildanddesign.nl/` retourneert `200 OK`;
- de eerdere productie-index wordt weer geserveerd;
- actieve JS-bundel: `assets/index-DxU6iiRJ.js`;
- actieve CSS-bundel: `assets/index-NnYm0S8a.css`;
- `https://webuildanddesign.nl/over-ons` retourneert `200 OK`;
- de nieuwe bundels zijn niet actief op productie.

De bestaande productie vertoont daarnaast de reeds bestaande situatie:

- `https://www.webuildanddesign.nl/` retourneert `200 OK` in plaats van een redirect;
- een onbekende route retourneert `200 OK` via de bestaande SPA-fallback.

Deze twee observaties zijn geen resultaat van de teruggedraaide release; ze beschrijven de herstelde vorige productieversie.

## Resultaat per gevraagde controle

| Controle | Resultaat |
| --- | --- |
| Primaire productie-URL | Kritiek mislukt na omschakeling; na rollback hersteld naar `200 OK` |
| `www`-redirect | Niet getest op de nieuwe release; herstelde vorige productie retourneert `200 OK` |
| Publieke deeplinks | Niet getest op de nieuwe release; `/over-ons` werkt na rollback |
| Echte 404 | Niet getest op de nieuwe release; vorige productie gebruikt nog een `200` SPA-fallback |
| Assets | Niet getest op de nieuwe release |
| Securityheaders | Niet getest op de nieuwe release |
| Caching | Niet getest op de nieuwe release |
| Afwezigheid preview-`noindex` | Niet getest op de nieuwe release |
| Zichtbare nieuwe bundels | Niet bereikt |
| Oude productie-assets niet actief | Niet bereikt; oude assets zijn na rollback bewust weer actief |

## Definitieve status

**NO GO voor live release `e6aedab`.**

De rollback is uitgevoerd en geslaagd. De eerdere productieversie is actief via `/sites/wbd-20260726-ca3d1bd`. De nieuwe versioned map `/sites/wbd-20260728-e6aedab` blijft intact voor onderzoek; er wordt geen tweede omschakelpoging uitgevoerd zonder een nieuw expliciet besluit.

## Atlas Reflection

### Waarneming

De kandidaat en het versioned artefact konden gecontroleerd worden voorbereid. De productieomgeving werd na de DocumentRoot-wijziging echter niet betrouwbaar bereikbaar.

### Begrip

Een bevestigde instelling in het hostingpaneel is geen bewijs van een geslaagde live release. Alleen de werkelijk bereikbare productie-URL kan dat bewijs leveren.

### Herbruikbare les

De eerste kritieke rooktest moet altijd bereikbaarheid van het primaire domein zijn. De vooraf klaargezette versioned rollback maakt direct herstel mogelijk zonder bestandsmutaties.

### Bewijsgrens

Deze uitvoering bewijst niet waardoor de bereikbaarheid wegviel. Zij bewijst wel de tijdsrelatie tussen de omschakeling, de mislukte aanvragen en het herstel na rollback.

### Onzekerheid

Onbekend is of de storing ontstond door tijdelijke hostingreconfiguratie, activatievertraging of een andere productieafhankelijkheid buiten de repository.

### Terugkeertrigger

Een nieuwe publicatiepoging is pas betekenisvol nadat de oorzaak of de benodigde activatietijd bij een DocumentRoot-wijziging voldoende is vastgesteld en opnieuw een expliciete Production GO is verleend.

### Atlas Recommendation

Voer eerst een begrensde release-incidentanalyse uit. Start geen tweede productieomschakeling binnen deze uitvoering.
