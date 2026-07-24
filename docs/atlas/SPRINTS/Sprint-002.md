# Sprint 002 — Bewijssprint

- **Start:** 2026-07-22
- **Status:** Afgerond — de eerste redactionele geheugenverbinding en de mobiele browsercorrectie zijn gecommit en gepusht.
- **Canonieke basis:** `Foundation.md`; de Foundation blijft ongewijzigd.
- **Aard:** Handmatig praktijkonderzoek, geen bouw- of automatiseringssprint.

## Doel

Bewijzen dat Atlas een ondernemer vanuit diens bedoeling kan begeleiden met een oordeel dat aantoonbaar rust op de laatst bevestigde werkelijkheid.

De beoogde keten is:

**Bedoeling van de ondernemer → Werkelijkheid → Waarneming → Bevestigde context → Begrip → Begrensd oordeel óf gericht onderzoek → Eén direct bruikbare volgende stap**

## Twee bewijsbanen

### 1. Werkelijkheidsbewijs

Atlas onderzoekt of een openbare, veilig leesbare werkelijkheid herkenbaar is: bijvoorbeeld een bereikbare website, gewijzigde pagina, deploymentuitkomst, foutmelding of niet-uitvoerbare contactroute. Een waarneming bewijst alleen wat op dat moment via die bron kon worden vastgesteld.

### 2. Menselijk bewijs

De ondernemer beschrijft bedoeling en ervaring in gewone taal en bevestigt of corrigeert de door Atlas herkende context. Technische termen zijn geen vereiste om een onderzoek te beginnen of een volgende stap te begrijpen.

Geen van beide bewijsbanen is zelfstandig de volledige bedrijfswerkelijkheid. Technisch bewijs zonder bedoeling mist betekenis; menselijke ervaring zonder actuele controle kan op een verouderd beeld rusten.

## Bewijsformat

Iedere bewijsronde bewaart minimaal:

- **Bedoeling:** wat wil de ondernemer bereiken, in diens eigen woorden?
- **Onderzoeksvraag:** welke werkelijkheid moet Atlas daarvoor eerst bekijken?
- **Bron:** welke openbare of door de ondernemer bevestigde bron is onderzocht?
- **Tijdstip:** wanneer is de waarneming gedaan?
- **Waarneming:** wat was rechtstreeks zichtbaar of controleerbaar?
- **Betrouwbaarheid:** direct waargenomen, door de ondernemer bevestigd, afgeleid of nog onbekend.
- **Begrenzing:** wat bewijst deze waarneming nadrukkelijk niet?
- **Contextbevestiging:** wat heeft de ondernemer bevestigd of gecorrigeerd?
- **Betekenis:** welke betekenis kan het bewijs verantwoord dragen?
- **Oordeel of onderzoek:** is één begrensd oordeel verantwoord, of ontbreekt daarvoor nog beslissend bewijs?
- **Volgende stap:** één direct bruikbare stap die uit het oordeel of onderzoek volgt.
- **Herziening:** welk eerder begrip verandert, door welk nieuw bewijs en met welk gevolg?

## Werkwijze

1. Begin bij de bedoeling van de ondernemer, niet bij hosting, DNS, Git, builds of deployments.
2. Kies de kleinste veilige en controleerbare werkelijkheid die die bedoeling kan verhelderen.
3. Onderzoek eerst en verander niets aan een productieomgeving.
4. Leg bron, tijdstip, waarneming en betrouwbaarheid vast.
5. Scheid wat zichtbaar is van wat wordt afgeleid en van wat onbekend blijft.
6. Laat de ondernemer relevante context bevestigen of corrigeren.
7. Geef alleen bij voldoende bewijs één begrensd oordeel.
8. Formuleer bij onvoldoende bewijs geen advies, maar één gericht onderzoek.
9. Lever daarna één stap in niet-technische, direct bruikbare vorm.
10. Bewaar ook correcties en herzieningen; een eerder oordeel wordt niet stil overschreven.

## Wanneer is bewijs voldoende?

Er geldt geen vast aantal ondernemers of waarnemingen. Bewijs is voldoende voor de volgende beslissing wanneer:

- meerdere relevante bronnen hetzelfde begrensde oordeel kunnen dragen;
- relevante tegenspraak is onderzocht;
- beslissende onzekerheden zijn opgelost of expliciet onderdeel van de begrenzing blijven;
- nieuw bewijs het centrale oordeel niet meer wezenlijk verandert;
- de ondernemer de volgende stap zonder technische vertaalslag begrijpt en kan uitvoeren.

Een positieve bewijsronde geeft niet automatisch GO voor software. Zij rechtvaardigt alleen de volgende beoordeling: `Bouwen`, verder `Toetsen` of `Horizon`.

## Grenzen

- Geen automatische monitoring, analyse of alerts.
- Geen TransIP-, DNS-, hosting- of deploymentintegraties.
- Geen productieaanpassingen om bewijs te veroorzaken.
- Geen wachtwoorden, tokens, sleutels of andere secrets in Atlas of de repository.
- Geen publieke URL, providerconfiguratie of live status afleiden zonder bevestigde bron.
- Geen Foundation- of Decision-wijziging voordat praktijkbewijs promotie rechtvaardigt.

## Bewijslogboek

### E-002-001 — Publieke identiteit van We Build And Design

- **Bedoeling:** De publieke WBD-website als actuele werkelijkheidsbron kunnen onderzoeken zonder technische voorbereiding van Donovan.
- **Onderzoeksvraag:** Kan Atlas de officiële publieke WBD-website verantwoord identificeren uit de bestaande repository en openbare zoekresultaten?
- **Bron:** Getrackte Atlas-repository en openbare zoekopdrachten op de exacte bedrijfsnaam, Donovan en TransIP.
- **Tijdstip:** 2026-07-22 06:16 CEST.
- **Waarneming:** De repository bevat geen bevestigde productie-URL, hostingconfiguratie of deploymentbron. De openbare zoekresultaten tonen gelijkende namen en andere bureaus, maar geen bron die verantwoord aan Case 0001 kan worden gekoppeld.
- **Betrouwbaarheid:** Direct waargenomen binnen de onderzochte bronnen. Dit is sterk bewijs dat de publieke identiteit via deze bronnen niet verantwoord identificeerbaar is; het is geen bewijs dat er geen publieke website bestaat.
- **Begrenzing:** Atlas kent nog niet de officiële WBD-URL, livestatus, hostingroute of relatie tussen lokale code en productie.
- **Contextbevestiging:** Nog nodig van Donovan; een URL is context, geen secret.
- **Betekenis:** Een live onderzoek of vergelijking tussen lokaal en productie zou nu op een aanname rusten.
- **Oordeel of onderzoek:** Nog geen oordeel over de live website. Het kleinste gerichte onderzoek is bevestiging van de officiële publieke URL.
- **Volgende stap:** Laat Donovan uitsluitend de officiële publieke WBD-URL bevestigen.
- **Herziening:** Geen eerder live oordeel om te herzien.

#### Herziening 1 — Publieke URL door de eigenaar bevestigd

- **Bron:** Donovan, eigenaar van Case 0001.
- **Tijdstip:** Eerste bevestiging binnen Sprint 002, ontvangen op 2026-07-22.
- **Nieuwe waarneming:** `https://webuildanddesign.nl` is de officiële publieke URL van We Build And Design.
- **Betrouwbaarheid:** Hoog — direct bevestigd door de eigenaar van de case.
- **Begrenzing:** De bevestiging identificeert de bron, maar zegt nog niets over bereikbaarheid, actuele inhoud, hostingroute of relatie met de lokale repository.
- **Herziening:** Het eerdere begrip `publieke identiteit niet verantwoord identificeerbaar` verandert in `publieke identiteit bevestigd`. Het eerdere onderzoek was correct begrensd; nieuwe eigenaarcontext maakt vervolgonderzoek nu verantwoord.

#### Heruitvoering — Waarneming op de bevestigde publieke bron

- **Onderzoeksvraag:** Welke publiek waarneembare werkelijkheid toont de bevestigde WBD-URL nu?
- **Bron:** `https://webuildanddesign.nl`, `https://webuildanddesign.nl/contact` en `https://webuildanddesign.nl/diensten`, rechtstreeks read-only geopend.
- **Tijdstip:** 2026-07-22 06:22 CEST.
- **Waarneming:** De drie gecontroleerde routes zijn via HTTPS bereikbaar en tonen dezelfde Engelstalige onderhoudspagina met de titel `We Build And Design is under construction`, de boodschap `Sorry, we're doing some work on the site` en een publieke verwijzing naar de WordPress-inlogroute. De ontworpen lokale WBD Experience en een uitvoerbaar publiek contactmoment zijn op deze routes niet zichtbaar.
- **Betrouwbaarheid:** Hoog voor de zichtbare toestand van deze drie routes op dit tijdstip — rechtstreeks waargenomen op de door de eigenaar bevestigde publieke bron.
- **Begrenzing:** Deze waarneming bewijst niet waarom onderhoudsmodus actief is, welke WordPress-installatie of hostingconfiguratie erachter ligt, of de lokale repository al ergens is gedeployed. Zij bewijst evenmin dat iedere mogelijke route hetzelfde antwoord geeft.
- **Contextbevestiging:** De URL is door Donovan bevestigd. De bedoeling, oorzaak en gewenste livegang van de huidige onderhoudstoestand zijn nog niet bevestigd.
- **Betekenis:** De publieke werkelijkheid draagt momenteel niet het lokale WBD-verhaal dat in Case 0001 en de repository is ontworpen. Een bezoeker kan op de gecontroleerde routes niet ervaren wat WBD realiseert of via de ontworpen contactroute verdergaan.
- **Oordeel of onderzoek:** Atlas kan verantwoord oordelen dat de gecontroleerde publieke routes nu een onderhoudspagina tonen. Atlas kan nog niet verantwoord adviseren hoe de lokale Experience live moet worden gezet. Daarvoor ontbreekt inzicht in de huidige omgeving, de gewenste uitkomst en een veilige herstelroute.
- **Volgende stap:** Breng met Donovan eerst in gewone taal in kaart welke website onder het domein hoort te staan en welke herstelmogelijkheid beschikbaar moet blijven. Kies pas daarna de technische publicatieroute.
- **Herziening:** `Nog geen oordeel over de live website` wordt herzien naar `de gecontroleerde publieke routes tonen een onderhoudspagina en geen uitvoerbare WBD Experience`. Het eerdere ontbreken van een oordeel was verantwoord; de nieuwe waarneming maakt dit begrensde oordeel nu mogelijk.

## Actuele status

De eerste onderzoeksketen heeft aantoonbaar een herziening doorlopen: van ontbrekende bronidentiteit, via eigenaarbevestiging, naar een begrensd oordeel over de zichtbare publieke toestand. Er is nog geen menselijk ervaringsbewijs verzameld en nog geen verantwoord advies gevormd over deployment, hosting of livegang.

### E-002-002 — Bedoelde publieke toestand en productiegrens

- **Bron:** Donovan, eigenaar van Case 0001.
- **Tijdstip:** Bevestigd binnen Sprint 002 op 2026-07-22.
- **Waarneming:** De bestaande WordPress-installatie is de huidige productietoestand. De lokale We Build And Design Experience is de beoogde publieke website. WordPress hoeft niet direct te worden verwijderd en blijft tijdens de voorbereiding herstelbaar.
- **Betrouwbaarheid:** Hoog — de bedoeling en beslisgrens zijn rechtstreeks bevestigd door de eigenaar.
- **Begrenzing:** De bevestiging zegt nog niet welk TransIP-product actief is, hoe bestanden worden gepubliceerd, of staging, subdomeinen, back-ups en rollback beschikbaar zijn.
- **Betekenis:** De eerstvolgende stap is geen livegang, maar onderzoek naar een geïsoleerde en herstelbare bewijsroute naast de bestaande productieomgeving.
- **Oordeel of onderzoek:** Er is nog onvoldoende technisch bewijs om een publicatieroute te kiezen. Onderzoek eerst de publieke infrastructuursignalen en de mogelijkheden van het werkelijk gebruikte TransIP-product.
- **Volgende stap:** Vergelijk alleen veilige routes die WordPress tijdens voorbereiding ongemoeid laten en een expliciet acceptatiemoment vóór vervanging behouden.
- **Herziening:** De eerdere open vraag `welke website hoort publiek te staan?` is beantwoord. Het begrip verschuift van onduidelijke bedoeling naar een bevestigde vervangingsintentie met behoud van herstelbaarheid.

### E-002-003 — Veilige publicatieroute naast WordPress

- **Bedoeling:** De nieuwe We Build And Design Experience gecontroleerd kunnen bewijzen zonder de bestaande WordPress-productietoestand voortijdig te vervangen of onherstelbaar te wijzigen.
- **Onderzoeksvraag:** Welke publicatieroute kan de nieuwe Experience technisch isoleren van de huidige WordPress-site en houdt een expliciet ondernemersbesluit vóór livegang in stand?
- **Bron:** Publieke DNS-resolutie en HTTPS-response van `webuildanddesign.nl`, aangevuld met officiële TransIP-documentatie over DocumentRoot, subdomeinen, test-URL's, testomgevingen en back-ups.
- **Tijdstip:** 2026-07-22 06:27 CEST.
- **Waarneming:** Het hoofddomein en `www` verwijzen naar dezelfde actieve infrastructuur; de nameservers zijn van TransIP. De HTTPS-response is `200 OK`, noemt `nginx`, bevat een WordPress `X-Pingback`-header en een `Retry-After`-header passend bij de zichtbare onderhoudstoestand. TransIP documenteert meerdere mogelijke isolatieroutes, maar de beschikbaarheid daarvan verschilt per product: reguliere Webhosting kan een aparte website op een subdomein ondersteunen, WordPress Hosting en Managed WordPress kennen testomgevingen, en reguliere Webhosting kent een test-URL. Back-upomvang en herstelgedrag verschillen eveneens per pakket.
- **Betrouwbaarheid:** Hoog voor de rechtstreeks gemeten publieke DNS- en HTTPS-signalen op dit tijdstip. Hoog voor wat TransIP als productmogelijkheden documenteert. Nog onbekend welke van die mogelijkheden werkelijk beschikbaar zijn in het account van Case 0001.
- **Begrenzing:** De publieke signalen bewijzen niet welk TransIP-product actief is, welke DocumentRoot wordt gebruikt, welke toegang Donovan heeft, of een afzonderlijk subdomein, testomgeving, test-URL en bruikbare back-up in dit pakket beschikbaar zijn. Een WordPress-signaal bewijst de applicatie, niet het hostingproduct. Er zijn geen instellingen, bestanden, DNS-records of productiegegevens gewijzigd.
- **Contextbevestiging:** Donovan heeft bevestigd dat WordPress herstelbaar moet blijven en dat vervanging pas na een nieuw ondernemersbesluit mag plaatsvinden.
- **Betekenis:** Een geïsoleerde preview naast WordPress past aantoonbaar beter bij de bevestigde productiegrens dan een directe vervanging in de huidige DocumentRoot. Welke vorm die preview krijgt, kan nog niet verantwoord worden gekozen.
- **Oordeel of onderzoek:** Nog geen publicatieadvies. Indien het pakket een zelfstandige subdomeinsite ondersteunt, is dat op basis van de documentatie de kleinste kandidaat-route: alleen de gebouwde Experience in een afzonderlijke map publiceren en `/www/` ongemoeid laten. Indien het account een WordPress-testomgeving biedt, moet eerst worden vastgesteld of die de statische Experience werkelijk kan dragen. De reguliere test-URL is pas een veilige kandidaat wanneer zij naar een geïsoleerde omgeving wijst en niet vereist dat de huidige WordPress-bestanden worden overschreven.
- **Volgende stap:** Laat Donovan uitsluitend het producttype aflezen dat TransIP bij `webuildanddesign.nl` toont: `Webhosting`, `WordPress Hosting` of `Managed WordPress`. Kies daarna één bij dat product passende, geïsoleerde bewijsroute en toets die eerst zonder productieaanpassing.
- **Herziening:** Het eerdere begrip `er is nog geen veilige publicatieroute bekend` wordt aangescherpt naar `een geïsoleerde preview is de juiste routecategorie; de concrete route blijft afhankelijk van één nog onbevestigd productgegeven`.

#### Officiële bronnen voor deze bewijsronde

- [TransIP — De DocumentRoot van je website](https://www.transip.nl/knowledgebase/6605-de-documentroot-van-je-website)
- [TransIP — Een subdomein aanmaken op een webhostingpakket](https://www.transip.nl/knowledgebase/5897-een-subdomein-aanmaken-op-webhostingpakket/)
- [TransIP — Wat is de test-URL?](https://www.transip.nl/knowledgebase/5915-wat-is-de-test-url/)
- [TransIP — De testomgeving voor Managed WordPress](https://www.transip.nl/knowledgebase/6683-de-testomgeving-voor-managed-wordpress)
- [TransIP — Back-ups op webhostingpakketten](https://www.transip.nl/knowledgebase/5912-back-ups-op-webhostingpakketten)

#### Herziening 1 — Reguliere Webhosting bevestigd

- **Bron:** Donovan, rechtstreeks afgelezen uit het TransIP-dashboard van Case 0001.
- **Tijdstip:** 2026-07-22 06:52 CEST.
- **Nieuwe waarneming:** Het actieve producttype is reguliere `Webhosting`. Het huidige sitepad is `/www`. `WordPress Hosting` en `Managed WordPress` zijn niet actief.
- **Betrouwbaarheid:** Hoog voor producttype en sitepad — rechtstreeks door de eigenaar in het betreffende dashboard waargenomen en bevestigd.
- **Begrenzing:** De pakketvariant is nog niet bevestigd. TransIP stelt zelfstandige extra websites beschikbaar op Webhosting Pro en Max; uit `Webhosting` alleen volgt daarom nog niet dat de knop `+ Website toevoegen` in dit pakket beschikbaar is.
- **Bewezen voorkeursroute:** Publiceer de gebouwde statische Experience later als zelfstandige extra website op een preview-subdomein, bijvoorbeeld `preview.webuildanddesign.nl`, met een eigen DocumentRoot onder `/subsites/`. Laat `/www` en de WordPress-database volledig ongemoeid. Gebruik de preview uitsluitend voor controle; vervanging van het hoofddomein blijft een afzonderlijk ondernemersbesluit.
- **Waarom deze route:** TransIP documenteert dat een extra website losstaat van de hoofdwebsite en een eigen sitepad krijgt. Daarmee wordt de nieuwe Experience technisch gescheiden van de huidige WordPress-productie. De huidige test-URL is geen passende isolatieroute, omdat die het resultaat van het bestaande hoofdpakket toont; publiceren daarvoor zou nog steeds de inhoud onder het huidige hoofdpadaanbod raken. Een map binnen `/www` of een wijziging van de DocumentRoot van het hoofddomein raakt eveneens de productiegrens.
- **Uitvoeringsvoorwaarde:** Controleer vóór iedere hostinghandeling uitsluitend of `Website → Domeinen & SSL` de optie `+ Website toevoegen` toont. Is die optie aanwezig, dan is de voorkeursroute binnen het huidige pakket uitvoerbaar. Is zij afwezig, stop dan: een pakketwijziging of afzonderlijke hostingomgeving vraagt eerst een ondernemersbesluit over kosten en route.
- **Herziening:** `De concrete route hangt af van het producttype` wordt herzien naar `een zelfstandige preview-subsite is de voorkeursroute; alleen de beschikbaarheid binnen de nog onbekende pakketvariant moet vóór uitvoering worden bevestigd`.
- **Productiehandeling:** Geen. Er zijn geen bestanden geüpload, websites of subdomeinen aangemaakt, DNS-records gewijzigd, back-ups teruggezet of instellingen aangepast.

#### Aanvullende officiële bron

- [TransIP — Een extra website toevoegen aan je webhostingpakket](https://www.transip.nl/knowledgebase/een-website-toevoegen-aan-je-webhostingpakket)

#### Herziening 2 — Extra website beschikbaarheid bevestigd

- **Bron:** Donovan, rechtstreeks afgelezen uit het TransIP-dashboard van Case 0001.
- **Tijdstip:** Bevestigd op 2026-07-22; het exacte tijdstip is niet vastgelegd.
- **Nieuwe waarneming:** Onder `Website → Domeinen & SSL` is de optie `+ Website toevoegen` aanwezig.
- **Betrouwbaarheid:** Hoog — rechtstreeks door de eigenaar in het betreffende dashboard waargenomen en bevestigd.
- **Begrenzing:** Deze bevestiging bewijst dat de voorkeursroute technisch beschikbaar is. Zij bewijst niet dat de previewwebsite, het subdomein of de DocumentRoot al is aangemaakt of getest.
- **Betekenis:** De beslissende technische onzekerheid voor de geïsoleerde previewroute is opgelost. De uitvoering blijft afhankelijk van een afzonderlijke expliciete GO.
- **Herziening:** `De beschikbaarheid binnen de pakketvariant moet nog worden bevestigd` wordt herzien naar `de geïsoleerde previewroute is beschikbaar en wacht op een uitvoeringsbesluit`.
- **Productiehandeling:** Geen. De bestaande WordPress-installatie, `/www`, database, DNS en hostinginstellingen blijven onaangeraakt.

## Afsluiting

- Commit `7154855` introduceerde de eerste redactionele geheugenverbinding voor Case 0001.
- Commit `8ca9a6400c30f924edf826c527772feec25d4bfc` rondde Sprint 002 af met de gevalideerde mobiele ankercorrectie.
- `HEAD` en `origin/main` wijzen tijdens de synchronisatie op deze laatste commit.
- Latere wijzigingen aan de publieke Experience, identiteit, contactroute en preview behoren tot de actuele Case 0001- en livegangwerkstroom. Zij zijn geen retroactieve uitbreiding van Sprint 002.
- De huidige preview en de nieuwe Candidate zijn nog niet gecommit of gepusht en veranderen het afgeronde sprintresultaat daarom niet.
