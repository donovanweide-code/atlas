# Experience Organic Entry & Session Separation v1

Status: **GO — productie actief en browseracceptatie geslaagd**  
Datum: 3 augustus 2026  
Algemene ingang: `https://experience.webuildanddesign.nl/ervaar`

## Resultaat

De Experience heeft nu één algemene ingang die zonder voorbereiding kan worden
doorgestuurd. Een nieuwe browser maakt een eigen deelnemer en centrale sessie
aan. Dezelfde browser hervat die Experience rustig via `Welkom terug, <naam>`.
Met `Ik ben iemand anders` ontstaat een nieuwe, volledig gescheiden deelnemer;
de vorige centrale sessie en antwoorden blijven bestaan.

De bestaande persoonlijke ingang `/e/#<token>` is niet vervangen. Persoonlijke
uitnodigingen blijven afzonderlijk gekoppeld aan hun bedoelde deelnemer. De
publieke WBD-website, Atlas Workspace en Sportpaleis zijn niet aangepast.

## Gedrag en opslaggrens

- `/ervaar` vraagt naam en optioneel functie en bedrijf voordat de bestaande
  Human First Experience begint.
- De server maakt cryptografisch willekeurige deelnemer-, sessie- en
  toegangstokens. De browser krijgt alleen een `Secure`, `HttpOnly`,
  `SameSite=Strict` toegangscookie en een niet-gevoelige lokale herkenningsvlag.
- Centraal staan deelnemerprofiel, sessie, antwoorden, feedback en gebeurtenissen
  per deelnemer. Elke mutatie wordt server-side aan de eigen toegang gekoppeld.
- `/ervaar#via=<share-id>` registreert uitsluitend een veilige, niet-persoonlijke
  herkomst. De waarde geeft nooit toegang tot de sessie of antwoorden van de
  deler en maakt op een nieuw apparaat altijd een nieuwe deelnemer.
- `Ik ben iemand anders` trekt alleen de lokale toegang voor de huidige browser
  in. De bestaande centrale Experience wordt niet verwijderd of overschreven.
- Het Observatory onderscheidt algemene instroom, nieuwe deelnemers, hervatten,
  gedeelde routes en persoonlijke uitnodigingen. Profiel, antwoorden, feedback
  en tijdlijn blijven per deelnemer zichtbaar.

## Gewijzigde bestanden

- `website/src/experience-store.ts`
- `website/src/experience-validation-api.ts`
- `website/src/experience-workspace.ts`
- `website/src/experience-observatory.ts`
- `website/src/styles/experience-workspace.css`
- `website/src/styles/experience-observatory.css`
- `website/experience-server/api/index.php`
- `website/experience-server/private/schema.sql`
- `website/experience-server/private/migrations/002-organic-entry.sql`
- `website/scripts/experience-validation-local-server.mjs`
- `website/tests/experience-organic-entry.test.mjs`

Er zijn geen externe dependencies toegevoegd. De Experience gebruikt de
bestaande WBD-shell en rustige stijl.

## Browseracceptatie

De verplichte flow is eerst met drie geïsoleerde lokale browsercontexten en
daarna tegen productie uitgevoerd.

### Lokale scheidingsproef

1. Mobiele context A (`390 × 844`) maakte deelnemer Anna aan met functie en
   bedrijf en verstuurde twee antwoorden.
2. Na sluiten en heropenen verscheen `Welkom terug, Acceptatie Anna`; hervatten
   kwam terug op exact het tweede luistermoment, zonder duplicaat.
3. `Ik ben iemand anders` maakte deelnemer Bram aan met een eigen deelnemer- en
   sessie-id en nul antwoorden.
4. Een schone derde context op een afzonderlijke hostnaam maakte deelnemer Cato
   aan met opnieuw een eigen deelnemer- en sessie-id.
5. Het lokale Observatory liet drie afzonderlijke deelnemers, drie afzonderlijke
   sessies en uitsluitend de twee antwoorden van Anna zien.
6. De bestaande persoonlijke `/e/#<token>`-flow opende ongewijzigd de bestaande
   persoonlijke introductie.

### Productieproef

1. `https://experience.webuildanddesign.nl/ervaar#via=acceptance-production-organic`
   maakte technische deelnemer A aan met functie en bedrijf.
2. Deelnemer A verstuurde twee antwoorden; de browser werd gesloten en opnieuw
   geopend. `Welkom terug, Technische acceptatie Productie A` verscheen en de
   Experience hervatte op exact het laatste luistermoment.
3. `Ik ben iemand anders` maakte technische deelnemer B met een eigen sessie en
   zonder antwoorden. De databasecontrole bevestigde: A heeft één sessie en twee
   antwoorden; B heeft één sessie en nul antwoorden.
4. Het productie-Observatory liet beide deelnemers afzonderlijk zien. A bevatte
   profiel, herkomst, create/share/start/answer/resume-gebeurtenissen en alleen
   de eigen antwoorden. B bevatte alleen het eigen profiel en de eigen start.
5. De Observatory-tellers registreerden twee algemene instromen, twee nieuwe
   deelnemers, één hervatting en één gedeelde route.
6. De browserconsole bleef leeg op algemene ingang, hervatten, tweede deelnemer,
   Observatory en de bestaande persoonlijke flow.

De derde volledig schone browsercontext is lokaal gebruikt om dezelfde
servercontracten zonder gedeelde browsercookie te bewijzen. Productie A en B
bewijzen daarnaast dat twee deelnemers op één apparaat centraal gescheiden
blijven.

## Bestaande uitnodiging van Liona

De uitnodiging is niet geopend of gemuteerd om haar praktijkervaring niet te
vervuilen. In plaats daarvan is de productieopslag rechtstreeks gecontroleerd:

- uitnodiging bestaat;
- status is `created`;
- type is `personal`;
- `opened_at` en `started_at` zijn leeg;
- SHA-256 van het eerder uitgegeven platte token komt exact overeen met de
  opgeslagen tokenhash.

Daarmee is zowel de linkintegriteit als de ongeopende status aangetoond zonder
het persoonlijke token in documentatie of logs op te nemen.

## Tests en builds

- `npm test`: **148/148 geslaagd**.
- `npm run build:experience`: **geslaagd**.
- `npm run build`: **geslaagd**; public-only controle **29 bestanden / 9
  tekstbestanden**.
- Productie-PHP: syntaxcontrole van API en migratiehelper **geslaagd**.

De publieke build bevat geen Experience-, Observatory- of Atlas-interne routes.

## Productierelease

- Actieve DocumentRoot:
  `/sites/wbd-experience-20260803-1adp8tc`.
- Lokale releasekopie:
  `output/experience-validation-environment-v1/experience-documentroot-20260803-1adp8tc.tar.gz`.
- SHA-256 releasekopie:
  `1FB15E46DBF9E53EA0F30257E4D65965DF55AC9B3F82D0FD2FDE6CAB9A6A8D61`.
- Bijgewerkt overdrachtspakket:
  `output/experience-validation-environment-v1/experience-validation-environment-v1-deploy.zip`,
  SHA-256
  `06103100ED27E00E1C7924F39C1BDF1810F3AE604EAC524F51C502E68AFFD5C6`.
- Experience-JavaScript: `assets/experience-1aD-P8tc.js`.
- PHP-runtime: 8.2; schema-uitbreiding `002-organic-entry.sql` toegepast.
- Tijdelijke upload-, migratie- en verificatiebestanden zijn na GO verwijderd.

## Beveiligingscontrole

- HTTPS geeft 200 en HSTS is actief.
- Alle Experience-responses bevatten `X-Robots-Tag: noindex, nofollow,
  noarchive, nosnippet, noimageindex`.
- `/robots.txt` bevat `Disallow: /`; `/sitemap.xml` geeft 404.
- CSP, frameblokkering, `nosniff`, `no-referrer` en een beperkte
  Permissions-Policy zijn actief.
- Er staan geen persoonsnamen of sessiegeheimen in de deelbare URL.
- Het actuele Experience-errorlog bevat na de acceptatie geen nieuwe fouten.
  De enige zichtbare recente meldingen waren eerdere, door ModSecurity geblokte
  WordPress-scans op de afzonderlijke publieke host.
- De tijdelijke TransIP-deploysleutel met vingerafdruk
  `34a79f01e5eab90ed9b3574f5d47f2de` is verwijderd. Na refresh toont TransIP
  `Geen SSH-key`. Ook beide lokale sleutelbestanden en hun werkruimtekopieën
  zijn verwijderd.
- Na het intrekken van de deploytoegang geven de Experience en de publieke site
  nog steeds HTTP 200; Observatory en centrale sessies bleven operationeel.

## Rollback

De vorige Experience-release staat ongewijzigd op:

`/sites/wbd-experience-20260803-92c3be5`

Rollback van de applicatie is het terugzetten van uitsluitend de DocumentRoot
van `experience.webuildanddesign.nl` naar die map. De schema-uitbreiding is
achterwaarts compatibel. Voor volledig databaseherstel is vóór de migratie een
afgeschermde back-up gemaakt:

- pad: `tmp/experience-before-organic-entry-20260803.sql`;
- rechten: `600`;
- SHA-256:
  `ad487ac92ba4e1fa2cb0cf430b0219975ef5a108d3f4443b333f51d02671f82f`.

De publieke DocumentRoot is nooit gewijzigd.

## Definitieve deelbare link

**https://experience.webuildanddesign.nl/ervaar**

Deze link kan zonder uitnodiging of Observatory-beheer worden doorgestuurd.
Iedere nieuwe browser krijgt een eigen Experience; een terugkerende browser
hervat de eigen Experience.
