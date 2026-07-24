# Case 0001 — We Build And Design

- **Relatie:** We Build And Design
- **Status:** Actief
- **Doel:** De bewezen identiteit, publieke website en werkelijke manier van samenwerken laten samenvallen zonder de Horizon als bestaande dienstverlening te verkopen.
- **Actuele positie:** We Build And Design heeft scherper gekregen wie het vandaag helpt: ondernemers die goed zijn in hun vak, maar de eerste professionele stap online groot en onbekend vinden. De bewezen waarde zit in luisteren, begrijpelijk begeleiden, visueel vertalen en bereikbaar blijven.
- **Werkelijke onzekerheid:** De persoonlijke start is bewezen, maar langdurige en proactieve digitale begeleiding is nog niet structureel georganiseerd. Ook prijsstelling, uren, grenzen en specialistische kennis vragen verdere ontwikkeling.
- **Actieve beslissing:** De website blijft de bewezen publieke dienst. Atlas blijft de interne methode en wordt niet publiek als product of bestaande klantdienst gepresenteerd.
- **Volgende betekenisvolle stap:** Beoordeel de gesynchroniseerde Candidate en de volledige staged diff. Redactionele bevestiging, commit, push en livegang blijven daarna afzonderlijke ondernemersbesluiten.

## Redactionele bronnen

- [WE_BUILD_AND_DESIGN_ORIGIN.md](WE_BUILD_AND_DESIGN_ORIGIN.md) — de directe ondernemersreflectie, inclusief kwetsbaarheden en bewijsgrenzen.
- [WE_BUILD_AND_DESIGN_IDENTITY.md](WE_BUILD_AND_DESIGN_IDENTITY.md) — de compacte identiteit van vandaag, gescheiden van Horizon en onzekerheid.
- [PUBLIC-EXPERIENCE-AUDIT-2026-07-23.md](PUBLIC-EXPERIENCE-AUDIT-2026-07-23.md) — toets van de huidige publieke Experience en het begrensde sprintvoorstel.
- [PUBLIC_BUSINESS_AND_CONTACT.md](PUBLIC_BUSINESS_AND_CONTACT.md) — de door Donovan bevestigde publieke bedrijfs- en contactgegevens.
- [CASE-SNAPSHOT.json](CASE-SNAPSHOT.json) — de versiegebonden redactionele momentopname. Revision 2 is Candidate en blijft buiten de Workspace totdat Donovan haar afzonderlijk bevestigt.

## Bevestigde technische werkelijkheid

- De nieuwe public-only Experience is geïsoleerd gepubliceerd op `https://preview.webuildanddesign.nl`.
- De preview gebruikt een eigen DocumentRoot onder `/subsites/preview.webuildanddesign.nl`.
- De bestaande WordPress-installatie onder `/www`, de database en het hoofddomein zijn tijdens de previewvoorbereiding onaangeraakt gebleven.
- De daadwerkelijke vervanging van de onderhoudspagina op `https://webuildanddesign.nl` blijft een afzonderlijk ondernemersbesluit.
- Git bewaart de publieke bron, casecontext en het casebeeld als afzonderlijk herleidbare geschiedenissen. Een commit bewijst duurzaamheid, maar bevestigt geen Candidate en publiceert niets naar preview of live.
- De preview is inhoudelijk en functioneel met de lokale releasebuild vergeleken. Er bestaat nog geen duurzaam deploymentmanifest of artefacthash die de preview exact aan één commit koppelt.

## Werkstromen

### We Build And Design — Referentieomgeving

- **Status:** Actief.
- **Lokaal oordeel:** NO GO als professionele referentieomgeving; beperkt GO als previewomgeving.
- **Afhankelijkheden:** Geen externe afhankelijkheden.
- **Volgende betekenisvolle stap:** Een geïsoleerde herstelproef voorbereiden en pas na afzonderlijke GO uitvoeren. `/www` en de actieve productiedatabase blijven onaangeraakt.
- **Reikwijdte:** Dit oordeel blokkeert de livegangwerkstroom, Bij Cees, andere klantcases en Atlas-ontwikkeling niet.

### We Build And Design — Livegang

- **Status:** Voorbereiding.
- **Lokaal oordeel:** NO GO voor publicatie naar de primaire publieke website; GO voor begrensde releasevoorbereiding.
- **Afhankelijkheden:** Geen externe afhankelijkheden.
- **Volgende betekenisvolle stap:** Maak na afzonderlijke GO één controleerbare releasecandidate met de ontbrekende publieke metadata, foutafhandeling, contactcontrole, publicatiechecklist en rollbackroute.

## Understanding

### Bewezen

- Klanten komen vooral via vertrouwen en via-via.
- Zij zijn vaak ervaren in hun vak, maar onzeker over de eerste professionele digitale stap.
- De website is vandaag de bewezen dienst.
- Donovan wordt gewaardeerd om luisteren, meedenken, bereikbaarheid en gewone taal.
- Het publieke e-mailadres, telefoonnummer, vestigingsadres, KvK-nummer en btw-nummer zijn rechtstreeks door Donovan bevestigd.
- Atlas is de interne methode waarmee We Build And Design beter leert begrijpen, kiezen en begeleiden.

### Horizon

Langdurige en proactieve digitale begeleiding kan de relatie na de eerste website verdiepen, maar is nog niet structureel georganiseerd of als publieke dienst bewezen.

### Open onzekerheden

- Welke bestaande projecten mogen met context en toestemming publiek als bewijs worden gebruikt?
- Welke prijs-, uren- en scopegrenzen zijn nodig voordat langdurige begeleiding verantwoord kan worden beloofd?
- Komt een testbericht via `info@webuildanddesign.nl` aantoonbaar bij Donovan aan?
- Welke releasecandidate krijgt uiteindelijk GO voor commit, push en livegang?

### Werkelijke vraag

Beschrijft de publieke Experience wat We Build And Design vandaag waarmaakt, of verkoopt zij al wat het later hoopt te worden?
