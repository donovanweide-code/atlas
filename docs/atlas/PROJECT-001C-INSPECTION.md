# Project 001C — geïntegreerde polishinspectie

## Status

Nulmeting vóór de geïntegreerde polish. Dit rapport is geen GO, geen redesignbesluit en geen start van Project 002.

## Reikwijdte en uitgangspunt

Geïnspecteerd zijn de publieke website, de afgeschermde publieke Experience, de WBD Workspace, de Atlas Workspace, hun gedeelde shell, designvariabelen, responsive gedrag, tests, builds en de bestaande reviewdocumentatie. De bestaande routes, informatiearchitectuur, workflows en gevalideerde Experience blijven het vertrekpunt.

## Wat al gedeeld wordt

- De publieke website en publieke hoofdstukken delen `main.css`, `atlas-expedition.css`, `public-pages.css`, dezelfde merkheader, serif-/sans-hiërarchie, donkergroen, crème en goud.
- WBD en Atlas delen `workspace-shell.ts`, `workspace-config.ts` en `atlas-workspace.css` voor merk, switcher, navigatie, secties, statussen en responsive shellgedrag.
- De afgeschermde Experience heeft dezelfde merkfamilie, maar definieert kleur-, focus- en typografiewaarden nog lokaal in `experience-workspace.css`.
- De lege bestanden `variables.css`, `reset.css`, `typography.css` en `layout.css` vormen nog geen werkelijke centrale designbasis. Dezelfde waarden zijn daardoor op meerdere plaatsen opnieuw vastgelegd.

## Belangrijkste afwijkingen

### Gedeelde basis

- Crème, goud, donkere oppervlakken, focusringen en tekstkleuren hebben meerdere bijna-gelijke waarden en namen.
- Secundaire tekst is op enkele donkere schermen te klein of te gedempt, vooral rond metadata, toelichting en voetteksten.
- Formulieren hebben functionele focusstaten, maar actieve velden zijn niet overal even duidelijk als knoppen en links.
- De gedeelde Workspace-shell is samenhangend, maar de inhoudsoppervlakken blijven overwegend donker en voelen daardoor zwaarder dan de publieke Experience.

### Publieke website

- De homepagehero is rustig en leesbaar, maar maakt binnen de eerste zichtbare tekst nog niet expliciet genoeg dat WBD professionele websites en digitale werkomgevingen ontwerpt en bouwt.
- Eerdere publieke polish loste kennis-doorstroming, beeldverhoudingen, footerpositionering en veel responsive problemen al op; die oplossingen moeten behouden blijven.
- De opeenvolgende historische stijloverrides in de publieke stylesheets maken de actieve visuele regels moeilijker centraal te onderhouden.
- Bestaande fotografie en compositie zijn gevalideerd; nieuw synthetisch beeld of een nieuwe positioneringsronde is niet nodig.

### Publieke Experience

- De route voelt als een rustige eerste ontmoeting en niet als een vaste vragenlijst: vrijwillig stoppen, privacy, eigen woorden en vervolgritme zijn zichtbaar.
- De bezoeker ziet de interne naam `Atlas` in introductie, toelichting en disclosure. Dat botst met de actuele grens dat Atlas publiek de onzichtbare motor blijft.
- Het actieve tekstveld heeft een border- en schaduwverandering, maar kan met één gedeelde focusring duidelijker en consistenter worden.
- De donkerte is passend voor concentratie, maar een gericht crèmevlak rond de actieve bijdrage kan de leesbaarheid verbeteren zonder de Experience licht of formulierachtig te maken.

### WBD Workspace

- De overzichtshero heeft de sterkste hiërarchie van de interne omgevingen en blijft de benchmark.
- De actieve werkstroom is direct begrijpelijk, maar de onderliggende gegevens spreken nog over het ‘openen’ van de polish terwijl Project 001C inmiddels actief wordt uitgevoerd.
- Kaarten en informatiesecties zijn grotendeels donker; doelgericht meer crème kan de zakelijke leeservaring lichter maken.
- Op 390×844 blijft de pagina binnen de viewport, maar de horizontale navigatie toont een technische scrollbar en afgekorte labels.

### Atlas Workspace

- De persoonlijke toon, het kompas en de reflectieve identiteit zijn herkenbaar en mogen blijven.
- De opening concurreert tegelijk met begroeting, afgeronde syncstatus, titel, subtitel, uitleg, metadata, disclosure, kompas en de eerste focuslaag.
- Op mobiel vult deze stapeling vrijwel het hele eerste scherm en verschijnt de daadwerkelijke dagfocus te laat.
- De actuele data benadrukt nog de afgeronde Workspace Sync in plaats van Project 001C als huidige werkstroom.
- Zachte crèmeoppervlakken ontbreken vrijwel volledig, waardoor Atlas persoonlijker maar niet lichter aanvoelt dan WBD.

## Responsive en toegankelijkheid

- Desktop 1440×900 en mobiel 390×844 hebben op de vier hoofdroutes geen horizontale pagina-overloop.
- De publieke homepage, Experience, WBD Workspace en Atlas Workspace behouden één H1 en een logische DOM-volgorde.
- Focusstaten bestaan, reduced-motionregels bestaan en de publieke routes hebben een skiplink.
- Open punten zijn de zichtbaarheid van actieve velden, de mobiele Workspace-navigatie, de tekstzwaarte van de Atlas-opening en het opnieuw toetsen van lange tekst, tablet, tekstzoom en modalgedrag na de wijzigingen.

## Bekende reviewpunten: huidige status

- Opgelost en te behouden: kennis-terugroutes, redactionele vervolgroutes, footer achter CTA, vaste beeldverhouding, geen fictief bewijs, public-only buildgrens en één publieke H1 per route.
- Nog centraal te sluiten: expliciet bouwen van websites zonder webbureauvernauwing, geen publieke Atlas-taal, rustiger Atlas-hero, lichter Workspace-ritme, uniforme focus, mobiele navigatie en hercontrole op overlap/overflow.
- Niet door polish op te lossen: nieuwe klantcases, resultaatclaims, fotografieproductie, infrastructuur, connectors, monitoring en nieuwe modulefunctionaliteit.

## Minimale geïntegreerde polishrichting

1. Activeer één gedeelde set semantische WBD-tokens voor donker, crème, goud, tekst, lijnen, focus, breedtes en ritme.
2. Houd de publieke hero-compositie intact en versterk alleen de concrete buildbetekenis.
3. Houd de Experience donker en menselijk, verberg interne Atlas-taal en maak actieve invoer ondubbelzinnig.
4. Behoud de WBD-hero; gebruik crème voor betekenisvolle werkkaarten en rustige informatievlakken.
5. Reduceer de Atlas-opening tot huidige aandacht, reden en werkstroom; verplaats bewijsdetails naar optionele verdieping en laat het kompas ondersteunen.
6. Leg de toekomstige Module Experience Standard vast als patroon en architectuurrichting, zonder engine of handleidingen te bouwen.

## Technische nulmeting

- `npm test`: 203 tests geslaagd.
- `npm run build`: TypeScript-, Vite- en public-only buildcontrole geslaagd.
- `npm run build:experience`: afgeschermde Experience-build en pakketvoorbereiding geslaagd.

