# Workspace Navigation Experience — voorstel V1

**Status:** ontwerpvoorstel; geen implementatie  
**Onderdeel van:** complete UX-, architectuur- en inhoudsreview van 5 augustus
2026

## Ontwerpintentie

De navigatie moet voelen als een rustig kompas: zij maakt plaats, richting en
betekenis zichtbaar zonder het werk voortdurend te onderbreken. De gebruiker
ziet niet wat “ongelezen” is, maar wat nu aandacht verdient en waarom.

De huidige routes, het officiële WBD-logo, de warme donkere basis, crème actieve
staat en Workspace-selector blijven de fundering.

## Vijf ontwerpprincipes

1. **Richting boven melding.** Een markering wijst naar betekenis, niet naar
   activiteit om de activiteit.
2. **Eén primaire aandacht.** Nooit meerdere concurrerende gouden signalen in
   dezelfde groep.
3. **Eigen beeldtaal.** Kleine WBD-lijniconen, geen generieke dashboardset.
4. **Uitlegbaar.** Iedere indicator heeft een menselijke tekst en een zichtbare
   onderbouwing op de doelpagina.
5. **Rust bij afwezigheid.** Een item zonder actuele betekenis toont geen badge,
   teller of decoratieve status.

## Anatomie van één navigatie-item

```text
┌────────────────────────────────────────────┐
│ [lijnicoon]  Organisaties              ○   │
│              2 te beoordelen               │
└────────────────────────────────────────────┘
```

De tweede regel bestaat alleen wanneer hij een beslissing ondersteunt. De
gouden stip is ongevuld en betekent altijd “menselijke beoordeling nodig”. Zij
betekent nooit “nieuw” of “ongelezen”.

## Visuele staten

### Rust

- gedempt crème label;
- lijnicoon op 65–75% contrast;
- geen indicator;
- transparante achtergrond.

### Hover

- zachte crème-wash;
- label en icoon worden één contraststap helderder;
- 160–180 ms overgang;
- geen schaal, bounce of gloed.

### Actieve pagina

- vol crème vlak;
- donkere tekst en icoon;
- korte goudlijn als gekozen richting;
- `aria-current="page"` blijft de semantische bron.

### Verdient aandacht

- kleine ongevulde gouden stip of korte goudlijn;
- tekst “Verdient aandacht” of een concreet label zoals “2 te beoordelen”;
- niet pulseren;
- niet combineren met nog een activiteitsmarkering.

### Bevestigd

- alleen bij besliswaarde een gedempt groen checkteken;
- geen permanent “succes”-tapijt in de navigatie;
- verdwijnt wanneer bevestiging geen dagelijkse betekenis meer heeft.

### Horizon / bewuste stilte

- zachtere labelkleur;
- geen badge;
- betekenis wordt op de pagina uitgelegd.

## WBD-iconografie

Alle iconen gebruiken dezelfde basis:

- canvas 18×18 px;
- lijn 1.25–1.5 px;
- afgeronde uiteinden;
- maximaal drie visuele delen;
- geen ingevulde pictogrammen;
- één geometrische familie met horizon, verbinding en begrenzing als motieven.

| Route | Motief |
| --- | --- |
| Overzicht | horizon met één gekozen punt |
| Organisaties | twee verbonden kaders |
| Projecten | begrensd pad |
| Ontwikkelpartners | twee lijnen met gedeelde richting |
| Ontwikkeling | opeenvolgende lagen |
| Business Foundation | dragend raster / ledger |
| Infrastructuur | basis met verbinding |
| Kennisvoorstellen | open bronkader |

Vermijd huisjes, tandwielen, bellen, enveloppen en andere standaard
softwaremetaforen.

## Inhoudelijke groepering

```text
Overzicht

RELATIES
  Organisaties
  Ontwikkelpartners

WERK
  Projecten
  Ontwikkeling

BEDRIJF
  Business Foundation
  Infrastructuur

KENNIS
  Kennisvoorstellen
```

De groepslabels zijn klein, niet klikbaar en krijgen extra ruimte erboven. De
huidige URL's en functies hoeven hiervoor niet te veranderen.

## Atlas-variant

Atlas gebruikt dezelfde interactiegrammatica, maar andere methodische iconen:

| Route | Motief |
| --- | --- |
| Vandaag | eerste licht aan de horizon |
| Werkelijkheid | geaarde horizontale lijn |
| Observaties / beoordelen | open cirkel met bronlijn |
| Horizon | lijn die bewust buiten beeld doorloopt |
| Werkruimte | open kader |
| Fundament | drie dragende lagen |

De primaire Atlas-navigatie blijft klein. `Fundament` staat als secundaire route
onderaan. Observaties worden alleen primair zichtbaar wanneer werkelijk iets op
menselijke beoordeling wacht.

## Workspace-selector

De officiële merklock-up staat eenmaal vast. De selector toont:

- klein label `Actieve Workspace`;
- naam van de huidige Workspace;
- rustige chevron;
- bij openen drie opties met naam, één regel betekenis en huidige status.

De selector toont geen kaarten, productbadges of alternatieve logo's. Een andere
Workspace openen is een contextwisseling; dat mag met een korte crème highlight
worden bevestigd.

## Responsive gedrag

### Desktop

- iconen, labels en eventuele tweede regel zichtbaar;
- groepslabels zichtbaar;
- aandachttekst alleen wanneer nodig.

### Tablet

- horizontale navigatie mag blijven;
- iconen en labels blijven samen;
- groepslabels verdwijnen uit de balk;
- aandacht wordt een kleine stip; uitleg staat op de doelpagina.

### Mobiel

- geen numerieke badges in de navigatie;
- actieve staat blijft crème;
- minimaal 44 px tikhoogte;
- horizontale scroll behoudt rustige snap en verbergt de native scrollbar;
- de eerste vier relevante items moeten zonder documentoverflow bereikbaar zijn.

## Toegankelijkheid

- iconen zijn decoratief wanneer het tekstlabel hetzelfde zegt;
- een aandachtstip krijgt een verborgen of zichtbare tekst, nooit alleen kleur;
- actieve route gebruikt `aria-current`;
- contrast blijft minimaal gelijk aan de huidige gepolijste shell;
- focus gebruikt de gedeelde gouden focusring;
- reduced motion verwijdert alle niet-noodzakelijke overgangen.

## Wat dit voorstel niet bevat

- geen notificatiecentrum;
- geen ongelezenstatus;
- geen realtime activiteit;
- geen rode badges;
- geen automatische prioritering;
- geen telling zonder besliswaarde;
- geen nieuwe routes of functionaliteit.

## Prototypevolgorde

Beoordeel vóór implementatie vier statische toestanden:

1. WBD desktop in rust;
2. WBD desktop met één item “Verdient aandacht”;
3. Atlas desktop met secundair Fundament;
4. mobiel met actieve route en één stille aandachtstip.

Pas na goedkeuring worden de bestaande shell en navigatiecomponenten aangepast.

## Acceptatievragen

1. Is binnen drie seconden duidelijk waar de gebruiker is?
2. Is maximaal één primaire aandacht zichtbaar?
3. Kan de gebruiker uitleggen waarom die aandacht bestaat?
4. Voelt de navigatie als begeleiding in plaats van softwarebediening?
5. Blijft de omgeving rustig wanneer er niets te beoordelen is?
6. Werkt dezelfde grammatica geloofwaardig voor WBD en Atlas?
