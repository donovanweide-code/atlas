# UXA-02 — Implementation Review

Datum: 5 augustus 2026  
Status: kandidaat voor GO

## 1. Readiness Check

- **Doel:** UXA-02 volledig afronden.
- **Scope:** uitsluitend inhoud, copy, privacytaal en legacy-afbouw binnen de bestaande Experience.
- **Buiten scope:** functionaliteit, routing, nieuwe Experience-stappen, observatieflows, authenticatie, infrastructuur en overige UXA-projecten.
- **Omvang:** S.
- **Creditverbruik:** laag.
- **Hergebruik:** de bestaande Experience, UXA-01-routes, tokenarchitectuur, sessiestore en Observatory-componenten zijn ongewijzigd hergebruikt.

## 2. Implementatie

UXA-02 scheidt de taal nu consequent in twee contexten:

1. De publieke Experience is één menselijke kennismaking via `/ervaar`; een uitnodiging is nergens meer het hoofdconcept.
2. Bestaande tokengebonden Experiences blijven een persoonlijke, beveiligde toegang voor compatibiliteit en het hervatten van bestaande sessies.

Er zijn geen routes, datamodellen, API-contracten, authenticatiestappen of Experience-stappen toegevoegd of gewijzigd. Bestaande foutcodes zoals `INVITATION_INVALID`, `INVITATION_EXPIRED` en `INVITATION_REVOKED` zijn bewust behouden als technisch contract; alleen de zichtbare menselijke tekst is aangepast.

## 3. Overzicht van alle aangepaste teksten

### 3.1 Tokengebonden Experience

| Context | Voor UXA-02 | Na UXA-02 |
| --- | --- | --- |
| Transparantie bij start | `persoonlijke uitnodiging` | `persoonlijke Experience-toegang` |
| Toegang en hervatten | `Met dezelfde persoonlijke link kun je later terugkomen.` | `Via deze beveiligde persoonlijke toegang kun je later terugkomen.` |
| Afgeronde sessie | `bij deze uitnodiging` | `bij jouw Experience` |
| Afgeronde sessie hervatten | `dezelfde persoonlijke link` | `deze beveiligde persoonlijke toegang` |
| Statuslabel bij fout | `Persoonlijke uitnodiging` | `Persoonlijke toegang` |
| Laden | `Je persoonlijke uitnodiging wordt rustig geopend…` | `Je persoonlijke Experience wordt rustig geopend…` |
| Ingetrokken toegang | `Deze uitnodiging is niet meer actief.` | `Deze persoonlijke toegang is niet meer actief.` |
| Verlopen/ingetrokken | `Deze persoonlijke uitnodiging is ingetrokken of verlopen.` | `Deze persoonlijke toegang is ingetrokken of verlopen.` |
| Ongeldig | `Deze persoonlijke uitnodiging is niet geldig.` | `Deze persoonlijke toegang is niet geldig.` |
| Algemene fout | `Je persoonlijke uitnodiging kon niet worden geopend.` | `Je persoonlijke Experience kon niet worden geopend.` |
| Foutkop | `We kunnen deze uitnodiging niet openen.` | `We kunnen deze persoonlijke Experience niet openen.` |

### 3.2 Privacytaal

| Context | Voor UXA-02 | Na UXA-02 |
| --- | --- | --- |
| Wie kan dit zien | Algemene verwijzing naar de interne omgeving | Expliciete positionering als `afgeschermde Observatory voor intern onderzoek, menselijke review en historische Experience-continuïteit` |

De privacytekst belooft geen nieuwe gegevensverwerking en verandert geen bewaartermijn, toestemming of toegangsmodel.

### 3.3 Observatory

| Context | Voor UXA-02 | Na UXA-02 |
| --- | --- | --- |
| Loginintro | Algemene Observatory-toegang | `afgeschermde interne omgeving voor onderzoek, menselijke review en historische Experiences` |
| Overzichtskicker | Algemene Observatory-benaming | `Interne onderzoeks- en reviewomgeving` |
| Overzichtskop | Oude operationele positionering | `Wat echte Experiences ons leren.` |
| Overzichtsintro | Experiences en observaties zonder expliciete rolverdeling | Experiences afzonderlijk beoordelen, historie behouden en menselijke observaties gescheiden houden van woorden van deelnemers |
| Statistiek | `Persoonlijke links` | `Tokengebonden sessies` |
| Recordfallback | Uitnodigingsgerichte omschrijving | `Tokensessie zonder interne omschrijving` |
| Toegangstype | Uitnodigingsgerichte omschrijving | `Tokengebonden toegang` |
| Legacy-sectiekicker | Niet expliciet als legacy gepositioneerd | `Legacy tokencompatibiliteit` |
| Legacy-sectiekop | `Maak een persoonlijke uitnodiging` | `Maak alleen indien nodig een persoonlijke toegang` |
| Legacy-uitleg | Uitnodiging als reguliere handeling | `De normale Experience begint op /ervaar. Gebruik deze bestaande tokenroute alleen voor gerichte compatibiliteit of technische acceptatie.` |
| Legacy-knop | Uitnodiging maken | `Maak persoonlijke toegangslink` |
| Eventlabel | `Persoonlijke uitnodiging geopend` | `Persoonlijke toegang geopend` |
| Intrekken | Uitnodigingsgerichte labels | `Trek toegang in` en `Deze toegang is ingetrokken.` |
| Bevestiging | Uitnodigingslink aangemaakt | `Persoonlijke toegangslink aangemaakt.` |
| Eenmalige code-uitleg | Uitnodigingscode | `de toegangscode wordt alleen nu getoond` |

### 3.4 Server- en lokale validatiefouten

De productie-API en de lokale validatieserver gebruiken nu dezelfde zichtbare terminologie:

- `toegangscode` in plaats van `uitnodigingscode`;
- `persoonlijke toegang` in plaats van `persoonlijke uitnodiging`;
- `Deze Experience bestaat niet` voor een ontbrekend intern record;
- neutrale teksten voor ongeldig, verlopen en ingetrokken toegang.

De technische responsstatussen en foutcodes zijn niet gewijzigd.

## 4. Validatie

### 4.1 Geautomatiseerd

| Controle | Resultaat |
| --- | --- |
| `npm.cmd run build:experience` | PASS — Experience-package succesvol gebouwd |
| `npm.cmd test` | PASS — 213/213 tests |
| Nieuwe UXA-02-copytests | PASS — 3/3 |
| UXA-01-routecompatibiliteit | PASS — 4/4 |
| Statische scan op verouderde zichtbare copy | PASS — geen resterende zichtbare primaire uitnodigingstaal |

De nieuwe tests bewaken:

- afwezigheid van `persoonlijke uitnodiging`, `dezelfde persoonlijke link` en `vraag een nieuwe uitnodiging` in de zichtbare Experience-copy;
- expliciete Observatory-positionering als onderzoek, review en historie;
- afwezigheid van de oude primaire Observatory-handeling `Maak een persoonlijke uitnodiging`;
- neutrale foutteksten, met behoud van bestaande technische tokenfoutcodes.

### 4.2 Browserreview

| Scenario | Resultaat |
| --- | --- |
| `/ervaar` desktop, 1440 × 900 | PASS — canonieke First Visit V2, geen horizontale overflow |
| Privacy mobiel, 430 × 932 | PASS — volledige tekst leesbaar, geen horizontale overflow |
| Privacy tablet, 768 × 1024 | PASS — volledige tekst leesbaar, geen horizontale overflow |
| Observatory desktop, 1440 × 900 | PASS — onderzoek/review/historie expliciet; lege toestand en legacy-sectie correct |
| Geldige token | PASS — token wordt uitgewisseld en bestaande Experience start |
| Bestaande sessie hervatten | PASS — dezelfde actieve vraag blijft na herladen beschikbaar |
| Ongeldige token | PASS — neutrale toegangstaal, geen uitnodiging als hoofdconcept |
| Verlopen token | PASS — neutrale toegangstaal en geen persoonsgegevens zichtbaar |
| Ontbrekende token op `/e/` | PASS — rustige doorverwijzing naar `/ervaar` |
| Legacy-toegang aanmaken | PASS — uitsluitend als compatibiliteitsinstrument gepositioneerd |
| Browserconsole | PASS — geen fouten in publieke Experience, tokensessie of Observatory |

## 5. Screenshots

- `screenshots/uxa-02/uxa-02-ervaar-desktop-1440x900.jpg`
- `screenshots/uxa-02/uxa-02-privacy-mobile-430x932.jpg`
- `screenshots/uxa-02/uxa-02-observatory-desktop-1440x900.jpg`

## 6. Reviewconclusie

- De Experience draagt overal dezelfde visie uit: één menselijke kennismaking via `/ervaar`.
- Persoonlijke uitnodigingen zijn niet langer de publieke of inhoudelijke hoofdroute.
- Tokengebonden taal blijft alleen aanwezig waar die functioneel waar is: geldige tokens, bestaande sessies en hervatten.
- Observatory is expliciet gepositioneerd als intern onderzoeksinstrument, reviewomgeving en historische Experience-omgeving.
- De bestaande tokenarchitectuur en sessiecompatibiliteit zijn volledig behouden.
- De implementatie blijft volledig binnen UXA-02.

## 7. Advies

UXA-02 is inhoudelijk en technisch gereed voor review. Advies: **GO voor UXA-02**.

