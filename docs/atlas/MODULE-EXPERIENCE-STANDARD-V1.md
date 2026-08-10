# Module Experience Standard V1

## Status en grens

Ontwerp- en architectuurrichting binnen Project 001C. Dit document bouwt geen onboardingengine, modulehandleiding, nieuwe module of Atlas-intelligentie.

## Doel

Een medewerker moet een toekomstige module zelfstandig kunnen ervaren, begrijpen en later opnieuw uitleg kunnen vinden. De uitleg blijft onderdeel van dezelfde WBD-familie en voelt niet als een los helpcentrum of technisch dashboard.

## Vaste informatiearchitectuur

Iedere module kan minimaal de volgende zes ingangen aanbieden:

1. **Aan de slag** — één begrensde eerste taak, stap voor stap en zonder alle mogelijkheden vooraf te tonen.
2. **Handleiding** — concrete taken en functies terugvinden via herkenbare werkwoorden en situaties.
3. **Waarom** — de werkwijze, regels, grenzen en betekenis achter keuzes begrijpen.
4. **Praktijkvoorbeelden** — echte of expliciet als voorbeeld gemarkeerde situaties, nooit fictief bewijs.
5. **Veelgestelde vragen** — korte antwoorden op daadwerkelijk terugkerende vragen.
6. **Wat is nieuw** — betekenisvolle wijzigingen, gevolgen en eventuele nieuwe handelingen; geen technisch changelog als primaire vorm.

## Ervaringspatroon

De module opent met één rustige oriëntatie:

- waar ben ik;
- wat kan ik hier doen;
- wat is de veiligste eerste stap;
- waar vind ik later uitleg terug.

Daarna volgt een vrijwillige leesroute:

`oriëntatie → eerste taak → bevestiging → mogelijke verdieping → terug naar het werk`

De gebruiker kan altijd overslaan, terugkeren of direct naar een concrete taak zoeken. Voortgang is ondersteunend en wordt nooit gebruikt om de gebruiker vast te zetten in een verplichte onboarding.

## Visuele standaard

- Donkergroen of donkerblauw draagt identiteit en focus.
- Crème draagt uitleg, voorbeelden, eerste stappen en rustige bevestiging.
- Goud markeert betekenis, huidige stap en uitzonderingen; het is geen decoratieve standaardkleur.
- Eén primaire handeling per uitlegscherm.
- Maximaal één korte hoofdtekstkolom met een leesbreedte rond `--wbd-content-reading`.
- Statuswoorden en labels volgen dezelfde semantiek als de Workspaces.
- Invoervelden, links, tabbladen, disclosures en knoppen gebruiken de gedeelde focuskleur en behouden minimaal 44 px bruikbaar tikgebied.
- Een uitleglaag verschijnt in context als paneel, route of rustige pagina; niet als opeenstapeling van modals.

## Herbruikbare componentrollen

- `ModuleOrientation` — titel, betekenis, eerste taak en terugroute.
- `ModuleStartPath` — korte opeenvolging van handelingen met vrijwillige voortgang.
- `TaskGuide` — taakgerichte instructie met vereisten, stappen, resultaat en herstel.
- `WhyPanel` — optionele verdieping in regel of werkwijze.
- `PracticeExample` — context, handeling, uitkomst en bronstatus.
- `QuestionList` — toegankelijke disclosures voor echte veelgestelde vragen.
- `ChangeNote` — datum, betekenis voor het werk en eventuele actie.
- `ModuleHelpIndex` — zoek- en terugvindlaag over alleen bevestigde module-inhoud.

Dit zijn componentrollen, geen opdracht om ze binnen Project 001C technisch te implementeren.

## Inhoudsmodel

Een toekomstige inhoudsbron bewaart per item minimaal:

- stabiele identifier en module;
- inhoudstype uit de zes vaste ingangen;
- titel en taakgerichte samenvatting;
- doelgroep of rol, alleen wanneer bevestigd;
- vereisten en stappen;
- verwachte uitkomst en herstelroute;
- bron, eigenaar en laatste inhoudelijke review;
- status `concept`, `beoordeeld` of `actief`;
- versie vanaf wanneer de uitleg geldt.

Een wijziging aan software maakt uitleg niet automatisch waar of actueel. Publicatie blijft een menselijke reviewhandeling.

## Experience Engine — hergebruikrichting

De bestaande Experience-techniek bevat bruikbare patronen:

- stapsgewijze onthulling zonder vaste vragenlijstindruk;
- vrijwillig stoppen en hervatten;
- duidelijke focus en één handeling per moment;
- optionele verdieping via disclosures;
- teruggeven wat iemand al heeft gedaan;
- server-side sessiegrens en privacybewust ontwerp.

Niet rechtstreeks hergebruiken voor moduleuitleg:

- de huidige onderzoeksvragen en cognitieve Runtime;
- persoonlijke uitnodigingstokens als algemene moduletoegang;
- inzichtvorming of Atlas-redenering;
- Experience-specifieke observatory- en deelnemersdata.

De kansrijke architectuur is daarom een kleine presentatielaag met gedeelde Experience-primitieven en een afzonderlijke `ModuleContentAdapter`. De adapter leest beoordeelde module-inhoud; hij neemt geen beslissingen over waarheid, prioriteit of voortgang. Pas praktijkgebruik kan later rechtvaardigen of dit een algemene Experience Engine wordt.

## Toegankelijkheid en responsive grens

- Volledige toetsenbordroute en zichtbare focus.
- Semantische kopvolgorde, labels en native controls waar mogelijk.
- Geen informatie uitsluitend via kleur, positie of animatie.
- Reduced motion zonder verlies van betekenis.
- Tekstzoom tot 200% zonder horizontale pagina-overloop.
- Mobiel toont dezelfde taak en herstelroute; het is geen verkorte of alleen-lezen variant.
- Lange stappen worden verdeeld op betekenis, niet op een vast aantal schermen.

## Acceptatietoets voor een toekomstige module

Een module voldoet aan deze standaard wanneer een nieuwe medewerker:

1. binnen één minuut de eerste veilige taak kan benoemen;
2. die taak zonder mondelinge WBD-uitleg kan uitvoeren of bewust stoppen;
3. later dezelfde uitleg via taak of vraag kan terugvinden;
4. begrijpt waarom een belangrijke regel bestaat;
5. kan zien welke informatie actueel en beoordeeld is;
6. geen nieuwe functie, resultaatclaim of bedrijfsregel hoeft te veronderstellen.

## Niet uitgevoerd in Project 001C

Geen engine, zoekfunctie, voortgangsopslag, automatische onboarding, volledige modulecopy, analytics, nieuwe API, nieuwe Workspace-route of inhoud voor alle bestaande modules.

