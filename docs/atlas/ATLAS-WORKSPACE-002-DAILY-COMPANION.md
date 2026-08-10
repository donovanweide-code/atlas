# Atlas Workspace 002 — Daily Companion

**Datum:** 29 juli 2026  
**Status:** historische ontwerpstudie — Workspace 002 inmiddels praktijkgevalideerd  
**Production Track:** HOLD — wacht op reactie TransIP  
**Scope:** Atlas Workspace; geen productie-, release- of websitewerkzaamheden

> Deze ontwerpstudie bewaart de redenering vóór implementatie. De uiteindelijke
> kandidaat heeft inmiddels een definitieve praktijk-GO ontvangen. Zie
> [`ATLAS-WORKSPACE-002-CANDIDATE-HANDOFF.md`](./ATLAS-WORKSPACE-002-CANDIDATE-HANDOFF.md)
> voor de afgeronde status en
> [`ATLAS-WORKSPACE-EVOLUTION-001.md`](./ATLAS-WORKSPACE-EVOLUTION-001.md)
> voor het nieuwe, nog niet geïmplementeerde ontwerpinzicht.

## 1. Managementsamenvatting

De huidige Workspace heeft een onderscheidende, rustige vormtaal en bewaart
bewijs zorgvuldig. Als dagelijkse voordeur van Atlas schiet hij nog tekort.
De eerste indruk wordt bepaald door een verouderde Case 0001-waarschuwing,
terwijl de actuele werkelijkheid is dat productie stabiel staat en de
Production Track bewust HOLD is in afwachting van TransIP.

Op desktop vult die verouderde opening de eerste 720 pixels. De actuele
Orientation Layer begint pas rond 865 pixels en de totale route is circa
10.424 pixels lang. Op mobiel vult dezelfde opening de eerste 844 pixels,
begint de actuele oriëntatie pas rond 1.067 pixels en groeit de route tot
circa 16.745 pixels. In beide ervaringen moet Donovan eerst scrollen en zelf
bepalen welke status gezaghebbend is.

De aanbevolen evolutie is **Daily Companion Candidate 001**:

`Kompas → Focus → Stilte → Horizon → Werkruimte`

De eerste leeslaag wordt een korte, actuele dagelijkse briefing. Bestaande
cases, Waarnemingen, Understanding, ideeën, logboek en bewijsdossiers blijven
bestaan, maar worden de tweede leeslaag. Atlas toont eerst wat vandaag
betekenis heeft en pas daarna alles waarmee Donovan kan verdiepen.

Deze kandidaat is gereed voor een afzonderlijke uitvoerings-GO. In deze fase
is geen applicatiecode gewijzigd.

## 2. Review van de huidige Workspace

### Eerste indruk

De Workspace voelt visueel premium, beheerst en eigen. De donkere compositie,
grote serifkoppen en subtiele kompaslijn geven Atlas meer karakter dan een
standaard productinterface.

De boodschap in de eerste viewport is echter niet actueel:

> Actueel casebeeld vraagt herbevestiging.

Daardoor begint de werkdag bij een intern probleem uit Case 0001, niet bij de
werkelijkheid van vandaag.

### Actualiteit

De Orientation Layer noemt Workspace Sync 001 en Release Reality Alignment
als actuele fase. Beide zijn al afgerond. Nieuwere besluiten, onderzoeken en
de Production HOLD zijn wel in documentatie vastgelegd, maar werken niet
automatisch door naar de Workspace.

### Focus en rust

De Workspace heeft negen primaire navigatie-items en meerdere concurrerende
centra: Opening, Werkbeeld, Oriëntatie, Vandaag, Cases, Understanding, Ideeën
en Logboek. De onderdelen zijn afzonderlijk rustig vormgegeven, maar de
redactionele keuze ontbreekt welk deel vandaag aandacht verdient.

### Informatiehiërarchie

Het systeem toont vooral hoe Atlas is opgebouwd. De ondernemer heeft een
andere volgorde nodig:

1. wat is waar;
2. wat betekent dit voor vandaag;
3. wat hoeft niet;
4. wat blijft zichtbaar;
5. waar kan ik verdiepen?

### Betekenis, vertrouwen en doorstroming

De bewijsgrenzen zijn sterk en betrouwbaar. Vertrouwen verzwakt alleen
wanneer meerdere statuslagen verschillende momenten vertegenwoordigen.
Donovan moet dan zelf reconstrueren welke waarheid actueel is. De route volgt
nu de systeemstructuur; een Daily Companion moet de werkdag volgen.

## 3. Belangrijkste problemen en oorzaken

| Probleem | Onderliggende oorzaak | Gevolg |
|---|---|---|
| Verouderde eerste indruk | Statuszinnen staan verspreid in componenten en bronbestanden | Donovan begint met een onjuiste prioriteit |
| Actuele waarheid staat onder de vouw | De visuele hero is belangrijker gemaakt dan de dagelijkse briefing | De tien-secondenvraag wordt niet beantwoord |
| Te veel primaire bestemmingen | Bestaande functies zijn automatisch hoofdnavigatie geworden | Atlas voelt als softwarestructuur |
| Herhaling van status | Opening, Orientation, Vandaag en Cases maken elk een eigen samenvatting | Onduidelijkheid over gezaghebbende waarheid |
| Lange dagelijkse route | Volledige dossiers en werkformulieren staan permanent open | Lezen gaat vóór kiezen |
| Interne taal in de eerste laag | Bewijs- en implementatieterminologie is niet redactioneel begrensd | De gebruiker moet Atlas eerst begrijpen |
| Mobiel is verkleinde desktop | Dezelfde inhoudsvolgorde blijft actief | De essentie verschijnt pas na meerdere schermen |

De fundamentele oorzaak is niet een tekort aan informatie. De Workspace heeft
nog geen vaste redactionele publicatiegrens die bepaalt wat vandaag in de
eerste leeslaag thuishoort.

## 4. Onderdelen die behouden mogen blijven

- de donkere, rustige Atlas-wereld;
- de menselijke begroeting;
- seriftypografie voor betekenisvolle conclusies;
- het kompas als subtiele richtingdrager;
- expliciete bewijsgrenzen;
- terugkeertriggers;
- onderscheid tussen vastgesteld, onzeker en bewust later;
- cases en hun herleidbare bronnen;
- Waarnemen;
- Understanding en revisiegeschiedenis;
- ideeën en logboek;
- lokale opslag zolang de bewijsgrens zichtbaar blijft;
- Donovan als beslisser.

Deze onderdelen vormen de inhoudelijke en visuele identiteit. Zij hoeven niet
allemaal in de eerste viewport te staan om behouden te blijven.

## 5. Onderdelen die aangepast moeten worden

### Opening

Van een beeldvullende casewaarschuwing naar een compacte actuele briefing met:

- status;
- reden;
- laatst beoordeeld;
- eerstvolgende betekenisvolle stap;
- terugkeertrigger bij HOLD.

### Orientation Layer

Niet langer een afzonderlijke laag onder de hero. De betekenis ervan wordt
het hart van de opening.

### Navigatie

Van negen systeembestemmingen naar vier betekenisvolle ingangen:

- Vandaag;
- Werkelijkheid;
- Horizon;
- Werkruimte.

### Werkbeeld

Van een permanente verzameling candidates, tellingen en dossiers naar één
geselecteerd aandachtspunt plus toegang tot de volledige onderbouwing.

### Dossiers en formulieren

Standaard begrensd. Conclusie, bewijsgrens en volgende vraag zijn zichtbaar;
de volledige werkbank opent pas wanneer Donovan wil verdiepen.

### Mobiel

Niet dezelfde desktopvolgorde onder elkaar, maar een compact kompas met alleen
status, aandacht, verandering, stilte en volgende stap.

## 6. Onderdelen die verwijderd moeten worden

Uit de primaire leeslaag:

- de volledige Case 0001-hero;
- de losse generieke Workspace-header;
- de dubbele Orientation Layer;
- de negen genummerde hoofdnavigatie-items;
- tellingen zonder directe betekenis;
- volledige bronpaden;
- interne termen zoals `Confirmed revision` en `Execution Template`;
- `Powered by Atlas` als losse statusregel;
- het volledige Bij Cees-dossier;
- alle Understanding-, ideeën- en logboekformulieren;
- de dagorganisator `0/3` als primair model.

Niet verwijderen uit Atlas:

- casebewijs;
- Waarnemingen;
- Understanding-relaties;
- revisies;
- ideeën;
- logboek;
- delivery reviews;
- bewijsgrenzen.

De ingreep is redactionele begrenzing, geen verlies van werkelijkheid.

## 7. Nieuwe informatiehiërarchie

### Kompas

Beantwoordt waar we staan, waarom en wanneer dit voor het laatst is
beoordeeld.

### Focus

Toont maximaal één eerstvolgende betekenisvolle stap en waarom deze vandaag
aandacht verdient.

### Stilte

Toont maximaal drie bewezen grenzen: wat nu bewust niet hoeft en waarom.

### Horizon

Toont maximaal drie ontwikkelingen die zichtbaar moeten blijven, elk met een
terugkeertrigger.

### Werkruimte

Biedt toegang tot Cases, Waarnemen, Understanding, Ideeën en Logboek voor
verdieping en vastlegging.

De dagelijkse volgorde wordt:

`Werkelijkheid begrijpen → aandacht kiezen → rust bewaken → ontwikkelingen
blijven zien → verdiepen wanneer nodig`

## 8. Nieuwe desktop-schermopbouw

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Atlas                                              woensdag 29 juli │
├─────────────────────────────────────────────────────────────────────┤
│ Goedemorgen, Donovan.                                                │
│                                                                     │
│ Productie staat stabiel.                                            │
│ We wachten op TransIP.                                              │
│                                                                     │
│ De releaseketen, validatie en rollback zijn bewezen.                │
│ De laatste infrastructuurvraag ligt buiten onze beheersomgeving.    │
│                                                                     │
│ Laatst beoordeeld · 29 juli      Terugkeer · reactie van TransIP    │
├─────────────────────────────────┬───────────────────────────────────┤
│ FOCUS                           │ STILTE                            │
│                                 │                                   │
│ Geef Atlas Workspace 002 vorm   │ Geen nieuwe publicatie.           │
│ als dagelijkse begeleider.      │ Geen infrastructuuranalyse.       │
│                                 │ Geen workaround.                   │
│ Waarom dit nu betekenis heeft → │                                   │
├─────────────────────────────────┴───────────────────────────────────┤
│ HORIZON                                                             │
│ ○ Bij Cees · terug bij nieuw praktijkbewijs                         │
│ ○ Experience Preview · terug na representatieve publieke basis      │
│ ○ Workspace-evolutie · observeren tijdens dagelijks gebruik         │
├─────────────────────────────────────────────────────────────────────┤
│ WERKRUIMTE                                                          │
│ Cases · Waarnemen · Understanding · Ideeën · Logboek                │
└─────────────────────────────────────────────────────────────────────┘
```

Desktop gebruikt de breedte voor betekenisvolle juxtapositie, niet voor meer
widgets. Kompas, Focus en Stilte passen binnen ongeveer één viewport.
Horizon mag aan de onderrand al zichtbaar zijn, zodat de pagina doorloopt
zonder aandacht op te eisen.

## 9. Nieuwe mobiele schermopbouw

```text
┌──────────────────────────────┐
│ Atlas          wo 29 juli    │
├──────────────────────────────┤
│ Goedemorgen, Donovan.        │
│                              │
│ Productie staat stabiel.     │
│ Wacht op TransIP.            │
│                              │
│ Laatst beoordeeld · vandaag  │
├──────────────────────────────┤
│ FOCUS                        │
│ Workspace 002 uitwerken.     │
│ Waarom dit nu telt →         │
├──────────────────────────────┤
│ STILTE                       │
│ Geen nieuwe publicatie.      │
│ Geen workaround.             │
├──────────────────────────────┤
│ VERANDERD SINDS LAATST       │
│ Geen betekenisvolle wijziging│
├──────────────────────────────┤
│ HORIZON · 3                  │
│ Bekijk wanneer nodig →       │
├──────────────────────────────┤
│ Werkruimte openen            │
└──────────────────────────────┘
```

Mobiele principes:

- de essentie past in circa anderhalve viewport;
- status en reden blijven bij elkaar;
- Focus verschijnt vóór navigatie naar werkfuncties;
- Stilte is beknopt, niet inklapbaar noodzakelijk;
- “Veranderd sinds laatst” voorkomt onnodig zoeken;
- Horizon toont standaard alleen aantal en eerste observatie;
- diep redigeren en dossierbeheer mogen desktop-first blijven;
- waarnemen, lezen en een eenvoudige beslissing bevestigen blijven mobiel
  toegankelijk.

## 10. Redactionele richting en voorbeeldteksten

### Schrijfregel

Iedere zin in de eerste leeslaag moet:

- richting geven;
- een reden geven;
- aandacht begrenzen;
- onzekerheid eerlijk benoemen;
- of een terugkeertrigger bewaren.

### Van systeemtaal naar dagelijkse taal

| Intern | Daily Companion |
|---|---|
| Actieve uitvoering | Waar we mee bezig zijn |
| Laatste GO | Laatst bevestigd |
| Eerstvolgende stap | Wat nu aandacht verdient |
| Candidate | Voorstel |
| Confirmed revision | Bevestigd beeld |
| Open voor beoordeling | Nog te begrijpen |
| Geen automatische conclusie | Atlas wacht op bewijs |

### Voorbeeldcopy voor de actuele werkelijkheid

**Kompas**

> Productie staat stabiel. We wachten op TransIP.

> De releaseketen, validatie en rollback zijn bewezen. De resterende vraag
> gaat over de DocumentRoot-activatie op `linweb412` en ligt buiten onze
> beheersomgeving.

**Focus**

> Geef de Workspace één heldere voordeur.

> De techniek hoeft vandaag geen aandacht. De betekenisvolle stap is nu
> bepalen hoe Atlas de werkdag opent.

**Stilte**

> Geen nieuwe publicatie, infrastructuuranalyse of workaround totdat TransIP
> reageert.

**Horizon**

> Bij Cees blijft zichtbaar. Heropen pas wanneer nieuwe praktijkinformatie de
> huidige bewijsgrens verandert.

De toon is rustig, precies en menselijk. Geen urgentietheater, geen
productiviteitsdruk en geen suggestie dat Atlas zelfstandig beslist.

## 11. Visuele richting

### Typografie

- serif voor de actuele conclusie en betekenisvolle aandacht;
- sans-serif voor context, datum, status en bediening;
- maximaal drie typografische niveaus in de eerste viewport;
- geen grote heroletter die de inhoud uit de viewport duwt;
- cijfers alleen wanneer zij besliswaarde hebben.

### Witruimte en ritme

- minder ceremonie bovenaan, meer adem rondom de actuele conclusie;
- één krachtige opening in plaats van hero plus Orientation Layer;
- secties worden door ritme en dunne lijnen gescheiden, niet door zware
  dashboardkaarten;
- de pagina vertraagt bij Kompas en Focus, versnelt bij Werkruimte.

### Kleur en contrast

- behoud diep groenblauw en warm ivoor;
- goud alleen voor richting, actuele aandacht of een betekenisvolle
  terugkeertrigger;
- HOLD wordt geen rood alarm: de situatie is beheerst;
- onzekerheid krijgt gedempt contrast, niet minder leesbaarheid.

### Kaarten en vlakken

- Focus mag één begrensd redactioneel vlak krijgen;
- Stilte is liever een rustige marge of kolom dan een kaart;
- Horizon bestaat uit regels of korte notities, niet uit een tegelraster;
- Werkruimte mag functioneler worden omdat zij expliciet de tweede laag is.

### Iconografie

- behoud het kompas als sfeer- en richtingsdrager;
- gebruik geen generieke statusiconen, verkeerslichten of productiviteits-
  symbolen;
- een kleine stip of lijn volstaat voor Focus, Stilte en Horizon.

### Navigatie en interactie

- vier semantische ingangen in plaats van negen systeembestemmingen;
- geen permanente sidebar nodig in de eerste viewport;
- details openen inline of leiden naar een begrensde werkruimte;
- interactie mag nooit nodig zijn om de actuele status te begrijpen;
- toetsenbordfocus en bewegingsreductie blijven volwaardig.

### Behouden, aanpassen, verwijderen

**Behouden:** kleurwereld, serif, kompas, dunne lijnen, redactionele toon.

**Aanpassen:** schaal van de opening, navigatie, kaartdichtheid, zichtbaarheid
van technische labels.

**Verwijderen:** beeldvullende waarschuwing, dashboardtellingen, dubbele
statusblokken en decoratieve statusbadges zonder besliswaarde.

## 12. Voorstel voor actualiteit en synchronisatie

### Canonieke bron voor de eerste versie

Introduceer één expliciete, handmatig beheerde `Daily Brief` als
publicatiegrens voor de Workspace:

```text
status
reason
focus
nextMeaningfulStep
silence[]
horizon[]
lastReviewedAt
evidenceSource
externalDependency
returnTrigger
```

Deze bron interpreteert de onderliggende documentatie niet automatisch. Een
mens bevestigt wat de Workspace als actuele waarheid mag tonen.

### Doorwerking van nieuwe werkelijkheid

1. Werk of onderzoek wordt afgerond.
2. Atlas Reflection benoemt betekenis, bewijsgrens en Recommendation.
3. Donovan neemt een besluit.
4. De Daily Brief wordt alleen bijgewerkt wanneer dit besluit de dagelijkse
   werkelijkheid verandert.
5. De Workspace toont `Laatst beoordeeld` en de bron van die bevestiging.

Niet ieder document wijzigt de Workspace. Alleen een bevestigd besluit met
dagelijkse betekenis passeert de publicatiegrens.

### Handmatig in Workspace 002

Voor de eerste implementatie worden handmatig onderhouden:

- actuele status;
- Focus;
- Stilte;
- Horizonselectie;
- terugkeertrigger;
- datum laatste beoordeling.

Dit is eerlijker dan schijnautomatisering.

### Later structureel synchroniseren

Pas na voldoende praktijkbewijs onderzoeken:

- een gestructureerd besluitregister;
- automatische signalering dat de Daily Brief ouder is dan een nieuw GO;
- voorstel van Atlas bij mogelijke statuswijziging;
- menselijke bevestiging vóór publicatie naar de Workspace.

Automatisch voorstellen mag later; automatisch publiceren niet.

### Veroudering voorkomen

- toon altijd `Laatst beoordeeld`;
- markeer een brief als `Herbevestiging nodig` wanneer een recenter
  gezaghebbend besluit bestaat;
- laat bij een externe afhankelijkheid eigenaar en terugkeertrigger zien;
- gebruik geen relatieve termen als “vandaag” zonder datumbron;
- houd één actuele brief, geen statuskopieën per component.

## 13. Concrete implementatiekandidaten

### 002A — Daily Compass

Vervang hero en dubbele Orientation Layer door één actuele eerste viewport.

### 002B — Canonieke Daily Brief

Laat alle dagelijkse statuscopy uit één expliciete bron komen.

### 002C — Focus, Stilte en Horizon

Introduceer drie redactionele banen met harde inhoudslimieten.

### 002D — Werkruimte als tweede leeslaag

Behoud bestaande functies, maar plaats ze achter één betekenisvolle ingang.

### 002E — Dossiers begrenzen

Toon standaard conclusie, bewijsgrens en volgende vraag; open het volledige
dossier alleen op verzoek.

### 002F — Mobiel Kompas

Maak een eigen mobiele compositie met status, Focus, verandering, Stilte en
volgende stap; niet een verkleinde desktop.

### 002G — Actualiteitswaarborg

Toon `Laatst beoordeeld`, bewijsbron en terugkeertrigger en detecteer in de
eerste versie handmatig wanneer een brief verouderd is.

## 14. Risico’s en onzekerheden

| Risico/onzekerheid | Begrenzing |
|---|---|
| Eén Focus kan te sturend voelen | Atlas stelt voor; Donovan bevestigt |
| Handmatige Daily Brief kan verouderen | Laatst beoordeeld en herbevestigingsstatus zichtbaar |
| Stilte kan op een verborgen backlog lijken | Alleen bewezen grenzen, geen algemene parkeerlijst |
| Horizon kan opnieuw mentale voorraad worden | Maximaal drie items met terugkeertrigger |
| Werkruimte kan te ver worden verstopt | Eén duidelijke ingang en directe deeplinks behouden |
| Mobiel kan te weinig diepte bieden | Lezen, waarnemen en bevestigen mobiel; diep beheer desktop |
| Automatische synchronisatie kan schijnzekerheid creëren | Nu handmatig; later alleen voorstellen met menselijke bevestiging |
| Bestaande lokale data kan bij herstructurering verloren gaan | Geen storage keys of datamodellen wijzigen zonder migratietest |

Nog in praktijk te toetsen:

- of één aandachtspunt voldoende houvast geeft;
- of Stilte dagelijks waardevol blijft buiten een actieve HOLD;
- hoeveel Horizon zichtbaar kan zijn zonder afleiding;
- of Donovan de Workspace na vijf echte ochtenden nog als kompas ervaart.

## 15. GO / NO GO per voorstel

| Voorstel | Besluit | Reden |
|---|---|---|
| 002A Daily Compass | **GO** | Lost de tien-secondenvraag direct op |
| 002B Canonieke Daily Brief | **GO** | Voorkomt tegenstrijdige statuskopieën |
| 002C Focus, Stilte en Horizon | **GO** | Geeft richting zonder takenlijst |
| 002D Werkruimte als tweede laag | **GO** | Behoudt diepte zonder eerste-overload |
| 002E Dossiers begrenzen | **GO** | Bewijs blijft beschikbaar, maar niet dominant |
| 002F Mobiel Kompas | **GO** | Maakt de essentie telefoonwaardig |
| 002G Actualiteitswaarborg | **GO** | Voorkomt opnieuw een verouderd werkbeeld |
| Automatische prioritering | **NO GO** | Atlas mag voorstellen, Donovan beslist |
| Klassiek dashboard | **NO GO** | Meer administratie geeft geen beter begrip |
| Dagelijkse takenlijst | **NO GO** | Maakt Donovan opnieuw projectmanager |
| Automatische publicatie van status | **NO GO** | Geen Workspace-waarheid zonder menselijke bevestiging |
| Native mobiele app | **NO GO binnen Workspace 002** | Mobile-aware web is nu voldoende |

## 16. Aanbevolen samenhangende implementatiescope

De voorstellen 002A tot en met 002G vormen samen:

**Daily Companion Candidate 001**

Implementatievolgorde na een afzonderlijke uitvoerings-GO:

1. leg het Daily Brief-contract en de handmatige actuele bron vast;
2. vervang opening en Orientation Layer door Daily Compass;
3. bouw Focus, Stilte en Horizon als eerste leeslaag;
4. breng de vierdelige navigatie aan;
5. verplaats bestaande functies naar Werkruimte zonder data te verwijderen;
6. begrens dossiers en interne bewijslabels;
7. bouw de zelfstandige mobiele compositie;
8. valideer keyboard, focus, contrast en reduced motion;
9. controleer dat lokale storage en revisiehistorie intact blijven;
10. voer een desktop- en mobiele tien-secondenreview uit.

De candidate is geslaagd wanneer Donovan correct kan zeggen:

> Productie staat stabiel en wacht op TransIP. Dat hoeft vandaag niet verder.
> Mijn aandacht gaat nu naar de volgende evolutie van de Workspace. Bij Cees
> en de Experience Preview blijven zichtbaar, maar vragen nog geen actie.

Niet binnen deze implementatiescope:

- automatische prioritering;
- dashboardmetrics;
- takenmanagement;
- native app;
- brede Atlas-architectuur;
- productie- of releasewerkzaamheden.

## Candidate handoff

### Doel

De Workspace veranderen van een uitgebreide systeemweergave in de dagelijkse
voordeur van Atlas.

### Belangrijkste voorgestelde veranderingen

- één actueel Daily Compass;
- één canonieke Daily Brief;
- Focus, Stilte en Horizon als eerste leeslaag;
- Werkruimte als tweede leeslaag;
- eigen mobiel Kompas;
- zichtbare actualiteits- en bewijsgrens;
- minder navigatie, statusduplicatie en interne taal.

### Bewust niet veranderd

- onderliggende case-, Understanding-, Waarnemingen-, ideeën- en logboekdata;
- Donovan als beslisser;
- Atlas-principes en bewijsdiscipline;
- Production Track;
- infrastructuur;
- publieke website;
- native app of brede nieuwe functionaliteit.

### Reviewpunten voor Donovan

1. Voelt de eerste viewport als het begin van de werkdag?
2. Is de formulering van Focus behulpzaam zonder als opdracht te voelen?
3. Geeft Stilte rust of juist extra mentale voorraad?
4. Blijft Horizon zichtbaar zonder aandacht te trekken?
5. Is Werkruimte als tweede laag nog direct genoeg bereikbaar?
6. Voelt mobiel als een compact Kompas en niet als een uitgeklede desktop?
7. Is handmatige actualisering voorlopig eerlijk en werkbaar?

### Aanbevolen besluit

**GO voor Daily Companion Candidate 001 als samenhangende implementatiescope.**

Geen deelimplementatie: de waarde ontstaat uit de combinatie van Kompas,
Focus, Stilte, Horizon, Werkruimte, mobiel ontwerp en actualiteitswaarborg.

## Verdiepende onderbouwing

### Centrale vraag

> Als Donovan Atlas iedere ochtend opent, wat moet hij dan binnen tien
> seconden begrijpen?

Het antwoord bestaat uit vijf dingen:

1. waar we werkelijk staan;
2. waarom we daar staan;
3. wat vandaag aandacht verdient;
4. wat bewust kan wachten;
5. welke ontwikkelingen alleen observatie vragen.

De Workspace hoeft in die tien seconden nog niet te laten zien wat Atlas
allemaal kan. Hij moet laten voelen dat Atlas al heeft nagedacht voordat de
werkdag begint.

---

## Verdieping — Review van de huidige Workspace

### Eerste indruk

De huidige opening voelt rustig, premium en redactioneel. Het grote
typografische gebaar en de donkere, gelaagde compositie geven Atlas een eigen
wereld.

De inhoudelijke eerste indruk klopt echter niet meer met de actuele
werkelijkheid. De opening zegt:

> Actueel casebeeld vraagt herbevestiging.

Daarmee begint de dag bij een interne onzekerheid uit Case 0001, terwijl de
werkelijke actuele grens nu is:

> Productie staat stabiel. De Production Track staat HOLD totdat TransIP
> reageert.

De vorm geeft vertrouwen; de boodschap vraagt direct om reconstructiewerk van
Donovan.

### Focus

De Workspace heeft meerdere concurrerende centra:

- de hero met Case 0001;
- de Orientation Layer;
- Werkbeeld;
- Vandaag;
- Oriëntatie;
- Cases;
- Understanding;
- Ideeën;
- Logboek.

Er is veel betekenisvolle inhoud, maar onvoldoende redactionele keuze in wat
eerst komt. De Workspace toont de beschikbare werkelijkheid grotendeels
tegelijk, in plaats van eerst te bepalen welk deel vandaag betekenis heeft.

### Rust

Visueel is er rust binnen afzonderlijke onderdelen. Over de volledige pagina
ontstaat toch cognitieve druk:

- negen primaire navigatie-items;
- veel opeenvolgende kaarten en statuslabels;
- bronpaden en interne classificaties in de primaire leeslaag;
- meerdere lange dossiers volledig open in de hoofdpagina;
- formulieren en beslisgereedschap voordat een werkvraag is gekozen.

De Workspace is rustig vormgegeven, maar nog niet rustig geredigeerd.

### Hiërarchie

Bij een viewport van 1280 × 720 pixels:

- neemt de opening de volledige eerste viewport in;
- begint de actuele Orientation Layer pas rond 865 pixels;
- is de volledige pagina circa 10.424 pixels hoog;
- bevat de primaire navigatie negen bestemmingen.

De informatie die de ochtendvraag moet beantwoorden staat dus niet in de
eerste tien seconden. Zij staat onder een visueel dominante, inhoudelijk
verouderde opening.

### Betekenis en actualiteit

De Orientation Layer was een goede stap: hij benoemt fase, uitvoering,
laatste GO en volgende stap. De inhoud is inmiddels verouderd:

- actieve fase: `Workspace synchroniseren`;
- actieve uitvoering: `Atlas Workspace Sync 001`;
- laatste GO: `Release Reality Alignment`;
- volgende stap: de Orientation Layer beoordelen.

De werkelijkheid is verder:

- Workspace Sync 001 is afgerond;
- Candidate Canonicalization en Preview Alignment zijn afgerond;
- de Experience is goedgekeurd;
- releasevalidatie en rollback zijn bewezen;
- productie is stabiel;
- de Production Track staat HOLD in afwachting van TransIP;
- de aandacht verschuift naar Atlas Workspace 002.

Een dagelijkse begeleider mag nooit vragen dat Donovan eerst zelf de actuele
status corrigeert.

### Redactionele kwaliteit

Sterk:

- onderscheidende, menselijke schrijfstem;
- duidelijke bewijsgrenzen;
- zorgvuldige formulering van onzekerheid;
- geen geforceerde positiviteit;
- betekenis gaat vaak vóór administratie.

Te intern voor de eerste leeslaag:

- `Confirmed revision`;
- `Candidate`;
- `Execution Template`;
- bronpaden;
- implementatiestatussen;
- technische autoriteitslabels.

Deze taal is waardevol als herkomst en bewijs, maar niet als eerste antwoord
op een gewone werkdag.

### Vertrouwen

De Workspace bouwt vertrouwen door niet te doen alsof onzekerheid al is
opgelost. Dat principe moet blijven.

Vertrouwen verzwakt wanneer actuele en verouderde status naast elkaar staan.
Dan moet Donovan bepalen welke laag gezaghebbend is. Atlas moet die redactie
juist vooraf hebben gedaan.

### Doorstroming

De huidige route is grotendeels gebaseerd op de structuur van het systeem:

`Overzicht → Werkbeeld → Oriëntatie → Waarnemen → Vandaag → Cases →
Understanding → Ideeën → Logboek`

De gewenste route volgt de werkdag:

`Kompas → Aandacht → Stilte → Horizon → Verdiepen`

Dat is geen cosmetisch verschil. Het verplaatst het uitgangspunt van
beschikbare onderdelen naar betekenis voor vandaag.

---

## Verdieping — Concrete verbeterprincipes

### A. Maak de eerste viewport gezaghebbend

De eerste viewport moet één actuele redactionele conclusie tonen, inclusief
de reden en één betekenisvolle vervolgrichting.

Niet:

> Actueel casebeeld vraagt herbevestiging.

Wel:

> Productie staat stabiel. We wachten op TransIP.

Met daaronder:

> De releaseketen, validatie en rollback zijn bewezen. De laatste
> infrastructuurvraag ligt buiten onze beheersomgeving.

En als aandacht voor vandaag:

> Geef Atlas Workspace 002 vorm als dagelijkse begeleider.

### B. Eén bron voor actuele oriëntatie

Opening, Orientation Layer, Vandaag en Cases mogen niet ieder hun eigen
samenvatting van de werkelijkheid dragen.

De implementatie heeft één redactioneel `dailyBrief` nodig waaruit de eerste
leeslaag wordt opgebouwd:

- status;
- reden;
- aandacht;
- stilte;
- horizon;
- bewijsdatum;
- terugkeertrigger.

Dit is geen nieuw dashboardmodel. Het is één canonieke redactionele
samenvatting.

### C. Scheid dagelijkse begeleiding van de werkbank

Atlas heeft twee gebruikslagen:

1. **Daily Companion** — begrijpen wat vandaag betekenis heeft;
2. **Werkruimte** — cases, waarnemingen, Understanding, ideeën en logboek
   openen wanneer verdieping nodig is.

De werkbank blijft beschikbaar, maar bepaalt niet langer de eerste indruk.

### D. Gebruik stilte als actieve informatie

Wat niet hoeft, verdient expliciete rust.

Voor de huidige werkelijkheid:

- geen nieuwe productiepublicatie;
- geen nieuwe infrastructuuranalyse;
- geen workaround;
- geen nieuwe DocumentRoot-switch.

Stilte is hier geen lege toestand. Het is een bewezen grens die voorkomt dat
Donovan opnieuw hoeft te beoordelen wat al bewust is geparkeerd.

### E. Beperk Horizon tot ontwikkelingen met een terugkeertrigger

Horizon toont geen ideeënvoorraad. Alleen ontwikkelingen die later mogelijk
betekenis krijgen én een duidelijke terugkeertrigger hebben.

Maximaal drie regels in de eerste leeslaag. De rest blijft in de werkbank.

### F. Verplaats technische herkomst naar de tweede leeslaag

Bronpaden, authority labels, implementatieclassificaties en volledige
bewijsdossiers blijven beschikbaar in details of de betreffende case.

Zij hoeven niet te concurreren met de dagelijkse conclusie.

### G. Verwijder herhaling, niet de onderliggende werkelijkheid

De uitgebreide Bij Cees-delivery review, Understanding en Waarnemingen zijn
waardevol. Het probleem is niet hun bestaan, maar hun permanente, volledige
aanwezigheid in de hoofdroute.

De juiste ingreep is redactionele begrenzing en progressive disclosure, geen
verlies van bewijs.

---

## Verdieping — Informatiehiërarchie

### Laag 1 — Kompas

Beantwoordt:

- Waar staan we?
- Waarom staan we daar?

Bevat:

- datum en begroeting;
- één actuele statuszin;
- maximaal twee regels context;
- bewijsdatum of laatste bevestigd moment;
- één terugkeertrigger wanneer de status HOLD of Stilte is.

### Laag 2 — Vandaag

Beantwoordt:

- Wat verdient vandaag aandacht?

Bevat maximaal één primaire aandacht en eventueel één ondersteunende
observatie.

Een aandachtspunt is geen taak uit een backlog. Het is de eerstvolgende
betekenisvolle stap die logisch uit de werkelijkheid volgt.

### Laag 3 — Stilte

Beantwoordt:

- Wat hoeft vandaag niet?
- Welke grens beschermt onze aandacht?

Bevat maximaal drie bewust geparkeerde onderwerpen, in gewone taal.

### Laag 4 — Horizon

Beantwoordt:

- Wat verdient observatie, maar nog geen actie?

Bevat maximaal drie ontwikkelingen met:

- korte observatie;
- waarom Atlas dit bewaart;
- terugkeertrigger.

### Laag 5 — Werkruimte

Beantwoordt:

- Waar ga ik heen wanneer ik wil verdiepen of vastleggen?

Bevat toegang tot:

- Cases;
- Waarnemen;
- Understanding;
- Ideeën;
- Logboek.

De werkruimte blijft functioneel rijk, maar is visueel en redactioneel
secundair aan het dagelijkse kompas.

---

## Verdieping — Gecombineerde schermschets

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Atlas                                              woensdag 29 juli │
├─────────────────────────────────────────────────────────────────────┤
│ Goedemorgen, Donovan.                                                │
│                                                                     │
│ Productie staat stabiel.                                            │
│ We wachten op TransIP.                                              │
│                                                                     │
│ De releaseketen, validatie en rollback zijn bewezen.                │
│ De laatste infrastructuurvraag ligt buiten onze beheersomgeving.    │
│                                                                     │
│ Laatst bevestigd · 29 juli       Terugkeer · reactie van TransIP    │
├─────────────────────────────────┬───────────────────────────────────┤
│ VANDAAG                         │ STILTE                            │
│                                 │                                   │
│ Geef Atlas Workspace 002 vorm   │ Geen nieuwe publicatie.           │
│ als dagelijkse begeleider.      │ Geen nieuwe infrastructuuranalyse.│
│                                 │ Geen workaround.                   │
│ Waarom dit nu betekenis heeft → │                                   │
├─────────────────────────────────┴───────────────────────────────────┤
│ HORIZON                                                             │
│ ○ Bij Cees · terug bij nieuw praktijkbewijs                         │
│ ○ Experience Preview · terug na representatieve publieke basis      │
│ ○ Workspace-evolutie · observeren tijdens dagelijks gebruik         │
├─────────────────────────────────────────────────────────────────────┤
│ VERDER WERKEN                                                       │
│ Cases · Waarnemen · Understanding · Ideeën · Logboek                │
└─────────────────────────────────────────────────────────────────────┘
```

### Desktop

- De volledige Kompas-, Vandaag- en Stilte-laag past binnen ongeveer één
  viewport.
- Vandaag en Stilte staan naast elkaar, maar krijgen niet hetzelfde
  visuele gewicht: aandacht is primair, stilte ondersteunend.
- Horizon begint zichtbaar aan de onderrand en nodigt uit zonder te trekken.

### Mobiel

- Volgorde: Kompas → Vandaag → Stilte → Horizon → Werkruimte.
- Geen kaartcarrousel.
- Geen horizontale hoofdnavigatie met negen items.
- Status en reden blijven samen; zij mogen niet over meerdere schermen uit
  elkaar vallen.

---

## Verdieping — Verwijderingsprincipes

### Uit de primaire leeslaag verwijderen

- de beeldvullende Case 0001-opening;
- de aparte generieke Workspace-header;
- de dubbele Orientation Layer onder de opening;
- de negen genummerde hoofdnavigatie-items;
- tellingen zoals `4 candidates`, tenzij zij vandaag betekenis hebben;
- volledige bronpaden;
- `Powered by Atlas` als losse statusregel;
- het volledige Bij Cees-werkdossier;
- formulieren voor Understanding, ideeën en logboek;
- de dagorganisator `0/3` als eerste werkmodel.

### Niet verwijderen uit Atlas

- casebewijs;
- Waarnemingen;
- Understanding-relaties;
- revisiegeschiedenis;
- ideeën;
- logboek;
- delivery review;
- bewijsgrenzen;
- terugkeertriggers.

Deze onderdelen verhuizen naar de Werkruimte of een tweede leeslaag.

---

## Verdieping — Redactionele uitwerking

### Van systeemtaal naar dagelijkse taal

| Huidig | Daily Companion |
|---|---|
| Actieve uitvoering | Waar we mee bezig zijn |
| Laatste GO | Laatst bevestigd |
| Eerstvolgende stap | Wat nu aandacht verdient |
| Candidate | Voorstel |
| Confirmed revision | Bevestigd beeld |
| Open voor beoordeling | Nog te begrijpen |
| Horizon | Kan wachten tot… |
| Geen automatische conclusie | Atlas wacht op bewijs |

### Schrijfregel

Iedere zin in de eerste leeslaag moet minstens één van deze functies hebben:

- richting geven;
- een reden geven;
- aandacht begrenzen;
- onzekerheid eerlijk benoemen;
- een terugkeertrigger bewaren.

Een zin die alleen de interne status van Atlas beschrijft, hoort niet in de
eerste leeslaag.

### Toon

De toon blijft:

- rustig;
- precies;
- menselijk;
- zonder urgentietheater;
- zonder productiviteitsdruk;
- zonder de indruk dat Atlas zelfstandig besluiten neemt.

---

## Verdieping — Implementatievoorstellen

### Voorstel 002A — Daily Compass

**Inhoud:** vervang de huidige hero en dubbele Orientation Layer door één
actuele eerste viewport met status, reden, aandacht en terugkeertrigger.

**Besluit:** **GO**

**Waarom:** dit lost de centrale tien-secondenvraag direct op en verwijdert de
grootste actuele vertekening.

### Voorstel 002B — Eén canonieke daily brief

**Inhoud:** bouw de eerste leeslaag vanuit één expliciete redactionele
datastructuur in plaats van losse statuszinnen per sectie.

**Besluit:** **GO**

**Waarom:** voorkomt dat Opening, Vandaag en Cases verschillende
werkelijkheden tonen.

**Bewijsgrens:** in de eerste versie mag deze bron handmatig en expliciet
worden onderhouden. Geen automatische waarheidsclaim.

### Voorstel 002C — Vandaag, Stilte en Horizon

**Inhoud:** introduceer drie redactionele banen:

- één betekenisvolle aandacht;
- maximaal drie bewuste stiltegrenzen;
- maximaal drie horizonobservaties met terugkeertrigger.

**Besluit:** **GO**

**Waarom:** maakt prioriteit zichtbaar zonder takenlijst of dashboard te
worden.

### Voorstel 002D — Werkruimte als tweede leeslaag

**Inhoud:** behoud Cases, Waarnemen, Understanding, Ideeën en Logboek, maar
plaats ze na de dagelijkse begeleiding onder één herkenbare ingang.

**Besluit:** **GO**

**Waarom:** bewaart alle bestaande waarde en verlaagt de cognitieve belasting
van de eerste werkminuten.

### Voorstel 002E — Dossiers standaard begrenzen

**Inhoud:** toon in de hoofdroute alleen conclusie, bewijsgrens en
eerstvolgende betekenisvolle vraag. Open het volledige dossier pas op verzoek.

**Besluit:** **GO**

**Waarom:** Atlas blijft bewijsrijk zonder dat iedere werkdag met een volledig
onderzoeksrapport begint.

### Voorstel 002F — Automatische prioritering

**Inhoud:** Atlas kiest autonoom welke case of actie vandaag prioriteit heeft.

**Besluit:** **NO GO**

**Waarom:** de huidige bronnen rechtvaardigen geen autonome prioriteitsclaim.
Atlas mag voorbereiden en voorstellen; Donovan beslist.

### Voorstel 002G — Klassiek dashboard

**Inhoud:** statistieken, voortgangspercentages, counters, grafieken en
statuswidgets als primaire interface.

**Besluit:** **NO GO**

**Waarom:** meer administratie geeft geen beter begrip en verschuift Atlas
naar rapportagesoftware.

### Voorstel 002H — Dagelijkse takenlijst

**Inhoud:** meerdere acties met deadlines, vinkjes en urgentieniveaus.

**Besluit:** **NO GO**

**Waarom:** Donovan moet minder projectmanager worden. Atlas toont één
betekenisvolle aandacht, geen nieuwe backlog.

---

## Verdieping — Implementatiecandidate in samenhang

De voorstellen 002A tot en met 002E vormen samen één ondeelbare candidate:

**Daily Companion Candidate 001**

De candidate is pas geslaagd wanneer Donovan binnen tien seconden correct kan
zeggen:

> Productie staat stabiel en wacht op TransIP. Dat hoeft vandaag niet verder.
> Mijn aandacht gaat nu naar de volgende evolutie van de Workspace. Bij Cees
> en de Experience Preview blijven zichtbaar, maar vragen nog geen actie.

Implementatievolgorde:

1. actualiseer en centraliseer de daily brief;
2. vervang de huidige opening en Orientation Layer;
3. voeg Vandaag, Stilte en Horizon als eerste leeslaag samen;
4. verplaats bestaande diepe onderdelen naar Werkruimte;
5. verwijder dubbele status- en navigatielagen;
6. valideer de tien-secondenvraag op desktop en mobiel;
7. controleer dat geen bewijs, revisie of lokale data verloren gaat.

Er is geen inhoudelijke reden om 002A tot en met 002E los te implementeren.
De waarde ontstaat uit hun samenhang.

---

## Atlas Reflection

### Waarneming

De huidige Workspace bezit veel van de juiste onderdelen, maar toont ze nog
te veel vanuit systeemstructuur. Een visueel rustige interface kan alsnog
onrustig zijn wanneer zij te weinig redactionele keuzes maakt.

### Begrip

Een dagelijkse begeleider hoeft niet eerst te bewijzen hoeveel hij weet. Hij
moet de werkelijkheid al hebben teruggebracht tot wat vandaag betekenis
heeft, wat stil mag blijven en wat alleen observatie verdient.

### Herbruikbare les

Meer context betekent niet meer interface. De meest volwassen Workspace is
niet degene met de meeste zichtbare informatie, maar degene die betrouwbaar
kan weglaten wat vandaag geen beslissing vraagt.

### Bewijsgrens

Deze review bewijst dat de huidige informatiehiërarchie de tien-secondenvraag
niet beantwoordt. Zij bewijst nog niet welke dagelijkse samenvatting in
langdurig gebruik het meest behulpzaam is. Dat moet na implementatie in echte
ochtenden worden waargenomen.

### Onzekerheid

Nog te toetsen:

- of één aandachtspunt voldoende houvast geeft;
- of Stilte dagelijks waardevol blijft of alleen bij actieve HOLD-grenzen;
- hoeveel Horizonregels zichtbaar mogen zijn zonder nieuwe mentale voorraad
  te worden;
- welke handmatige bron de daily brief betrouwbaar actueel houdt.

### Terugkeertrigger

Herbeoordeel de informatiehiërarchie nadat Donovan de Daily Companion op
minimaal vijf echte werkdagen heeft geopend en heeft vastgelegd:

- wat direct duidelijk was;
- welke vraag alsnog zelf gereconstrueerd moest worden;
- wat onnodig aandacht trok;
- welke werkelijkheid ontbrak.

### Atlas Recommendation

**Workspace Sync aanbevolen:** implementeer Daily Companion Candidate 001 als
één begrensde evolutie. Voeg geen automatische prioritering, dashboardmetrics
of takenmanagement toe.

### Wanneer voelt Atlas als een dagelijkse begeleider in plaats van software?

Atlas voelt als een dagelijkse begeleider wanneer Donovan na het openen niet
hoeft te zoeken, filteren of de status te reconstrueren, maar direct merkt:

> Atlas begrijpt waar we staan, bewaakt wat vandaag niet hoeft en laat precies
> genoeg zien om met aandacht aan het juiste te beginnen.
