# Living Experience Online Validation V1

**Datum:** 3 augustus 2026  
**Deploymentstatus:** **GO — online beschikbaar voor Donovan**  
**Formele device-validatie:** **OPEN — echte Edge-, Safari- en mobiele Chrome-apparaten nog door Donovan te beoordelen**  
**Volgende ontwikkelstroom:** HOLD; geen Research Tracks vóór expliciete GO

## Deployment Report

Living Experience Research Loop V1 is uitsluitend naar de afzonderlijke Experience-omgeving gepubliceerd:

- adres: <https://experience.webuildanddesign.nl/ervaar>;
- actieve DocumentRoot: `/sites/wbd-experience-20260803-bal5fhm5`;
- directe applicatierollback: `/sites/wbd-experience-20260803-cjgeeoit`;
- Experience-versie voor nieuwe sessies: `4.0-living-research-loop-v1`;
- frontend: `assets/experience-BalFhCM5.js`;
- stylesheet: `assets/experience-wxplbVNI.css`;
- PHP: `8.2.33`; productie-API slaagde voor `php -l`;
- database: MySQL `8.0.36-28`;
- geen schemawijziging en geen migratie uitgevoerd.

Het lokale en server-side releasearchief is:

`experience-documentroot-20260803-bal5fhm5.tar.gz`

- omvang: 32.303 bytes;
- SHA-256: `EF115EC015FC72B8A12ED700B06B36C82D7A78D1D4A3EB0E1C3BF353FD33B428`.

De belangrijkste lokale, server-side en live hashes zijn exact gelijk:

| Bestand | SHA-256 |
| --- | --- |
| `assets/experience-BalFhCM5.js` | `29FA1A34FA0571C3AC32B88CF69BF1347AADCC19DFF5C5EF69DAC5759E20AE2B` |
| `assets/experience-wxplbVNI.css` | `2AB203C7252D81CDCE4022D0C5CF0D095144C9F9E3115D4DCB9D6D8AE9E8C782` |
| `api/index.php` | `D6438930AAA2ECCEAD55D98E03E56878EE33BC3F49F80082B9A7FD78EE871EE9` |
| `.htaccess` | `0679AE701DF29F213F3F4D6F50DF28CBA5D5E9230BC8C5FAAAAE29593147A240` |

De TransIP-wissel had circa drie minuten propagatietijd. In dat venster bleef de vorige gezonde release zichtbaar. Er is pas GO gegeven nadat de live HTML het nieuwe asset aanwees en de gedownloade live hashes overeenkwamen.

### Buildcontrole

- tests: **160/160 geslaagd**;
- TypeScript: geslaagd;
- Experience-build: geslaagd;
- public-only build: geslaagd; 29 bestanden en 9 tekstbestanden gecontroleerd;
- geen code of functionaliteit toegevoegd tijdens deze deploymentopdracht.

## Beveiliging en hosting

- HTTP wordt permanent naar HTTPS omgeleid;
- HTTPS geeft 200 over IPv4 én IPv6;
- HSTS: `max-age=31536000`;
- `Cache-Control: no-store` op Experience-HTML;
- `X-Robots-Tag`: `noindex, nofollow, noarchive, nosnippet, noimageindex`;
- HTML bevat dezelfde robotsgrens;
- `robots.txt` bevat `Disallow: /`;
- `sitemap.xml` geeft 404;
- CSP, frameblokkering, `nosniff`, `no-referrer` en beperkte Permissions Policy zijn actief;
- het servererrorlog bevat geen nieuwe Experience-fout sinds de release.

De zichtbare recente servermeldingen betroffen uitsluitend geblokkeerde WordPress-scans op de afzonderlijke publieke host, niet de Experience.

## Sessies, compatibiliteit en Observatory-opslag

Voor de release bevatte de database acht sessies:

- één `2.0-validation-v1`;
- vijf `2.1-organic-entry-v1`;
- twee `3.0-conversation-insight-v1`.

Na herstel, definitieve acceptatie en intrekking van de technische link bevat de eindstaat:

- dezelfde acht oorspronkelijke sessies, met exact dezelfde versieverdeling;
- één ingetrokken technische `4.0-living-research-loop-v1`-sessie;
- twee antwoorden in die 4.0-sessie;
- herkenning en afronding als betekenisvolle events;
- de ene bestaande uitnodiging met status `created` bleef bestaan.

Eindstand: negen sessies, waarvan precies één 4.0-auditsessie. De centrale MySQL-opslag en de gegevens waarop het Observatory draait, zijn daarmee aantoonbaar actief. De technische uitnodiging is ingetrokken; het token geeft geen toegang meer en toont geen deelnemersgegevens.

## Gegevensincident tijdens acceptatie en herstel

Tijdens de technische bewijsarme organische flow is via de expliciete verwijderknop testdata opgeruimd. De daaropvolgende geaggregeerde controle liet onverwacht één bestaande 3.0-sessie minder zien. De nieuwe 4.0-sessie stond nog wel intact. Dit is direct als onacceptabele afwijking behandeld.

De exacte oorzaak is niet bewezen. De waarschijnlijke richting is een oude deelnemerscontext in het hergebruikte browserprofiel, gecombineerd met één generieke participantcookie en de bestaande `participant/session`-verwijderroute. Er wordt geen definitieve oorzaak geclaimd.

Herstel:

1. De afwijkende validatiestand is afzonderlijk veiliggesteld.
2. De volledige pre-releaseback-up is op SHA-256 gecontroleerd.
3. De database is volledig uit die back-up hersteld.
4. Alle oorspronkelijke tellingen kwamen exact terug: acht sessies, 22 antwoorden, zes reflecties, twee feedbackrecords en 95 events.
5. Daarna is een nieuwe persoonlijke technische 4.0-sessie zonder delete-actie doorlopen.
6. De eindstaat bevestigt alle acht oorspronkelijke sessies plus de nieuwe 4.0-audit.

Dit herstel is niet alleen voorbereid maar daadwerkelijk succesvol uitgevoerd. Totdat de verwijdercontext afzonderlijk is onderzocht, hoort sessieverwijdering in een hergebruikt browserprofiel niet bij externe validatie.

## Browser Acceptance Report

### Desktop Chromium — 1440 × 1000

Online gecontroleerd:

- algemene ingang en branding;
- actieve invoer en focusstatus;
- bewijsarme route via **Ik weet het nog niet**;
- geen observatie wanneer bewijs ontbreekt;
- refresh en hervatten op exact hetzelfde luistermoment;
- vrijwillig stoppen;
- volledige bewijsrijke persoonlijke route;
- letterlijke herkomst van de verhelderingsvraag;
- samenvatting met twee eigen bijdragen;
- voorzichtige observatie;
- correctie via **Ik zie het anders**;
- rustige landing en stoppen;
- ingetrokken persoonlijke link toont geen inhoud;
- browserconsole: geen warnings of errors.

### Browserverdeling

De geautomatiseerde echte-browseracceptatie is uitgevoerd in de beschikbare in-app Chromium-browser. Daardoor zijn Chrome-compatibiliteit en Chromium-gedrag inhoudelijk gedekt, maar niet als afzonderlijke geïnstalleerde Chrome- en Edge-processen.

Apple Safari is in deze Windows-omgeving niet beschikbaar. Formele acceptatie op desktop Edge, mobiele Safari en mobiele Chrome blijft daarom een echte-apparatencheck door Donovan. Er wordt geen Safari- of Edge-resultaat gefingeerd.

## Mobile Validation Report

De online flow is op een viewport van 390 × 844 pixels doorlopen.

- geen horizontale overflow: viewport 390 px, documentbreedte 375 px;
- alle zichtbare actieknoppen op de landing waren 44 px hoog;
- invoerveld, focusrand, placeholder en tekstcontrast bleven zichtbaar;
- CTA's vulden mobiel de beschikbare breedte;
- scrollen door samenvatting, observatie en correctielanding werkte;
- volledige onderzoekslus, refresh, landing en stoppen werkten;
- geen browserconsolefouten.

Niet geclaimd: gedrag van een echt iOS- of Android-toetsenbord. Dit moet Donovan op zijn eigen telefoon beoordelen.

## Brand en visuele controle

De online HTML, JavaScript en CSS zijn hash-identiek aan de lokaal goedgekeurde candidate. Daarmee gebruikt online exact dezelfde:

- W/BD-beeldmerk en woordmerk;
- headerpositie;
- typografie;
- kleuren;
- spacing en visuele hiërarchie;
- actieve invoerstatus;
- mobiele CTA-stijl.

Er is geen redesign uitgevoerd. De publieke website serveert na de Experience-release nog steeds ongewijzigd:

- `assets/index-BqT0vFtt.js`;
- `assets/index-Bs6nUoIy.css`.

De publieke DocumentRoot is niet gewijzigd.

## Loose Ends Review

Deze punten zijn uitsluitend gedocumenteerd en niet tijdens de deployment opgelost.

### P1 — verwijdercontext moet afzonderlijk worden onderzocht

De onverwachte verwijdering van één oudere 3.0-sessie tijdens het opruimen van een nieuwe organische testsessie toont dat de actieve deelnemerscontext bij verwijderen niet blind vertrouwd mag worden in een hergebruikt browserprofiel. De data is volledig hersteld. Voor een volgende versie moet eerst worden bewezen dat de bevestiging zichtbaar de juiste Experience identificeert en dat de API exact diezelfde sessie begrensd verwijdert.

### P1 — organische verwijderlanding gebruikt persoonlijke taal

Na verwijderen van een organische sessie verscheen:

> Persoonlijke uitnodiging — Deze uitnodiging is niet meer actief.

Ook opnieuw openen van `/ervaar` bleef in die toestand. Dat sluit niet aan bij een algemene organische ingang en verhindert een natuurlijke nieuwe start op hetzelfde apparaat.

### P2 — correctie opslaan geeft geen zichtbare bevestiging

Na **Neem deze gedachte mee** bleef het correctiescherm visueel vrijwel gelijk. De opslag werkte, maar de deelnemer kan twijfelen of de actie is gelukt. Een rustige bevestiging is wenselijk, zonder automatisch door te sturen.

### P2 — herhaalde keuze na correctie

Na **Ik zie het anders** verschijnt onder **Mogelijke verdieping** opnieuw een actie **Ik zie het anders**. Dat voelt dubbel en maakt de vervolgkeuze minder helder.

### P2 — nieuwe deelnemer ontbreekt op voltooide organische landing

Een voltooide organische sessie toont geen directe **Ik ben iemand anders**-actie. Op een gedeeld apparaat is een nieuwe natuurlijke start daardoor niet bereikbaar vanuit de eindtoestand.

### P3 — afsluiting voelt nog deels als de vorige Experience

De afsluiting noemt direct website, webshop, procesverbetering, intern systeem en maatwerksoftware en bevat een contactlink. Dit is inhoudelijk correct voor We Build And Design, maar voelt sterker verklarend en commerciëler dan de voorafgaande Living Experience. Beoordeel tijdens praktijkvalidatie of dit aansluit bij wat iemand op dat moment verwacht.

### Bevestigde afwezigheid

- geen zichtbare verwijzing naar **vier korte momenten** aangetroffen;
- geen dashboard-, AI-, Atlas Engine- of Repository-taal in de deelnemersflow;
- de bestaande geheugensteunen blijven zichtbaar, maar zijn ondersteunend en niet voorschrijvend;
- geen onlogische sprong naar Research Tracks of meerdere actieve sporen.

## Screenshots

Desktop:

- `output/living-experience-online-validation-v1/desktop-online-welcome.png`
- `output/living-experience-online-validation-v1/desktop-online-active-input.png`
- `output/living-experience-online-validation-v1/desktop-online-insufficient-evidence.png`

Mobiel:

- `output/living-experience-online-validation-v1/mobile-online-welcome.png`
- `output/living-experience-online-validation-v1/mobile-online-active-input.png`
- `output/living-experience-online-validation-v1/mobile-online-listening.png`
- `output/living-experience-online-validation-v1/mobile-online-grounded-follow-up.png`
- `output/living-experience-online-validation-v1/mobile-online-summary.png`
- `output/living-experience-online-validation-v1/mobile-online-observation.png`
- `output/living-experience-online-validation-v1/mobile-online-correction-landing.png`
- `output/living-experience-online-validation-v1/mobile-online-completed.png`

## Rollbackbevestiging

### Applicatie

Zet uitsluitend de DocumentRoot van `experience.webuildanddesign.nl` terug van:

`/sites/wbd-experience-20260803-bal5fhm5`

naar:

`/sites/wbd-experience-20260803-cjgeeoit`

De vorige map is ongewijzigd aanwezig. De publieke website wordt daarbij niet aangeraakt.

### Database

Omdat deze release geen schemawijziging bevat, is voor een normale applicatierollback geen databaseherstel nodig. Voor volledig herstel blijft de pre-releaseback-up beschikbaar:

- pad: `tmp/experience-before-living-research-loop-20260803-194500.sql`;
- rechten: `0600`;
- omvang: 40.205 bytes;
- SHA-256: `41D5BBB4D89917CFCE3F3CAF811669540CF4B6DE71AF0DD22716F5C30E486CAB`.

De herstelprocedure is tijdens deze opdracht succesvol bewezen.

## Beveiligingsopruiming

- beide tijdelijke TransIP SSH-sleutels zijn verwijderd;
- TransIP toont **Geen SSH-key**;
- een aansluitende SSH-poging is geweigerd;
- tijdelijke serverhelpers zijn verwijderd;
- het releasearchief, de actieve map, rollbackmap en pre-releaseback-up zijn behouden;
- de werkende lokale privésleutel en public key zijn verwijderd.

Eén eerste, nooit door de server geaccepteerde lokale privésleutelkopie staat nog in:

`C:\Users\donov\Documents\Atlas\.codex-tmp\living-online-validation-v1\transip-deploy-ed25519`

Door een te strakke Windows-ACL tijdens de eerste mislukte sleuteltest kan de Codex-sandbox dit bestand niet meer verwijderen. De corresponderende TransIP-public key is verwijderd, waardoor het bestand geen deploytoegang meer geeft. Donovan kan het lokaal als eigenaar verwijderen met:

```powershell
icacls "C:\Users\donov\Documents\Atlas\.codex-tmp\living-online-validation-v1\transip-deploy-ed25519" /reset
Remove-Item -LiteralPath "C:\Users\donov\Documents\Atlas\.codex-tmp\living-online-validation-v1" -Recurse -Force
```

## Besluit

De Living Experience staat veilig online en is klaar om door Donovan op eigen apparaten inhoudelijk te worden ervaren. De deployment en rollback zijn GO. De formele cross-browser/device-acceptatie blijft open totdat Donovan desktop Edge, mobiele Safari en mobiele Chrome op echte apparaten heeft beoordeeld.

Er wordt nu niets verder gebouwd. **Living Experience — Research Tracks blijft HOLD tot expliciete GO.**
