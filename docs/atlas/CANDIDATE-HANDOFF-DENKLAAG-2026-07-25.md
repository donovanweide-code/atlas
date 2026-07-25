# Candidate-handoff — Atlas-denklaag in de Workspace

> **Status:** implementatiecandidate voor praktijkreview
> **Datum:** 25 juli 2026
> **Gezag:** niet-canoniek
> **Grens:** geen Foundation-, Decision-, methode- of merkbesluit

## Doel

De Workspace maakt bestaande actiepunten, praktijkinzichten, onbeoordeelde waarnemingen en Horizon-ideeën op één rustige plek zichtbaar. Donovan moet binnen enkele seconden kunnen onderscheiden:

- wat We Build And Design vandaag concreet kan doen;
- wat nog een menselijke beoordeling of expliciet besluit vraagt;
- wat bewust aan de Horizon blijft;
- wat feit, reviewresultaat, candidate of idee is.

## Bronnen

De implementatie gebruikt alleen reeds beschikbare informatie:

- `docs/atlas/PRAKTIJKREVIEW-BIJ-CEES-LEVERING-2026-07-25.md`
- `docs/atlas/sources/bij-cees/EMAIL-SCOPE-2026-01-29.md`
- `website/src/atlas-delivery-review.ts`
- lokale, contextbevestigde Waarnemingen uit `atlas.workspace.observations.v1`
- `website/docs/future/atlas-wordpress-execution-foundation.md`
- de praktijkreview van de Bij Cees Delivery Review en de daaropvolgende implementatieopdracht van 25 juli 2026

Gespreksinzichten worden uitsluitend opgenomen wanneer Donovan ze in de implementatieopdracht expliciet als bestaande reviewresultaten of candidates heeft aangewezen.

## Zichtbare indeling

### Vandaag doen

De eerste concrete actie uit de bestaande leveringsreview wordt redactioneel uitgelicht. Dit is een handmatige presentatiekeuze, geen automatische prioriteringslogica. Alle overige open leveringspunten blijven raadpleegbaar.

### Nog beoordelen

De volgende bestaande praktijkcandidates blijven herkenbaar onbevestigd:

1. **Bron versus norm** — een oorspronkelijke vraag is een historische bron; een latere bewuste wijziging kan de actuele norm veranderen.
2. **Workspace-identiteit** — We Build And Design of `wij` spreekt; `Powered by Atlas` wordt uitsluitend visueel verkend.
3. **Onderbouwde aanbevelingen** — richting zichtbaar maken zonder automatisch te beslissen.
4. **Ontbrekende actie- en ideeënlaag** — toetsen of deze implementatie het actuele werkbeeld daadwerkelijk sneller begrijpelijk maakt.

Lokale Waarnemingen met status `unreviewed` verschijnen in dezelfde beoordelingsruimte. Bij nul Waarnemingen zegt de Workspace dat expliciet.

### Horizon

**Veilige stagingcyclus** blijft een waardevolle toekomstige richting: van klantvraag naar herstelbare staging, gecontroleerde wijziging en preview vóór live. Er ontstaat geen uitvoeringsopdracht of productieverbinding.

## Belangrijkste wijzigingen

- één nieuwe sectie `Werkbeeld` vóór de bestaande Oriëntatie;
- een vaste afzender: `We Build And Design`;
- een handmatig gekozen, brongebonden actie voor vandaag;
- zichtbare status, type, bron en voorgestelde beoordeling per candidate;
- dynamische telling en weergave van lokale onbeoordeelde Waarnemingen;
- een terughoudende Horizonpresentatie;
- `Powered by Atlas` als expliciet gelabelde ontwerpverkenning.

## Bewust niet gewijzigd

- Foundation, Principles, Decisions en methode;
- de inhoud of status van de Bij Cees Delivery Review;
- bestaande Focus-, Kompas- of aanbevelingslogica;
- case-identiteit, CASE-SNAPSHOT of Oriëntatietoewijzing;
- productie, staging, monitoring of externe verbindingen;
- automatische promotie van een idee, candidate of Waarneming;
- volledige taak- of projectmanagementfunctionaliteit;
- definitieve merkarchitectuur.

## Specifieke reviewpunten

1. Is binnen enkele seconden zichtbaar wat vandaag aandacht verdient?
2. Blijft `Vandaag doen` duidelijk handmatig en brongebonden, zonder automatische autoriteit te suggereren?
3. Zijn feit, open actie, candidate, onbeoordeelde Waarneming en Horizon visueel voldoende verschillend?
4. Geeft de sectie overzicht zonder de bestaande Delivery Review of Focus te verdringen?
5. Voelt `We Build And Design` als afzender natuurlijker in ondernemersgebruik?
6. Is `Powered by Atlas` subtiel genoeg en duidelijk herkenbaar als ontwerpverkenning?
7. Is de lege Waarnemingenstatus informatief zonder onnodig aandacht te vragen?
8. Zijn de vijf gevraagde bestaande items volledig en zonder nieuwe conclusies weergegeven?

## Besluitgrens

Deze handoff vraagt uitsluitend om praktijkreview van de implementatie. Een positief resultaat canoniseert geen principe, merkkeuze, aanbevelingsmodel of stagingarchitectuur. Iedere dergelijke vervolgstap vereist een afzonderlijke candidate en, waar van toepassing, expliciete GO.
