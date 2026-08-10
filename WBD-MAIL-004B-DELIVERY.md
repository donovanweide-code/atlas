# WBD MAIL 004B — Delivery

Datum: 9 augustus 2026  
Basis: `WBD MAIL FOUNDATION 003B - CONTROLLED SMTP VALIDATED`  
Status: lokaal geïmplementeerd en gevalideerd; beide controlled SMTP-tests zijn geaccepteerd; menselijke inbox- en visuele acceptatie is bevestigd.

## Goedgekeurde beslissingen

- De algemene en factuurmail gebruiken één compacte, herbruikbare WBD-mailshell.
- `WBD_GENERAL` behoudt de afzender `We Build And Design <info@webuildanddesign.nl>`, een persoonlijke aanhef en de Donovan-handtekening.
- `WBD_INVOICE` behoudt `We Build And Design Facturen <facturen@webuildanddesign.nl>` en het onderwerppatroon `Factuur {{invoice.number}} - {{invoice.project}}`.
- De factuurmail heeft geen CTA. Factuurnummer, project, bedrag, betaaltermijn en vervaldatum zijn scanbaar.
- De bestaande factuur-PDF blijft ongewijzigd.
- De transport-, allowlist-, idempotency-, failure-, audit-, history-, observability- en bijlageveiligheid van 003B zijn niet vervangen.

## Organization Brand Foundation

De minimale organisatieconfiguratie bevat `organization_id`, het kleuren- en typografieprofiel, logoreferenties en metadata voor status, gebruikstype, updater, datum, versie en authority references.

Assetreferenties zijn beperkt tot een server-controlled `cid:brand-<organization>-…` of `/assets/organizations/<organization>/…`. Traversal, backslashes en willekeurige lokale paden worden geweigerd. De frontend kiest geen filesystempad.

## WBD-brandconfig

- Nachtgroen: `#08161A`
- Crème: `#F7F4EE`
- Goudaccent: `#C7A166`
- Bodytekst: `#17221F`
- Headings: `Georgia, "Times New Roman", serif`
- Body: `Arial, Helvetica, sans-serif`
- Configversie: `WBD-BRAND-FOUNDATION-001`

De generieke Mail Engine bevat geen WBD-brandwaarden. De WBD-template vraagt de configuratie op via de organization registry.

## Logoprovenance en fallback

Repositoryonderzoek vond het W/BD-beeldmerk als gereconstrueerde HTML/CSS-vorm en als getekende factuur-PDF-vorm, maar geen zelfstandig goedgekeurd officieel bronbestand dat veilig als mailasset kan worden afgeleid.

- `WBD OFFICIAL LOGO SOURCE CONFIRMED: NO`
- `WBD MAIL-SAFE LOGO READY: FALLBACK_USED`
- `LOGO ASSET BLOCKED`

Er is geen logo ontworpen, nagetekend of als nieuwe merkvariant geëxporteerd. De e-mail blijft volledig begrijpelijk met de tekstfallback “We Build And Design”.

## Herbruikbare mailshell

De shell bevat hidden preheader, compacte header, hoofdcontent, optioneel feitenblok, optionele enkele veilige actie, afsluiting en compacte contactfooter. De implementatie gebruikt presentatietabellen, inline CSS, circa 600px maximale breedte, minimaal 16px bodytekst, system-font fallbacks en geen JavaScript of externe fonts.

Een optionele actielink accepteert uitsluitend `https:` of een veilige root-relative applicatieroute. In 004B gebruiken zowel de algemene mail als de factuurmail geen CTA.

## Templates en plain text

`WBD_GENERAL_SMTP_TEST` versie 2 gebruikt afzonderlijke contextvelden voor onderwerp, preheader, heading, aanleiding, kernboodschap en volgende stap. Het onderwerp kan daardoor natuurlijk per werkelijk berichtdoel worden ingevuld. De handtekening is Donovan, We Build And Design, `info@webuildanddesign.nl`, `webuildanddesign.nl`.

`WBD_INVOICE_FINAL` versie 2 toont factuurnummer, project, bedrag, betaaltermijn en berekende vervaldatum. De mail verwijst naar de PDF-bijlage en vermeldt dat betaalgegevens op de factuur staan. De handtekening gebruikt `facturen@webuildanddesign.nl`.

Beide templates hebben een inhoudelijk gelijkwaardige plain-textversie zonder HTML-afhankelijke betekenis.

## Bestaande factuur-PDF

Bron: `output/pdf/sent/mail-foundation-003-review.pdf`

- SHA-256 vóór 004B-rendering: `8c1eb5550064da4fe777e34697a60018eefd4834fa4ed667b27b81561db8fb1b`
- SHA-256 na 004B-rendering: `8c1eb5550064da4fe777e34697a60018eefd4834fa4ed667b27b81561db8fb1b`
- Gewijzigd: `NO`

## Client-safe review

Desktop en een 390px mobiele mailviewport zijn lokaal in de browser gerenderd. Het feitenblok blijft leesbaar, informatie stapelt logisch, er is geen horizontale overflow en afbeeldingen zijn niet nodig voor begrip. De tabelgebaseerde inline structuur is geschikt als veilige basis voor Outlook desktop/web, Gmail web/mobiel en Apple Mail/iOS Mail; definitieve clientacceptatie blijft menselijk.

Screenshots: `output/mail-foundation-004b-review/`  
Primaire review: `output/pdf/WBD-MAIL-004B-IMPLEMENTATION-REVIEW.pdf`

## Atlas Sync-boundary

Een toekomstige Atlas Sync mag de organization-brandcontext lezen als herleidbare context: officiële asset, status, toepassing, kleuren, typografie, authority reference en retired-versie. Atlas mag geen asset of merkconfig autonoom goedkeuren, vervangen, bewerken of publiceren. Deze ronde bouwt geen Atlas-runtime.

## Toekomstige Workspace Admin-boundary

Een latere, expliciet goedgekeurde route `Admin → Organisatie → Huisstijl` kan dezelfde bron beheren voor logo’s, kleuren, typografie, mailassets, documentassets, app-iconen, richtlijnen, status en versie. Deze ronde bevat geen assetmanager, uploadflow, documentbibliotheek, CDN of klanteditor.

## Sportpaleis-compatibiliteit

De registry is per organisatie en ondersteunt later een afzonderlijke Sportpaleis-config met officiële logo’s, mailasset, Workspace-branding, kleuren, typografie, CID Manual en assetversies. Er is nu geen Sportpaleis-branddata of -maildesign toegevoegd. Sportpaleis SMTP is niet benaderd.

## Tests

- Volledige regressiesuite: `386/386 PASS` (baseline `378/378`).
- Nieuwe 004B-tests: `8/8 PASS`.
- Getest: brand load, tekstfallback, kleuren/fonts, beide shells, plain text, feitenblok, CTA-afwezigheid, sender routing, PDF-hash, HTML-escaping, onveilige URL, asset path safety en organization separation.
- De bestaande 003B transporttests voor allowlist, idempotency, failures, audit/history, observability en attachment safety blijven groen.

## Controlled SMTP-status

- Algemene echte testmail: precies één poging, `SMTP_ACCEPTED`, niet-duplicate en met transportreferentie.
- Factuurtestmail: precies één poging, `SMTP_ACCEPTED`, niet-duplicate, met transportreferentie en precies één PDF-bijlage.
- Persisted 004B-state: twee attempts, twee acceptaties, nul duplicates en nul attention states.
- Ontvanger: uitsluitend de bestaande ene allowlisted eigen testontvanger.
- Er is geen automatische retry uitgevoerd.
- Startscript: `website/scripts/Start-ControlledWbdMail004BReview.ps1`.

## Menselijke acceptatie

Op 9 augustus 2026 heeft Donovan met “alles akkoord” bevestigd:

- beide testmails zijn in de inbox ontvangen;
- de algemene mail ziet er correct uit, inclusief mobiel;
- de factuurmail en het feitenblok zien er correct uit, inclusief mobiel;
- de TEST-003-PDF opent correct en is leesbaar;
- afzenders, onderwerpen en beide handtekeningen kloppen.

Deze acceptatie maakt 004B gereed voor een afzonderlijk productiebesluit. Er is niet gedeployed en er is geen productie-SMTP geactiveerd.

## Blockers

- `LOGO ASSET BLOCKED`: een aantoonbaar goedgekeurd zelfstandig officieel WBD-bronlogo ontbreekt.
- De menselijk geaccepteerde tekstfallback blijft actief totdat een goedgekeurd officieel bronlogo beschikbaar is.
- Niet gedeployed; productieactivering vereist een afzonderlijk besluit.
