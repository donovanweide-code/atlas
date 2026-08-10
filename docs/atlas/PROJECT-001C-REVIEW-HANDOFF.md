# Project 001C — geïntegreerde reviewkandidaat

**Status:** klaar voor één gezamenlijke review. Dit document geeft nadrukkelijk
geen GO en start Project 002 niet.

## 1. Uitkomst

Website, publieke Experience, WBD Workspace en Atlas Workspace zijn als één
ontwerpfamilie gepolijst. De gedeelde richting is warm donkergroen/blauw,
crème, terughoudend goud, rustig ritme en duidelijke focus. De publieke
omgeving blijft menselijk en WBD-gedreven; Atlas blijft daar onzichtbaar als
onderliggende denkwijze. Bestaande inhoud, workflows en gevalideerde grenzen
zijn behouden.

De inspectiebasis en bekende reviewpunten staan in
[`PROJECT-001C-INSPECTION.md`](./PROJECT-001C-INSPECTION.md).

## 2. Gedeelde ontwerpbasis

De semantische basis staat centraal in `website/src/styles/variables.css`:

- nacht, diep nachtgroen en zacht groen voor dragende donkere vlakken;
- crème, helder crème en gedempt crème voor rust, focus en leesvlakken;
- goud en sterker goud uitsluitend voor richting en betekenisvolle aandacht;
- gedeelde tekst-, lijn-, focus-, radius-, schaduw-, lettertype- en
  inhoudsbreedtetokens;
- één zichtbare focuskleur en consistente `:focus-visible`-behandeling.

De basis wordt gebruikt door de publieke site, Experience en beide Workspaces.
Crème is bewust lokaal ingezet: de Experience-transparantie, de actieve
ontwikkelmonitor in WBD, de rustige WBD-grens en het primaire Atlas-focusvlak.
De pagina's zijn daardoor lichter en ademender zonder overal licht te worden.

## 3. Publieke website

- De sterke hero-opbouw is behouden.
- De eerste viewport benoemt nu expliciet websites en digitale werkplekken.
- De route blijft beginnen bij begrip en dagelijkse praktijk, niet bij
  technologie of een productpitch.
- Navigatie, mobiele menuweergave, routehiërarchie en publieke buildgrens zijn
  opnieuw gecontroleerd.
- De afwijkende tekstuele `WBD.`-lock-up is verwijderd; de officiële
  `W / BD`-opbouw wordt ook in de contactsectie gebruikt.

## 4. Publieke Experience

- Publiek zichtbare Atlas-taal is verwijderd en vervangen door rustige,
  menselijke WBD-taal.
- De Experience blijft een eerste ontmoeting: geen intakeformulier, AI-demo,
  diagnose of vaste vragenlijst.
- Transparantie en privacy hebben een zacht crème rustvlak gekregen.
- Actieve invoer, keuze, feedback en tekstacties hebben sterker en consistenter
  focuscontrast.
- Feedback-, verwijder-, vertrek- en bewerkdialogen hebben nu ieder een
  programmatische toegankelijke naam.
- De persoonlijke uitnodigingsroute, opslaggrenzen en afgeschermde build blijven
  intact.

## 5. WBD Workspace

- De bestaande sterke hero blijft het visuele anker.
- Project 001C staat als actuele werkstroom centraal; 001A/001B blijven
  afgerond en Project 002 blijft hierna.
- De Ontwikkelmonitor is het beheerste crème accent; overige kaarten blijven
  donker en rustig.
- Formulieren en focusstaten sluiten aan op dezelfde semantische basis.
- Desktop, tablet en mobiel gebruiken dezelfde rustige tweelaagse
  navigatiestructuur, zonder documentbrede horizontale overflow.

### Workspace-consistentie

- De WBD Workspace en Workspace-wisselaar gebruiken dezelfde officiële
  `W / BD`-logo-opbouw als de publieke website; de eerdere ronde `W`-variant is
  vervallen.
- De navigatie accepteert technisch een optioneel, menselijk
  `attentionLabel`, maar er is nu geen enkel aandachtspunt geactiveerd.
- Een toekomstige markering is ontworpen als kleine ongevulde goudlijn/dot met
  een menselijke tekst, niet als rode badge, ongelezen teller of notificatie.
- Op tablet en mobiel blijft zo'n toekomstige markering bewust verborgen totdat
  een afzonderlijke inhoudelijke en responsive beoordeling plaatsvindt.

## 6. Atlas Workspace

- De opening is teruggebracht tot huidige aandacht, reden en actieve
  werkstroom.
- Reviewdatum en terugkeertrigger zijn naar optionele verdieping verplaatst.
- Het kompas ondersteunt de richting, maar concurreert niet meer met de kern.
- Het primaire focusvlak is crème en daardoor binnen de mobiele eerste viewport
  direct herkenbaar; Horizon en Stilte blijven rustiger.
- Project 002 blijft na deze polish en is inhoudelijk niet gestart.

## 7. Module Experience-standaard

De herbruikbare ontwerp- en inhoudsstandaard staat in
[`MODULE-EXPERIENCE-STANDARD-V1.md`](./MODULE-EXPERIENCE-STANDARD-V1.md).
Die beschrijft opbouw, componentrollen, contentmodel, responsive gedrag,
toegankelijkheid en hergebruik voor een mogelijke latere Experience Engine.
Er is geen engine of nieuwe modulefunctionaliteit gebouwd.

## 8. Bewust niet gedaan

- geen GO, commit, merge, push of livegang;
- geen start of inhoudelijke uitwerking van Project 002;
- geen Experience Engine, intakeflow of AI-productpresentatie;
- geen connectors, monitoring, notificaties, badges of tellers;
- geen herontwerp vanaf nul en geen wijziging van gevalideerde bedrijfsdata,
  factuurlogica, casegrenzen of privacy-/opslagarchitectuur.

## 9. Browser- en toegankelijkheidscontrole

Handmatig in de in-app browser gecontroleerd:

- 11 publieke routes op 1440 px en 390 px: één `h1`, unieke titel, skiplink,
  geen lege links, geen kapotte afbeeldingen en geen documentoverflow;
- alle 8 WBD-hoofdroutes op desktop en mobiel: één `h1`, gelabelde
  formuliervelden en geen documentoverflow;
- de vier hoofdoppervlakken op 1440×900, 820×1180 en 390×844;
- mobiel hoofdmenu: zes bereikbare links, passend binnen de viewport;
- Experience-feedbackdialoog op mobiel: passend, geen interne horizontale
  overflow, drie expliciet gelabelde tekstvelden en een toegankelijke
  dialoognaam;
- zichtbare focusstaat van het primaire Experience-tekstveld;
- geen browserconsolefouten in de definitieve gecontroleerde route;
- `prefers-reduced-motion` blijft aanwezig en wordt door regressietests bewaakt.

De responsive controle liet op geen van de vier hoofdoppervlakken
documentbrede horizontale overflow zien. Interne Workspace-navigatie mag op
kleine schermen horizontaal schuiven en verbergt daarbij bewust de native
scrollbar.

## 10. Tests en builds

- `npm.cmd test` — **206/206 geslaagd**;
- `npm.cmd run build` — **geslaagd**;
- publieke buildgrens — **29 bestanden en 9 tekstbestanden gecontroleerd**;
- `npm.cmd run build:experience` — **geslaagd**;
- `git diff --check` — **geslaagd** (alleen bestaande Windows
  LF/CRLF-waarschuwingen).

## 11. Voor/na-beelden

| Omgeving | Voor | Na |
| --- | --- | --- |
| Website desktop | [`home-desktop.png`](../../output/project-001c/screenshots/before/home-desktop.png) | [`home-desktop.png`](../../output/project-001c/screenshots/after/home-desktop.png) |
| Experience desktop | [`experience-invitation-desktop.png`](../../output/project-001c/screenshots/before/experience-invitation-desktop.png) | [`experience-desktop.png`](../../output/project-001c/screenshots/after/experience-desktop.png) |
| WBD Workspace desktop | [`wbd-workspace-desktop.png`](../../output/project-001c/screenshots/before/wbd-workspace-desktop.png) | [`wbd-workspace-desktop.png`](../../output/project-001c/screenshots/after/wbd-workspace-desktop.png) |
| Atlas Workspace desktop | [`atlas-workspace-desktop.png`](../../output/project-001c/screenshots/before/atlas-workspace-desktop.png) | [`atlas-workspace-desktop.png`](../../output/project-001c/screenshots/after/atlas-workspace-desktop.png) |
| Website mobiel | [`home-mobile.png`](../../output/project-001c/screenshots/before/home-mobile.png) | [`home-mobile.png`](../../output/project-001c/screenshots/after/home-mobile.png) |
| Experience mobiel | [`experience-mobile.png`](../../output/project-001c/screenshots/before/experience-mobile.png) | [`experience-mobile.png`](../../output/project-001c/screenshots/after/experience-mobile.png) |
| WBD Workspace mobiel | [`wbd-workspace-mobile.png`](../../output/project-001c/screenshots/before/wbd-workspace-mobile.png) | [`wbd-workspace-mobile.png`](../../output/project-001c/screenshots/after/wbd-workspace-mobile.png) |
| Atlas Workspace mobiel | [`atlas-workspace-mobile.png`](../../output/project-001c/screenshots/before/atlas-workspace-mobile.png) | [`atlas-workspace-mobile.png`](../../output/project-001c/screenshots/after/atlas-workspace-mobile.png) |

Aanvullende na-beelden op tablet staan in dezelfde `after`-map. De expliciete
Experience-focuscontrole staat in `experience-focus-desktop.png`.

## 12. Gewijzigde polishbestanden

Belangrijkste bronbestanden:

- `website/src/styles/variables.css`
- `website/src/styles/main.css`
- `website/src/styles/experience-workspace.css`
- `website/src/styles/atlas-workspace.css`
- `website/src/styles/wbd-foundation.css`
- `website/src/main.ts`
- `website/src/public-pages.ts`
- `website/src/experience-workspace.ts`
- `website/src/workspace-config.ts`
- `website/src/workspace-shell.ts`
- `website/src/atlas-daily-brief.ts`
- `website/src/atlas-workspace.ts`
- `website/src/wbd-foundation-data.ts`
- `website/src/wbd-foundation.ts`
- bijbehorende regressietests in `website/tests/`.

## 13. Review en stap na GO

De eerstvolgende stap is één geïntegreerde menselijke review op samenhang,
rust, crèmebalans, tekstkracht en responsive gevoel. Kleine aanwijzingen zoals
“hero rustiger”, “hier meer crème” of “deze tekst sterker” blijven normale
reviewpunten binnen Project 001C.

Pas na expliciete GO volgt: wijzigingen finaliseren, commit/merge voorbereiden,
publieke en afgeschermde releasegrenzen nog eenmaal controleren en daarna live
brengen volgens de bestaande releaseprocedure.
