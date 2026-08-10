# Living Experience Foundation — Onderzoekslus & Gespreksbewegingen V1

**Status:** lokaal gevalideerde candidate — GO  
**Datum:** 3 augustus 2026  
**Experience-versie:** `4.0-living-research-loop-v1`  
**Productie:** niet gewijzigd

## Uitgangspunt

Deze increment bewijst één complete onderzoekslus binnen één gesprek. De Experience vertrekt uitsluitend vanuit woorden van de deelnemer, maakt de herkomst van een vervolgvraag zichtbaar en geeft pas een mogelijke observatie terug wanneer daar voldoende antwoordbewijs voor is.

De beweging is:

> vertellen → verhelderen → voorzichtig teruggeven → toetsen → kiezen

Dit is bewust nog geen systeem van meerdere onderzoekssporen. Er is één moment, één verheldering, één voorzichtige terugkoppeling en daarna een rustige landing waarin de deelnemer zelf kiest.

## Gewijzigd ontwerp

### 1. Vertellen

De Experience begint bij één concrete werksituatie die bij de deelnemer is blijven hangen. De introductie belooft geen vaste vragenlijst of uitkomst. Zij zegt dat alleen wordt doorgevraagd wanneer de eigen woorden daar aanleiding voor geven en dat stoppen altijd mogelijk is.

Het invoerveld heeft een zichtbaar menselijk label: **Vertel in je eigen woorden**. De actieve invoer is herkenbaar door een rustige goudkleurige focusrand, zonder het scherm drukker te maken.

### 2. Verhelderen

Na een inhoudelijk antwoord wordt niet automatisch een generieke volgende vraag getoond. Eerst ziet de deelnemer zijn eigen bijdrage terug. Daarna kan die vrijwillig kiezen om hetzelfde moment verder te onderzoeken.

De verhelderingsvraag toont haar herkomst letterlijk:

> Deze vraag komt voort uit wat je net vertelde

Daaronder staat de eerdere bijdrage ongewijzigd. De vervolgvraag vraagt wat volgens de deelnemer zelf meespeelde. Daarmee blijft de vraag controleerbaar herleidbaar en schrijft de Experience geen oorzaak voor.

### 3. Voorzichtig teruggeven

Na beide bijdragen toont de Experience eerst opnieuw de eigen woorden. Pas na een expliciete keuze van de deelnemer volgt een mogelijke observatie.

De observatie is beperkt tot het aantoonbare verband dat het beschreven moment volgens de deelnemer niet los lijkt te staan van wat meespeelde. De tekst benoemt dit nadrukkelijk als mogelijke samenhang en niet als conclusie.

Wanneer het antwoordbewijs onvoldoende is, ontstaat geen observatie en geen nieuwe inhoudelijke vraag. De Experience zegt eerlijk dat er nog niet genoeg is om zorgvuldig verder te gaan en biedt een rustig stopmoment.

### 4. Toetsen en corrigeren

De deelnemer kan op de terugkoppeling reageren met:

- **Herken ik**
- **Gedeeltelijk**
- **Nog niet**
- **Ik zie het anders**

Een correctie verandert onmiddellijk de volgende beweging. Bij **Ik zie het anders** wordt de observatie niet als uitgangspunt genomen en vraagt de Experience hoe de deelnemer het verband zelf ziet. Bij **Gedeeltelijk** vraagt de vervolgbeweging welk deel wel en niet past.

Correcties gebruiken de bestaande reflectieopslag. Er is geen nieuw gegevenstype, event of opslagmodel toegevoegd.

### 5. Rustige landing en kiezen

Na het toetsen verschijnt geen automatische volgende vraag. De deelnemer kiest vanuit een rustige landing:

- hier verder naar kijken;
- een ander onderwerp uit de eigen woorden onderzoeken;
- dit voor nu laten rusten;
- voor vandaag stoppen.

De formulering van de landing volgt de reactie. Een niet-herkende observatie wordt expliciet niet als uitgangspunt meegenomen. Stoppen eindigt met **Voor vandaag is dit genoeg**, niet met een claim dat het onderzoek af of voltooid is.

## Compatibiliteit en technische grens

- Nieuwe sessies gebruiken Experience-versie `4.0-living-research-loop-v1`.
- Bestaande `3.0-conversation-insight-v1`-sessies behouden hun vier bestaande gespreksmomenten en kunnen verder functioneren.
- De bestaande sessie-, antwoord-, inzicht- en reflectieopslag is hergebruikt.
- Er is geen databasewijziging en geen migratie toegevoegd.
- Er is geen nieuwe route, schermcategorie, Observatory-event of externe dependency toegevoegd.
- De Observatory-weergave begrijpt de nieuwe versienaam, maar is inhoudelijk niet uitgebreid.
- Atlas Workspace, Sportpaleis en de publieke website zijn niet functioneel gewijzigd.
- De public-only buildcontrole blijft intact en is geslaagd.

## Review

### Method Review — GO

De lus bevat alle vijf afgesproken bewegingen en bewaart eigenaarschap bij de deelnemer. Een vervolgvraag verwijst zichtbaar naar de letterlijke eerdere bijdrage. De mogelijke observatie verschijnt pas na twee inhoudelijke bijdragen en blijft controleerbaar beperkt tot die woorden. Bij onvoldoende bewijs stopt de inhoudelijke beweging.

### Experience Review — GO

De flow voelt minder als een serie vaste velden: elk antwoord wordt eerst ontvangen, de reden voor de volgende beweging is zichtbaar en verdieping is vrijwillig. De landing voorkomt dat de Experience zichzelf gaande houdt. Er is geen advies, diagnose of oplossingsrichting toegevoegd.

### Emotional Review — GO

Deelnemers krijgen ruimte om te antwoorden, te corrigeren, te rusten en te stoppen. De Experience reageert niet afwijzend op **Ik weet het nog niet** en maakt geen kennis van een mager antwoord. Bij tegenspraak wordt de deelnemer niet overtuigd; de terugkoppeling wordt losgelaten.

### Brand Review — GO

De bestaande We Build And Design-shell, typografie, kleuren, ritme en rustige toon zijn behouden. De polish is beperkt tot invoerduidelijkheid, focus, contrast, herkomst en rustige actiehiërarchie. Er is geen redesign of nieuwe visuele laag uitgevoerd.

### Language Review — GO

De zichtbare teksten vermijden technische taal, AI-taal, verkooptaal en claims over wat de Experience "weet". Woorden als *mogelijke samenhang*, *volgens jou* en *voor vandaag* houden de observatie voorzichtig en tijdelijk.

### Mobile Review — GO

De flow is getest op een viewport van 390 × 844 pixels. Invoer, CTA's en keuzeacties blijven zichtbaar en bruikbaar; alle gemeten landingsacties zijn 44 pixels hoog en vullen mobiel de beschikbare breedte. Er ontstond geen horizontale overflow. Focus, scrollgedrag en de actieve invoer bleven duidelijk. Dit was browser-emulatie, geen test op fysiek toestel met echt mobiel toetsenbord.

## Browseracceptatie

De acceptatie is uitgevoerd tegen een frisse lokale centrale sessieopslag, in een echte Chromium-browser. Er is geen bestaande sessie hervat voor de hoofdflow.

### Desktop — volledige lus

1. Nieuwe organische sessie gestart.
2. Een concrete gebeurtenis verteld.
3. Gecontroleerd dat de vervolgvraag de eerdere bijdrage letterlijk als oorsprong toont.
4. Het moment verhelderd.
5. Beide bijdragen vóór de observatie teruggelezen.
6. Een voorzichtige observatie geopend.
7. **Ik zie het anders** gekozen.
8. Een correctie ingevoerd en gecontroleerd dat de landing het eerdere verband niet meer als uitgangspunt gebruikt.
9. Vrijwillig gestopt.
10. Eindtoestand **Voor vandaag is dit genoeg** gecontroleerd.
11. Browserconsole: geen warnings of errors.

### Mobiel — onvoldoende bewijs

1. Nieuwe persoonlijke testsessie gestart.
2. Bij het eerste moment **Ik weet het nog niet** gekozen.
3. Gecontroleerd dat geen inhoudelijke vervolgvraag en geen observatie wordt gemaakt.
4. De eerlijke uitleg en het volledige rustige stopvlak gecontroleerd.

### Mobiel — volledige lus en landing

1. Nieuwe persoonlijke testsessie gestart.
2. Een gebeurtenis en herleidbare verheldering ingevoerd.
3. De voorzichtige observatie geopend.
4. **Gedeeltelijk** gekozen.
5. Gecontroleerd dat de landing vraagt welk deel wel en niet past.
6. Alle vier vrijwillige vervolg- en stopkeuzes visueel gecontroleerd.
7. Vrijwillig gestopt en de rustige eindtoestand gecontroleerd.
8. Geen horizontale overflow en geen browserconsolefouten vastgesteld.

## Screenshotbewijs

- `output/living-experience-research-loop-v1/desktop-welcome.png`
- `output/living-experience-research-loop-v1/desktop-active-input.png`
- `output/living-experience-research-loop-v1/desktop-grounded-follow-up.png`
- `output/living-experience-research-loop-v1/desktop-observation.png`
- `output/living-experience-research-loop-v1/desktop-correction-landing.png`
- `output/living-experience-research-loop-v1/mobile-welcome.png`
- `output/living-experience-research-loop-v1/mobile-active-input.png`
- `output/living-experience-research-loop-v1/mobile-insufficient-evidence.png`
- `output/living-experience-research-loop-v1/mobile-observation.png`
- `output/living-experience-research-loop-v1/mobile-landing-choices.png`

## Verificatie

| Controle | Resultaat |
| --- | --- |
| Geautomatiseerde tests | 160/160 geslaagd |
| TypeScript | geslaagd |
| Experience-build | geslaagd |
| Public-only build | geslaagd; grens geverifieerd |
| Desktopbrowser | geslaagd; geen consolefouten |
| Mobiele browser-emulatie | geslaagd; geen consolefouten |

## Bewuste beperkingen

- Deze versie ondersteunt precies één onderzoekslus per gesprek.
- **Een ander onderwerp onderzoeken** legt binnen de bestaande reflectiebeweging vast waar de deelnemer naar wil kijken; het maakt nog geen zelfstandig onderzoeksspoor.
- Meerdere gelijktijdige sporen, terugkeren naar eerdere sporen en later inhoudelijk hervatten zijn niet gebouwd.
- De observatie is bewust eenvoudig en deterministisch. Er is geen AI, classificatie of vrije interpretatie toegevoegd.
- De correctie hergebruikt de bestaande reactie **Nog niet** plus een vrije reflectie; er is geen nieuw herkenningsmodel gemaakt.
- De acceptatie gebruikte lokale centrale bestandsopslag. Er is geen productie- of MySQL-validatie uitgevoerd, omdat productie en data-infrastructuur buiten deze opdracht vallen.

## Productiestatus en vervolggrens

Er is niets gepubliceerd. TransIP, documentroots, PHP-runtime, productie-API, MySQL, DNS, certificaten, uitnodigingen en rollbackvoorzieningen zijn niet aangeraakt.

Na expliciete review is de enige logische volgende bouwstap **Research Tracks**: meerdere onderzoekssporen laten ontstaan en terugvindbaar maken. Terugkeer, Observatory-uitbreidingen en verdere Living Experience-functionaliteit blijven ook dan afzonderlijke werkstromen.
