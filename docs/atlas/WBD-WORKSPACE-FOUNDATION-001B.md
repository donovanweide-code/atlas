# Project 001B — WBD Workspace Foundation

**Status:** GO / Afgerond

**Datum:** 5 augustus 2026

**Afgesloten:** 5 augustus 2026

## Doel

De interne WBD Workspace weerspiegelt de actuele bedrijfspraktijk van We Build And Design vóór de voorbereiding van een online omgeving op TransIP. Atlas blijft de onderliggende motor; de Workspace blijft de primaire dagelijkse werkplek.

## Bestaande basis en minimale integratie

Voor Project 001B waren organisatiedossiers, kennisvoorstellen, een lokale dossierback-up en de volledige factuurworkflow al aanwezig. Projecten, documenten, communicatie en tijdlijn waren deels nog als lege of verouderde hoofdingangen zichtbaar. Business Foundation opende rechtstreeks in Facturen en Sportpaleis stond in het organisatiemodel alleen als verkorte klantnaam.

De integratie brengt geen los dashboard naast de Workspace. De hoofdstructuur is teruggebracht tot betekenisvolle ingangen:

1. Overzicht;
2. Organisaties;
3. Projecten;
4. Ontwikkelpartners;
5. Ontwikkeling;
6. Business Foundation;
7. Infrastructuur;
8. Kennisvoorstellen.

De bestaande lokale back-up blijft bereikbaar vanuit Business Foundation. De factuurworkflow blijft ongewijzigd bereikbaar onder Finance.

## Project 001A officieel afgesloten

`001A — WBD Factuur Foundation` heeft de status **GO / Afgerond**.

Vastgelegd resultaat:

- herbruikbaar WBD-factuursjabloon;
- invoer vanuit de Workspace;
- inclusief- en exclusief-btwberekeningen;
- conceptopslag en opnieuw bewerken;
- definitief maken;
- server-side vergrendeling;
- verplaatsing naar Verzonden;
- PDF openen, downloaden en printen.

Eerste definitieve factuur: `F00248`.

Eerste klant en ontwikkelpartner: `Sport 2000 Sportpaleis B.V.`

Toekomstige automatiseringen behoren niet tot Project 001A. Wijziging van die workflow is alleen toegestaan wanneer regressieherstel noodzakelijk is.

## Actuele bedrijfsfundering

### Ontwikkelpartner

Sport 2000 Sportpaleis B.V. is geregistreerd als eerste officiële ontwikkelpartner voor ontwikkeling en praktijkvalidatie. De praktijkcontext is de Sportpaleis Workspace en bedrukkingsmodule. De ontwikkelpartner is geen eigenaar van de WBD- of Atlas-fundering; Experience Polish is de actieve werkstroom en Project 002 blijft hierna.

Er zijn geen ontbrekende contactpersonen, adressen of andere bedrijfsgegevens verzonnen.

### Ontwikkeling

De Ontwikkelmonitor toont uitsluitend actieve projecten, fase, laatste mijlpaal, eerstvolgende gevalideerde stap, blockers en Horizon. De Ontwikkelhistorie toont betekenisvolle bedrijfsstappen en geen technische commits. Onbekende historische datums blijven expliciet onbekend.

Feedback wordt apart van ideeën en roadmapitems bewaard en bevat organisatie, project, onderdeel, datum, status, waarneming en eventuele vervolgbeslissing. Lokale opslag staat in `data/wbd-workspace/feedback.json` en wordt uitsluitend via de Workspace-invoer bijgewerkt.

### Finance

Het financiële overzicht gebruikt de bestaande factuur-API als enige bron voor uitgaande factuurinhoud. Er is geen factuurkopie gemaakt. Handmatige betaalstatus wordt los en op factuur-id opgeslagen in `data/wbd-workspace/payment-statuses.json`.

F00248 verschijnt met:

- klant: Sport 2000 Sportpaleis B.V.;
- project: Sportpaleis Workspace en bedrukkingsmodule;
- totaal: € 331,01 inclusief btw;
- status: definitief / verzonden;
- betaling: nog handmatig te registreren.

Inkomende facturen hebben een eigen lege staat voor toekomstige leveranciers zoals TransIP en OpenAI. Er is geen import- of verwerkingslogica gebouwd.

### Workspace, modules en connectoren

De WBD Workspace is de centrale interne werkplek van We Build And Design. De factuurworkflow is de eerste praktisch gebruikte Workspace-module en bewijst daarmee de eerste concrete modulevorm.

Modules zijn de werkvorm binnen de Workspace. Connectoren zijn uitsluitend de verbinding met externe systemen; zij zijn geen module en worden niet vooruitlopend op een gevalideerde behoefte gebouwd. WBD wil modules later afzonderlijk commercieel kunnen aanbieden, maar dit legt nog geen aanbod, pakket of prijs vast.

De prijsafspraken met een ontwikkelpartner zijn niet automatisch marktprijzen. Een afzonderlijk toekomstig Value & Pricing Framework blijft nodig voordat moduleprijzen of commerciële proposities verantwoord kunnen worden vastgesteld.

### Infrastructuur

De infrastructuurpagina registreert dat de Workspace lokaal actief en nog niet online is. TransIP, monitoring, zakelijke e-mail, inkomende TransIP-informatie, back-ups, SSL en domeinen staan als voorbereiding of validatie binnen Project 002 vermeld.

## Routes

- `/workspace/wbd/overzicht`
- `/workspace/wbd/projecten`
- `/workspace/wbd/ontwikkelpartners`
- `/workspace/wbd/ontwikkeling/monitor`
- `/workspace/wbd/ontwikkeling/historie`
- `/workspace/wbd/ontwikkeling/feedback`
- `/workspace/wbd/business-foundation`
- `/workspace/wbd/business-foundation/finance`
- `/workspace/wbd/business-foundation/finance/facturen`
- `/workspace/wbd/business-foundation/finance/inkomende-facturen`
- `/workspace/wbd/business-foundation/bedrijfsgegevens`
- `/workspace/wbd/business-foundation/templates`
- `/workspace/wbd/infrastructuur`

## Roadmapgrens

Afgerond: Project 001A — WBD Factuur Foundation en Project 001B — WBD Workspace Foundation.

Actief: Experience Polish — behoud en verfijning van de bestaande Experience.

Hierna: Project 002 — WBD Infrastructure Foundation.

Project 002 en Horizon-functionaliteit zijn niet gebouwd. Er is geen SMTP, IMAP, TransIP-connector, servermonitoring, automatische factuurverzending, automatische factuurnummering, Knab-koppeling, boekhouding, betaalherkenning, boekhouderexport of andere uitgesloten automatisering toegevoegd.

Horizon blijft expliciet: Knab/bankkoppeling, automatische betaalherkenning, export en e-mail naar de boekhouder, verdere financiële automatisering en Dossier Experience. Geen van deze onderwerpen is actief werk geworden.

## Nog te bevestigen

- de exacte historische datum waarop de WBD-website live ging;
- de exacte datum waarop het ontwikkelpartnerschap en de bedrukkingsmodule startten;
- de werkelijke betaalstatus van F00248 nadat deze handmatig is gecontroleerd;

Project 001B is officieel afgesloten met **GO / Afgerond**. De opgeleverde Workspace Foundation wordt niet meer functioneel uitgebreid binnen dit project; alleen noodzakelijk regressieherstel blijft toegestaan.

## Atlas Workspace Sync — GO / Afgerond

De Atlas Workspace Sync is op 5 augustus 2026 beoordeeld en goedgekeurd als **GO / Afgerond**. Atlas en de WBD Workspace tonen dezelfde projectstatus, mijlpalen, ontwikkelpartner, module-inzichten, prijsgrens en Horizon.

De aandacht verschuift naar **Experience Polish**: visuele polish, inhoudelijke actualisatie en aansluiting op de gevalideerde WBD-werkelijkheid, met behoud van de bestaande Experience en zonder herontwerp vanaf nul. Project 002 blijft de fase hierna, is niet inhoudelijk gestart en krijgt pas na GO op Experience Polish een nieuwe afzonderlijke Codex-chat.
