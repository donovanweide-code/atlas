# WS-VIS.2 — Visual System & Responsive Interaction Specification

**Datum:** 2026-08-07  
**Status:** **SPECIFICATION GO — NO-GO voor pixel-perfect en application implementation**  
**Scope:** provider- en frameworkneutraal visueel systeem, responsive gedrag en interaction patterns  
**Beslisser:** menselijke review; iedere implementatiefase vereist een afzonderlijke expliciete GO

Normatieve termen: **MUST** is verplicht voor conformiteit met deze specificatie; **SHOULD** is de standaard tenzij aantoonbaar een betere oplossing bestaat; **MAY** is toegestaan maar niet vereist.

## 1. Status

WS-VIS.1 is menselijk goedgekeurd als visuele richting. WS-VIS.2 maakt die richting deterministisch genoeg voor een latere implementatiepreflight, maar geeft geen toestemming om code, CSS, routes, data, database, infrastructuur, productie of deployment te wijzigen.

**Preflight:** risico laag; omvang middel/hoog; indicatieve Codex-creditbandbreedte €20–50. Werkelijke eurocredits zijn niet zichtbaar en worden niet verzonnen.

De Workspace moet voelen als: **de bestaande We Build And Design-identiteit die volwassen is geworden tot een rustige, moderne dagelijkse werkomgeving.**

## 2. Bronnen en baselines

Canonieke input:

1. `PROJECT-WS-VIS1-WORKSPACE-VISUAL-DIRECTION-CONCEPT.md` — goedgekeurde visuele richting en vier conceptbeelden.
2. `evidence/ws-vis-0/2026-08-07/README.md` en bijbehorende screenshots — feitelijke nulmeting.
3. `PROJECT-WBD-WORKSPACE-CANONICAL-REVIEW.md` — product-, trust-, mobile-, organisation- en attention-grenzen.
4. `PROJECT-002C-WORKSPACE-ARCHITECTURE-INPUT.md` — Workspace/infrastructuur-afhankelijkheden.
5. Bestaande WBD-basistokens in `website/src/styles/variables.css` — alleen read-only familie-evidence, niet automatisch de nieuwe implementatie.
6. W3C WCAG 2.2 als accessibility-baseline.

WS-VIS.0 bewijst huidige zichtbare staat, niet functionaliteit. WS-VIS.1-PNG’s bewijzen visuele richting, niet exacte maten of componentgedrag. Dit document is vanaf nu de canonieke visuele/interactionele specificatie; technische route-, identity- en datacontracten blijven eigendom van WS.1–WS.3.

## 3. Design principles

1. **Daily calm.** De interface ondersteunt langdurig dagelijks werk; geen campagnematige hero’s of constante urgentie.
2. **Attention, not notifications.** Eén dominante aandacht per context; relevantie en handelingsperspectief boven aantallen.
3. **Organisation first.** Organisatie, dossier en menselijk eigenaarschap vormen de werkcontext.
4. **Cream is work; green is structure.** Crème draagt lezen en werken. Donkergroen ankert navigatie en maximaal één primaire aandacht.
5. **Gold means something.** Goud markeert actieve/relevante betekenis; het is geen willekeurige decoratie.
6. **Editorial hierarchy, operational clarity.** Serif geeft identiteit en niveau; sans-serif draagt handelingen en compacte informatie.
7. **Progressive disclosure.** Samenvatting eerst, detail en invoer op verzoek.
8. **Density without dashboardisation.** Meer volume leidt tot groepering, filters en focusroutes, niet tot meer gelijkwaardige tegels.
9. **State is explicit.** Status gebruikt tekst plus vorm/iconografie; nooit kleur alleen.
10. **Trust through behavior.** Consistente feedback, herleidbare wijzigingen en begrijpelijke rechten; geen securitymarketing.
11. **Responsive re-composition.** Mobiel is een andere hiërarchie, niet een verkleinde desktop.
12. **Incremental continuity.** Behoud shell, WBD-beeldtaal en gevalideerde workflows; geen volledige rebuild zonder technische noodzaak.

## 4. Vastgestelde menselijke beslissingen

| Onderwerp | Vastgesteld besluit | Systeemgevolg |
|---|---|---|
| Desktopnavigatie | Permanent zichtbare compacte zijbalk | Basisbreedte 248 px; future collapse-state voorbereid maar niet vereist |
| Mobiele hoofdnavigatie | Home, Organisaties, Projecten, Financiën, Meer | Bottom navigation; Atlas en lage-frequentiecapabilities onder Meer |
| Primaire attention | Maximaal één dominant donkergroen item per context | Donkergroen is semantisch schaars, nooit standaardcardkleur |
| Titelgrootte | Expressief, één beheerste stap kleiner dan WS-VIS.1 | Schaal in sectie 6; langere namen mogen wrappen |
| Dossieracties desktop | Klein via rustige drawer/dialog; complex via focusroute | Geen universeel modalpatroon |
| Dossieracties mobiel | Inhoudelijke invoer via focusroute | Geen grote formulieren midden in het dossier |

De toekomstige collapsed desktoprail mag 72 px breed zijn, maar is **DEFERRED**. De informatiestructuur moet labels en iconen nu al scheiden zodat collapse later geen herontwerp vraagt.

## 5. Color tokens

### 5.1 Kern- en oppervlaktetokens

| Semantisch token | Waarde | Gebruik |
|---|---:|---|
| `color.workspace.background` | `#F3EEE4` | primaire werkachtergrond, warm crème |
| `color.surface.primary` | `#FBF8F2` | kaarten, panels, drawers op lichte basis |
| `color.surface.secondary` | `#EAE3D6` | gegroepeerde/ingetogen zones |
| `color.surface.sunken` | `#E2D9CA` | filters, compacte geselecteerde subzones |
| `color.navigation.background` | `#0D2D27` | desktoprail, mobiele topbar |
| `color.text.primary` | `#162722` | normale primaire tekst op lichte oppervlakken |
| `color.text.secondary` | `#465A52` | toelichting en secundaire data |
| `color.text.muted` | `#5E6E67` | metadata; niet kleiner dan metadata-token |
| `color.text.on-dark` | `#F0E6D2` | primaire tekst op donkergroen |
| `color.text.muted-on-dark` | `#B9C5BE` | secundaire tekst op donkergroen |
| `color.border.subtle` | `#D9D0C2` | niet-functionele groepering en cardgrenzen |
| `color.border.emphasized` | `#827667` | herkenbare controlgrens op licht |
| `color.wbd.dark-green` | `#123C33` | merkanker en primaire attention |
| `color.wbd.cream` | `#F0E6D2` | herkenbare WBD-crème |
| `color.wbd.gold` | `#C7A166` | merkaccent, grote/decoratieve niet-tekstvormen |
| `color.wbd.gold-text` | `#77511F` | links, kleine labels en tekstaccenten op crème |

### 5.2 Status- en interactiontokens

| Semantisch token | Waarde | Vormvereiste |
|---|---:|---|
| `color.attention.primary` | `#123C33` | volledige primaire rij/card, maximaal één |
| `color.attention.secondary` | `#EEE0C5` | lichte rij plus tekstlabel/icoon |
| `color.status.success` | `#2F6B4F` | check + label, niet kleur alleen |
| `color.status.warning` | `#835610` | waarschuwingsteken + label |
| `color.status.error` | `#9B3B32` | fouticoon + concrete fouttekst |
| `color.status.information` | `#315D67` | info-icoon + label |
| `color.disabled.foreground` | `#827D74` | alleen werkelijk disabled controls |
| `color.disabled.background` | `#E5DFD5` | disabled controlvlak; `aria-disabled/disabled` vereist |
| `color.focus.on-light` | `#8A5B13` | 2 px buitenring + 2 px offset |
| `color.focus.on-dark` | `#F0E6D2` | 2 px buitenring + 2 px offset |

### 5.3 Contrastregels

Normale tekst MUST minimaal 4.5:1 halen; grote tekst minimaal 3:1; betekenisvolle controlgrenzen, iconen en focusindicatie minimaal 3:1 tegen aangrenzende kleur. Voorbeelden uit deze set:

| Paar | Berekende ratio |
|---|---:|
| primary text / workspace background | 13.48:1 |
| secondary text / workspace background | 6.38:1 |
| muted text / workspace background | 4.65:1 |
| cream text / navigation background | 11.92:1 |
| muted-on-dark / navigation background | 8.29:1 |
| gold-text / workspace background | 6.09:1 |
| emphasized border / workspace background | 3.83:1 |
| primary attention cream / dark green | 9.86:1 |

`color.wbd.gold` meet slechts circa 2.08:1 op de workspaceachtergrond en MUST daarom niet worden gebruikt voor kleine tekst of als enige statusdrager. Gebruik `gold-text` voor tekst. Borders subtle hoeven niet zelfstandig een control te identificeren; functionele controls gebruiken `border.emphasized` of voldoende contrasterende fill/iconografie. Alle uiteindelijke combinaties moeten geautomatiseerd én visueel worden getest.

## 6. Typography system

### 6.1 Families

- `font.family.editorial`: `Georgia, "Times New Roman", serif` — display, pagina- en betekenisvolle sectietitels. Providerneutraal en aansluitend op de huidige WBD-familie.
- `font.family.operational`: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif` — navigatie, body, controls, metadata.
- Geen downloadfont is vereist. Een toekomstige merkfontwissel mag alleen wanneer metrics, diacritics, cijfers, performance en licentie zijn gevalideerd.

### 6.2 Rollen en schaal

| Rol/token | Desktop | Mobiel | Gewicht | Line-height | Letter-spacing / grens |
|---|---:|---:|---:|---:|---|
| `type.display` | 64 px | 42 px | 400 serif | 1.02 | `-0.035em`; Homegroet, max 18ch |
| `type.page-title` | 48 px | 34 px | 400 serif | 1.08 | `-0.025em`; max 26ch |
| `type.section-title` | 28 px | 24 px | 400 serif | 1.2 | `-0.015em`; max 32ch |
| `type.card-title` | 20 px | 19 px | 400/600 contextueel | 1.3 | normaal; max 38ch |
| `type.body` | 16 px | 16 px | 400 sans | 1.6 | max 68ch |
| `type.body-strong` | 16 px | 16 px | 600 sans | 1.5 | max 68ch |
| `type.metadata` | 13.5 px | 14 px | 400/500 sans | 1.45 | geen uppercase alinea’s |
| `type.label` | 14 px | 14 px | 600 sans | 1.35 | veldlabels boven control |
| `type.eyebrow` | 12.5 px | 12.5 px | 700 sans | 1.3 | `0.12em`, uppercase, max 1 regel |
| `type.navigation` | 15 px | 12–13 px bottomlabel | 500/600 sans | 1.25 | actieve staat niet alleen gewicht |
| `type.button` | 15 px | 15 px | 600 sans | 1.2 | sentence case, geen lange uppercase |
| `type.operational-compact` | 14 px | 14 px | 500 sans | 1.4 | nooit onder 14 px voor essentiële data |

`type.display` en `page-title` gebruiken fluid scaling tussen hun mobiele en desktopwaarden; de grenzen blijven hard. De uiteindelijke schaal is bewust één stap kleiner dan de WS-VIS.1-rasterbeelden.

### 6.3 Lange Nederlandse inhoud

- Paginatitels trunceren nooit; ze wrappen op woorden en mogen desktop 2, mobiel 3 regels innemen.
- Gebruik `hyphens: auto` alleen met correcte `lang="nl"`; geen handmatige afbreekstreepjes in data.
- Organisatienamen in compacte rijen mogen op 2 regels; pas daarna visuele ellipsis, terwijl de volledige naam toegankelijk blijft.
- Operationele bodycopy: 45–68 tekens per regel; metadata maximaal 75.
- Datums gebruiken begrijpelijke Nederlandse vorm (`7 augustus 2026`) behalve in compacte tabellen (`07-08-2026`) waar een kolomkop context geeft.
- Bedragen, dossier-ID’s en statuslabels gebruiken tabular numbers wanneer beschikbaar.

## 7. Spacing system

Basiseenheid: 4 px.

| Token | Waarde | Hoofdgebruik |
|---|---:|---|
| `space.0` | 0 | reset |
| `space.1` | 4 px | icon/label microgap |
| `space.2` | 8 px | compacte interne gap |
| `space.3` | 12 px | metadata/labelgroep |
| `space.4` | 16 px | standaard control/card gap |
| `space.5` | 24 px | card padding mobiel; subsectie |
| `space.6` | 32 px | card padding desktop; sectiegap mobiel |
| `space.7` | 48 px | sectiegap desktop |
| `space.8` | 64 px | paginahiërarchie desktop |
| `space.9` | 96 px | uitzonderlijke openingsruimte; niet in dichte flows |

Page inline margins: 16 px kleine telefoon; 20 px reguliere telefoon; 32 px tablet; 48 px kleine laptop; 64 px desktop; 72 px brede desktop. Main content max-width 1440 px; reading content max-width 736 px. Cards gebruiken 20–24 px mobiel en 24–32 px desktop. Gestapelde lijstrijen gebruiken 12–16 px verticale interne ruimte zonder de minimale targethoogte te doorbreken.

Safe-area tokens:

- `safe.top = env(safe-area-inset-top, 0px)`;
- `safe.bottom = env(safe-area-inset-bottom, 0px)`;
- bottom navigation en sticky action voegen hun eigen hoogte plus `safe.bottom` toe aan de scrollruimte.

## 8. Borders, radius en shadows

| Token | Waarde | Gebruik |
|---|---:|---|
| `border.width.default` | 1 px | kaarten, scheiding, niet-actieve controls |
| `border.width.active` | 2 px | geselecteerde tabs/focusinterne state |
| `radius.control` | 8 px | inputs, buttons, navitems |
| `radius.card` | 12 px | standaardcard/panel |
| `radius.large` | 16 px | drawer, primaire attention; spaarzaam |
| `radius.pill` | 999 px | uitsluitend status/chip/avatar, niet alle buttons |
| `shadow.raised` | `0 8px 24px rgba(22,39,34,.10)` | open menu/drawer |
| `shadow.dialog` | `0 24px 64px rgba(13,45,39,.18)` | modal dialog |

Standaardcards hebben geen shadow. Hiërarchie komt uit ruimte, type, fill en border. Geneste cards zijn NO-GO; gebruik binnen een card rijen en dividers. Maximaal één verhoogde overlaylaag plus een eventuele modal. Border-radius boven 16 px is niet toegestaan behalve pills/cirkels.

## 9. Icon system

### 9.1 Constructie

- Outline-iconen op een 24×24-grid; standaard stroke 1.75 px, afgeronde linecap/join.
- Compact 20×20 in dichte desktoprijen; 24×24 voor navigatie en mobiel; 16×16 alleen naast tekst, nooit als losse target.
- Eén coherente geometrische familie; geen mix van filled, cartoon, emoji en outlines.
- Icon-only controls hebben een toegankelijk label/naam en minimaal 44×44 target (48×48 mobiel).
- Decoratieve iconen zijn verborgen voor assistive technology.
- Een icoon vervangt geen onbekend label; bottom navigation heeft altijd tekst.

### 9.2 Semantische set

| Betekenis | Richting |
|---|---|
| Home | eenvoudige huiscontour, geen dashboardgrid |
| Organisaties | twee personen of gebouw; kies één canonieke vorm |
| Projecten | map met subtiele voortgangslijn |
| Financiën | euro in cirkel of document met euro; niet beide |
| Atlas | open kaart/verbonden punten, geen magie/sparkles |
| Documenten | documentblad met gevouwen hoek |
| Contacten | persoon/contactkaart |
| Tijdlijn | klok met lijn of drie verbonden punten |
| Infrastructuur | serverstack, alleen onder Meer |
| Meer | drie horizontale punten |
| Profiel/account | persooncirkel |
| Toevoegen | plus |
| Bewerken | potlood |
| Terug | pijl links |
| Openen | chevron rechts; externe link alleen voor externe bestemming |
| Downloaden | pijl omlaag in tray |
| Attention | kleine gevulde goudstip plus tekst, of uitroep in cirkel voor vereist actie |

Attention-dot: zichtbaar 8 px, niet zelf interactief, en altijd gekoppeld aan tekst zoals “Verdient aandacht”, “Nieuw” of “Gewijzigd”. Numerieke badges zijn alleen toegestaan wanneer het exacte aantal een werktaak is (bijvoorbeeld `Documenten 4`), niet als engagementprikkel. Badge max `99+`, met toegankelijke naam.

## 10. Desktop navigation

### 10.1 Geometrie

- Rail breedte: 248 px bij ≥1200 px; 224 px bij 900–1199 px.
- Sticky/fixed binnen viewport, volledige hoogte, navigation background.
- Interne padding: 24 px; minimum 16 px bij kleine laptop.
- Identityzone: W/BD-mark, naam en “Workspace”; 72–88 px hoog.
- Workspace selector: volledige railbreedte, 48 px minimumhoogte, naam één regel met ellipsis; menu toont volledige naam.
- Primaire nav start 24–32 px onder selector; account/profiel en Meer aan onderzijde.

### 10.2 States

| Staat | Visueel/interactioneel gedrag |
|---|---|
| Default | muted-on-dark tekst, icoon + label |
| Hover | subtiele lichte fill; geen layout shift |
| Active | cream fill, primary ink, 3 px goudkleurige startmarkering of duidelijke geselecteerde vorm |
| Keyboard focus | cream 2 px ring met 2 px offset, altijd volledig zichtbaar |
| Disabled | alleen bij werkelijk niet-beschikbare capability; label plus reden in tooltip/help, niet enkel opacity |

Lange labels: één regel in rail, ellipsis na beschikbare breedte, volledige tekst in accessible name en hover/focus disclosure. Nieuwe capabilities gaan standaard onder Meer. Pas wanneer een capability aantoonbaar frequent en rolrelevant is, kan hij promoveren; primaire nav bevat maximaal 6 items plus Meer.

Future collapse-state: 72 px, iconen gecentreerd, labels via tooltip/flyout, Workspace selector als mark. Niet implementeren zonder gebruiksbewijs en aparte GO.

## 11. Mobile navigation

### 11.1 Top bar

- Hoogte 64 px plus `safe.top`; dark-green achtergrond.
- Root: W/BD-mark, compacte Workspace-identiteit, account/menucontrol.
- Dossier/focusroute: backbutton, contexttitel of korte organisatienaam, Meer-menu.
- Iedere control 48×48 target; focus/pressed state zichtbaar.
- Top bar mag bij neerwaarts scrollen compact blijven maar verdwijnt niet op focusroutes. Geen content onder de safe area.

### 11.2 Bottom navigation

- Items: Home, Organisaties, Projecten, Financiën, Meer.
- Hoogte 68 px plus `safe.bottom`; elk item verdeelt de breedte gelijk en heeft minimaal 48 px target.
- Actief: goud-text/green combinatie plus 3 px bovenlijn of onderstreping; niet kleur alleen.
- Labels blijven zichtbaar. Bij 320–359 px: 12 px label, icon 22 px, nog steeds vijf gelijke targets.
- Bottom navigation staat alleen op root-/browse-routes. Focusroutes mogen hem verbergen wanneer een expliciete backroute en veilige taakactie aanwezig zijn.

### 11.3 Meer en dossiercontext

Meer opent een full-height of minimaal 70vh sheet met primaire groepen: Workspace, Atlas & Kennis, Infrastructuur, Account. Items blijven 48 px hoog; focus wordt opgesloten en keert terug naar Meer bij sluiten.

In dossiercontext zijn `Overzicht` en `Tijdlijn` direct zichtbaar; Documenten, Contacten en Financiën zitten onder dossier-Meer of worden als samenvattingsrij geopend. De bottom nav blijft platformnavigatie en verandert niet per dossier.

### 11.4 Sticky conflictregel

Er mag maximaal één sticky actionbar boven de bottom navigation staan. Totale gereserveerde scrollpadding = actionbar + bottom nav + safe area + 16 px. Bij open toetsenbord verdwijnt bottom navigation; de focusroute toont uitsluitend relevante taakacties en geen overlappende sticky lagen.

## 12. Home / Attention system

### 12.1 Vraag en categorieën

Home beantwoordt: **“Wat verdient vandaag mijn aandacht en waar moet ik verder?”**

| Categorie | Betekenis | Standaardgewicht |
|---|---|---|
| Vereist actie | gebruiker/rol moet beslissen of handelen; deadline/blocker | hoogste; kandidaat voor de ene dark-green primary |
| Wacht op iemand anders | geen directe actie, wel opvolgbaar | licht, gegroepeerd |
| Aankomend | afspraak/deadline binnen relevante horizon | licht, tijd zichtbaar |
| Recent veranderd | sinds laatste relevante view bevestigd veranderd | compact, niet automatisch urgent |
| Ter informatie | context zonder handelingsplicht | laag; achter samenvatting of “Alles bekijken” |

Status is bron- en permission-aware. Atlas mag maximaal één compacte relatie/context tonen wanneer die bevestigd, herleidbaar en direct relevant is. Geen reeks AI-suggestiecards, sparkles of onverklaarde scores.

### 12.2 Prioriteit en limieten

1. Maximaal **één** primary attention per Home/context.
2. Primary vereist een concrete actie, relevante deadline of aantoonbare blocker; “nieuw” alleen is onvoldoende.
3. Daarna: maximaal 3 secundaire actie-items, 3 wacht/aankomend-items en 3 recente veranderingen op desktop.
4. Mobiel toont primary + maximaal 2 secundair + maximaal 2 uit de eerstvolgende groep vóór “Alles bekijken”.
5. Bij 8–12 situaties groepeert Home per categorie; geen 12 losse cards.
6. Binnen een groep: urgentie/deadline, dan bevestigde wijzigingstijd, dan stabiele naam. Geen onverklaarde AI-ranking.
7. Verborgen items tonen een echte telling (`Nog 5 bekijken`) wanneer het aantal functioneel helpt.

### 12.3 Staten

- **Empty:** “Vandaag vraagt niets direct om actie.” Toon hoogstens twee rustige hervat-links; geen confetti.
- **Loading:** drie rijskeletten maximaal; structuur blijft stabiel; na 10 s duidelijke langzame-status en retry.
- **Error:** sectie blijft staan met begrijpelijke fout, bron/capability indien veilig, `Opnieuw proberen`; andere Home-secties blijven bruikbaar.
- **Stale:** toon `Laatst bijgewerkt …` plus oorzaak als bekend; stale data krijgt geen primaire status zonder actuele bevestiging.
- **Permission-limited:** toon geen verborgen telling of titel; alleen algemene “Niet beschikbaar voor jouw rol” wanneer nodig.

## 13. Organisation dossier system

### 13.1 Informatiearchitectuur

| Niveau | Desktop | Mobiel |
|---|---|---|
| Direct zichtbaar | naam, status, contextzin, primaire attention, laatste ontwikkeling, eigenaar/volgende stap | naam, status, primary attention, 3 recente tijdlijnitems |
| Samenvatting | documenten, contacten, projecten, financecontext | documenten/contacten/projecten als teller + laatste item |
| Primaire tabs | Overzicht, Tijdlijn, Documenten, Contacten, Financiën | Overzicht, Tijdlijn |
| Meer | relevante projecten, instellingen/archief volgens rol | Documenten, Contacten, Financiën, projecten, rolrelevante acties |
| Focusroute | complex document, factuur, project of inhoudelijke invoer | alle inhoudelijke invoer en complexe detailtaken |

Acties: `Nieuwe notitie` is primair wanneer toegestaan; `Document toevoegen` secundair. Verborgen/ongeoorloofde acties worden niet als disabled teaser getoond tenzij de gebruiker een begrijpelijke reden nodig heeft.

### 13.2 Volumeregels

| Scenario | Gedrag |
|---|---|
| 0 documenten | compacte empty row met uitleg en rolafhankelijke actie; geen lege grote card |
| 1 document | volledige rij met naam, type, datum, auteur en toegankelijke actie |
| 50 documenten | dedicated documentenroute; zoeken, type/status/datumfilter, sortering, pagina/cursor; samenvatting toont laatste 3 |
| 1 contact | volledige contactsummary; geen grid met lege plekken |
| meerdere contacten | maximaal 3 overviewrows; complete lijst met rol/typefilter |
| lange tijdlijn | 5 items desktop, 3 mobiel; groepeer op datum/maand; full timeline route en filters |
| meerdere aandachtspunten | één primary, maximaal 3 secundair, rest onder “Alle aandacht” |
| lange organisatienaam | titel wrapt 2 desktop/3 mobiele regels; contextacties verplaatsen onder titel |
| ontbrekende informatie | benoem precies wat ontbreekt en waarom relevant; geen fictieve placeholderdata |

Document- en contacttellingen zijn functionele aantallen en mogen badges gebruiken. Tellingen en data zijn server-authorized in de toekomstige architectuur; UI-filtering is nooit een permissiongrens.

## 14. Card and content-density system

### 14.1 Beperkte componentgrammatica

| Type | Betekenis | Visuele regels |
|---|---|---|
| `attention-primary` | één actuele handeling/blocker | dark green, cream text, 16 px radius max, geen geneste card |
| `attention-secondary` | relevante maar niet-dominante situatie | lichte row, gold marker + expliciet label |
| `summary` | context/telling/laatste item | surface primary, hairline border |
| `content-row` | document/contact/finance/project | 56 px+ desktop, 64 px+ mobiel, divider i.p.v. card per item |
| `timeline-group` | reeks gebeurtenissen | één container, datumgroepen en verticale lijn |
| `context-panel` | eigenaar, volgende stap, provenance | surface secondary, compacte definition list |
| `atlas-context` | bevestigd relevant verband | max één, lage visuele zwaarte, bron/sterkte zichtbaar |

Geen pagina-specifieke nieuwe cardvariant zonder hergebruikbewijs. Cards in cards zijn verboden; sections bevatten lijsten/rijen. Twee gelijke cards naast elkaar zijn toegestaan wanneer ze gelijkwaardig zijn; drie of meer items worden bij volume een lijst.

### 14.2 Density

- Default comfortable: row minimum 56 px desktop, 64 px mobile; 16 px body.
- Compact is alleen MAY op desktop datalijsten: row minimum 44 px, 14 px operational text, nooit voor Home primary of mobiel.
- Gebruikersvoorkeur voor density is later mogelijk, maar permissions en informatieprioriteit veranderen nooit door voorkeur.
- Bij groei: samenvatten → groeperen → filteren → dedicated route → pagineren/virtualiseren. Niet: kleinere tekst → smallere targets → meer tegels.
- Desktop overview maximaal twee hoofdkolommen. Een derde kolom is alleen metadata/context en zakt onder 1200 px.

## 15. Forms and input patterns

### 15.1 Patternkeuze

| Pattern | Wanneer |
|---|---|
| Inline | maximaal 3 eenvoudige, laag-risicovelden; direct nodig om huidige context af te ronden; niet standaard in dossieroverview |
| Drawer desktop | eenvoudige create/edit tot circa 6 velden, geen complexe afhankelijkheden of destructieve afronding |
| Dialog | bevestiging, keuze of zeer korte single-purpose input; geen lange formulieren |
| Focusroute | upload met metadata, finance, meerdere secties, >6 velden, complexe validatie, privacygevoelige of onomkeerbare taak; standaard mobiel |

### 15.2 Veldregels

- Controls minimumhoogte 44 px desktop, 48 px mobiel; textarea start 120 px en groeit.
- Zichtbaar label boven elk veld; placeholder is voorbeeld, nooit label.
- Helpertekst direct onder label of control, alleen wanneer zij een besluit ondersteunt.
- Velden groeperen met `fieldset/legend` waar betekenisvol; sectiegap 32–48 px.
- Validation op blur alleen bij veilige syntactische checks; definitieve validatie bij submit.
- Error staat naast veld, beschrijft probleem en herstel; error summary bovenaan linkt naar eerste fout.
- Success feedback is inline/persistent genoeg om te lezen en via polite live region; geen uitsluitend verdwijnende toast.
- Destructieve actie staat apart, benoemt object/gevolg en vereist bevestiging; nooit dezelfde kleur/positie als primaire save.
- Unsaved changes: route-exit waarschuwing alleen wanneer werkelijk gewijzigd; conceptbehoud indien capability dit ondersteunt.

### 15.3 Mobiel toetsenbord

Focusroute gebruikt één kolom, scroll-padding voor topbar/actionbar, correcte inputtypes en geen automatisch focus bij paginalaad. Bij toetsenbord open verdwijnen bottom nav en niet-relevante sticky elementen; submit blijft bereikbaar zonder content te bedekken. Terug toont dossiernaam en bewaarrisico.

## 16. Responsive rules

### 16.1 Breakpoints

| Naam | Viewport | Hoofdmodus |
|---|---:|---|
| `phone-xs` | 320–359 px | compacte mobiele compositie |
| `phone` | 360–599 px | reguliere mobiele compositie |
| `tablet` | 600–899 px | mobiele shell, ruimere content/twee kolommen waar logisch |
| `small-laptop` | 900–1199 px | desktoprail 224 px, beperkte twee kolommen |
| `desktop` | 1200–1599 px | rail 248 px, volledige twee-kolomhiërarchie |
| `wide` | ≥1600 px | content max 1440 px; extra ruimte wordt marge, geen extra dashboardkolommen |

Breakpoints zijn layoutgrenzen, geen apparaataannames. Componenten gebruiken waar mogelijk container-driven omslag: een summarygrid wordt twee kolommen vanaf circa 560 px beschikbare componentbreedte.

### 16.2 Gedrag per schaal

| Aspect | Phone xs/phone | Tablet | Small laptop | Desktop/wide |
|---|---|---|---|---|
| Navigatie | top + bottom | top + bottom | rail 224 | rail 248 |
| Main columns | 1 | 1–2 summaries | max 2 | max 2 + smalle contextzone binnen tweede kolom |
| Page width | 100%, 16/20 px margin | 100%, 32 px | 100%, 48 px | max 1440, 64/72 px |
| Titles | mobile token, max 3 regels | tussen mobile/desktop | desktop token, max 2 | desktop token, max 2 |
| Cards | stacked; rows waar mogelijk | 2 summaries mogelijk | 2 kolommen | 2 kolommen; nooit automatisch 4 |
| Actions | primary + overflow; focusroutes | idem | page actions/drawer | page actions/drawer/focusroute |
| Tables/lists | row cards of horizontaal betekenisbehoudend detail; geen page overflow | responsive columns | echte lijst/table | table alleen voor vergelijkbare velden |
| Forms | focusroute, 1 kolom | focusroute, 1–2 veldenrij | drawer/focus, max 2 kolommen | max 2 kolommen; labels boven |
| Attention | 1 primary + 2 secondary | 1 + 3 | 1 + 3 | 1 + 3, overige groepen |
| Dossiertabs | Overzicht/Tijdlijn/Meer | idem | alle vijf indien passend | alle vijf |
| Sticky | één actionbar + bottom nav | idem | rail; header MAY sticky | rail; tabs MAY sticky |

Reflow MUST werken bij 320 CSS px zonder tweedimensionale scroll voor normale content. Een gegevensmatrix die horizontale relatie essentieel maakt, krijgt een toegankelijke alternatieve row/detailweergave.

## 17. Accessibility

Ontwerpbaseline: WCAG 2.2 AA waar redelijk toepasbaar; strengere interne doelmaten waar dagelijks gebruik daarvan profiteert.

1. Normale tekst ≥4.5:1; grote tekst ≥3:1; essentiële UI-indicatoren ≥3:1.
2. W3C AA vereist minimaal 24×24 CSS px of voldoende afstand; WBD gebruikt **44×44 minimum** en **48×48 mobiel preferred** voor zelfstandige controls.
3. Volledige keyboardbediening met logische DOM/focusvolgorde; skiplink naar main content.
4. Focusring is altijd zichtbaar en wordt niet volledig bedekt door sticky headers/bars; scroll-padding compenseert sticky UI.
5. Semantische headinghiërarchie: één `h1`; secties dalen zonder niveaus over te slaan.
6. Attention heeft screen-readerlabel met categorie, object en handeling; goudstip is decoratief.
7. Status gebruikt label + icoon/vorm; nooit alleen kleur.
8. Icon-only buttons hebben accessible name; zichtbare tooltip is aanvullend.
9. Form errors koppelen programmatisch aan veld; error summary krijgt focus na mislukte submit.
10. `prefers-reduced-motion` verwijdert niet-essentiële beweging; content blijft direct begrijpelijk.
11. Zoom tot 200% en reflow bij 320 CSS px zonder functieverlies; tekstcontainers gebruiken geen vaste hoogte.
12. Touch/pointer, keyboard, screenreader en high-contrast/forced-colors krijgen expliciete validatiescenario’s.

Officiële referenties: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast), [Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible) en [Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum).

## 18. Motion and feedback

| Token/pattern | Richtlijn |
|---|---|
| `motion.fast` | 120 ms — hover/pressed/focuskleur |
| `motion.standard` | 180 ms — navselectie, accordion |
| `motion.overlay` | 240 ms — drawer/dialog/sheet |
| Easing | `cubic-bezier(.2,.8,.2,1)` voor enter; standaard ease voor kleur |

- Navigatie veroorzaakt geen theatrale page transition; content mag 4–8 px subtiel invoegen wanneer motion toegestaan is.
- Drawer beweegt vanaf logische rand; modal fade + minimale schaal 0.98→1. Geen spring/bounce.
- Save: button toont korte busy state, daarna inline bevestiging en live region. Layout blijft stabiel.
- Loading: skeleton pulse maximaal subtiel; reduced motion gebruikt statische fill.
- Attention update: markering verandert zonder shake/glow; live announcement alleen wanneer de verandering door gebruikersactie ontstond of operationeel urgent is.
- Errorfeedback verschijnt op locatie en verplaatst focus gecontroleerd; geen rode flits of schermschudden.

Bij `prefers-reduced-motion: reduce`: duur 0–1 ms voor niet-essentiële transities, geen parallax/pulse, drawers verschijnen direct; focus en statusfeedback blijven intact.

## 19. PWA readiness

- Layout gebruikt `100dvh`/veilige fallback, niet blind `100vh` op mobiel.
- Topbar en bottom navigation verwerken safe areas en standalone viewport.
- W/BD-mark blijft herkenbaar in standalone header, maar dit document specificeert geen app-iconasset of manifest.
- Root- en focusroutes moeten begrijpelijke documenttitels en terugnavigatie hebben wanneer browserchrome ontbreekt.
- Bottom nav reserveert echte contentruimte; geen overlap met OS home indicator.
- Offline, installprompts, pushnotifications, background sync en conflictresolutie zijn **DEFERRED/OUT OF SCOPE**.
- Een toekomstige offline state moet bronstatus en synchronisatiestatus expliciet maken; nooit doen alsof stale lokale data actueel is.

## 20. Multi-user and customer readiness

Vier identiteiten blijven visueel gescheiden:

1. **Workspace identity** — merk/tenantcontext in selector en shell.
2. **Ingelogde gebruiker** — profiel/account en persoonlijke hervatcontext.
3. **Organisatie/dossier** — businessobject binnen de Workspace.
4. **Capability** — projecten, finance, Atlas, documenten; zichtbaar volgens rol.

“Donovan” en WBD-copy zijn content, geen componentstructuur. Usernamen kunnen lang zijn; customer Workspaces kunnen een eigen naam/markering dragen binnen de WBD-systematiek zonder vrije theming in deze fase.

Permission states:

- ongeoorloofde data wordt niet gerenderd en telt niet mee in badges;
- een niet-toegestane actie wordt verborgen tenzij discoverability met reden vereist is;
- read-only toont `Alleen bekijken` plus begrijpelijke context, niet alleen disabled controls;
- ownership/provenance toont naam/rol/tijd wanneer toegestaan;
- wisselen van Workspace maakt context expliciet en wist niet-opgeslagen context volgens het toekomstige sessiecontract.

Geen volledig permission-managementscherm in WS-VIS.2. De componentgrammatica ondersteunt later rollen, uitnodigingen en organisatiecontext zonder navigatieherbouw.

## 21. Trust principles

1. Elke write krijgt duidelijke pending/success/errorfeedback en voorkomt dubbel submitten.
2. Statuslabels hebben bron of wijzigingstijd wanneer operationeel relevant.
3. Tijdlijn maakt actor, handeling en tijd traceerbaar; provenance wordt niet als decoratie verstopt.
4. Documentinteractie benoemt privacy/zichtbaarheid waar de gebruiker die keuze beïnvloedt.
5. Rechten zijn begrijpelijk: wat kan ik doen en waarom wel/niet?
6. Errors zijn rustig, specifiek en herstelbaar; geen blame, stacktrace of valse zekerheid.
7. Candidate/Confirmed blijft zichtbaar waar epistemische status relevant is.
8. Geen “SECURE”, slotdecoraties, providerlogo’s of uptimeclaims zonder bewijs.
9. Delete/archive/export beschrijven scope en gevolg vóór bevestiging.
10. UI suggereert nooit dat browserlokale of stale data centraal bevestigd is.

## 22. Stress-test scenarios

Deze scenario’s zijn normatieve layout-/densitytests. Wireframes tonen hiërarchie, geen nieuwe redesignrichting.

### A. Home met 1 aandachtspunt

```text
PAGE TITLE + datum
Vandaag verdient aandacht
┌ PRIMARY — vereist actie ─────────────────────────────┐
│ Sportpaleis · Voorstel wacht op beoordeling    Open │
└──────────────────────────────────────────────────────┘
In beweging
projectsummary | rustige hervatcontext
```

Regel: geen lege groepen, metrics of extra kaarten toevoegen om ruimte te vullen. Primary blijft maximaal één.

### B. Home met 8–12 relevante situaties

```text
Vandaag verdient aandacht
[1 PRIMARY]
[3 secundaire actierijen]                    [Alles: 6]

Wacht op anderen (3)                         [Bekijk groep]
[3 compacte rijen]

Aankomend (2)     Recent veranderd (4)
[2 rijen]         [3 rijen + Nog 1]
```

Desktop maximaal twee inhoudskolommen; mobiel alle groepen gestapeld en toont vóór de fold primary + 2 secundair. Geen twaalf cards, geen donkerte voor alle aandacht.

### C. Organisatiedossier met weinig inhoud

```text
NAAM + status + eigenaar
[Overzicht] [Tijdlijn] [Documenten 0] [Contacten 1] [Financiën]

Geen directe aandacht
Laatste ontwikkeling: Dossier aangemaakt
Documenten: Nog geen documenten [Toevoegen indien bevoegd]
Contact: Sander Janssen
```

Empty states zijn compact, eerlijk en actioneel; geen grote lege panelen of demo-inhoud.

### D. Dossier met veel inhoud

```text
NAAM + status + acties
tabs met echte aantallen

[1 PRIMARY + 3 secondary]      [context/eigenaar/volgende stap]
[Laatste 5 timeline-items]     [projecten 6 → alle]
[Laatste 3 documenten → 50]    [contacten 3 → 14]
[Finance summary → 12 facturen]
```

Elke collectie heeft dedicated route, zoeken/filter/sortering en pagination/cursor. Overview blijft een samenvatting; geen document/contact/timeline-wall.

### E. Lange organisatienaam

Teststring: `Stichting Regionale Samenwerking Sport, Onderwijs en Maatschappelijke Ontwikkeling Noord-Nederland`.

- Desktop: max 2 titelregels; acties verschuiven naar volgende rij vóór tekst smaller wordt dan 22ch.
- Mobiel: max 3 zichtbare titelregels; volledige naam blijft beschikbaar, contextzin komt erna.
- Compacte nav/row: 2 regels; ellipsis alleen daarna, accessible full name.
- Geen font-size onder token om één regel af te dwingen.

### F. Mobiel dossier tijdens actieve taak

```text
TOP: ← Sportpaleis                  Meer
FOCUSROUTE: Document toevoegen
Stap 1 van 2 · Bestand en titel
[velden in één kolom]
[inline validation]
STICKY: Annuleren            Verder
(bottom navigation verborgen; keyboard bedekt niets)
```

Terug waarschuwt alleen bij wijzigingen en keert naar exact dossier/tab. Eén sticky actionbar; contexttitel blijft zichtbaar.

### G. Error, loading en empty states

| State | Home | Dossier/collectie |
|---|---|---|
| Loading | stabiele titel + max 3 rijskeletten | header blijft; lijst-skeletten volgen verwachte rijhoogte |
| Partial error | getroffen groep toont fout/retry; andere groepen blijven | tab toont fout/retry en behoudt dossiercontext |
| Full error | rustige foutpagina met terug/retry en incidentreferentie indien beschikbaar | idem, zonder data te lekken |
| Empty | “Niets vraagt direct actie” + hervatlink | concrete lege uitleg + rolafhankelijke actie |
| Stale | laatst-bijgewerktlabel; geen valse primary | stale banner binnen tab; writes mogelijk geblokkeerd volgens datacontract |
| Permission | verborgen inhoud telt niet | “Alleen bekijken” of sectie afwezig; geen titel/countlek |

Acceptatie: alle scenario’s worden later als fixtures/visual regression states gebouwd vóór productie, maar niet in deze specificatiefase.

## 23. WS.1–WS.5 mapping

| Fase | Relevante WS-VIS.2-delen | Grens |
|---|---|---|
| WS.1 — Route/Application Boundary | navstructuur, active state, root/focusroutes, backcontext, page titles, error/not-found | eerst routecontract; geen visuele fallback die defecte routes verbergt |
| WS.2 — Identity/Organisation | Workspace selector, user versus Workspace, organisation header, permission/read-only states | UI nooit autorisatiebron; provideridentity niet canonical tenantkey |
| WS.3 — Durable Data | collection rows, loading/error/stale, counts, documents/timeline/provenance, form feedback | pas echte data na repository/migration/authorizationgrens |
| WS.4 — Mobile/Responsive | breakpoints, top/bottom nav, safe areas, target sizes, focusroutes, keyboard/sticky behavior | visuele mobiele shell na WS.1 route-integriteit en met aparte GO |
| WS.5 — Attention/Home | categories, deterministic priority, 1 primary, grouping/overflow, Atlas-context | pas dynamisch wanneer event/status/permissionbron bestaat; geen fictieve “AI attention” |

WS-VIS.2 kan component- en statefixtures informeren, maar visual implementation mag technische grenzen niet vooruit simuleren als productiegedrag.

## 24. Implementation boundaries

### In deze fase uitgevoerd

- read-only analyse van baseline, concepten, canonieke review en bestaande tokenfamilie;
- provider-/frameworkneutrale specificatie;
- contrastberekeningen en normatieve stress-testwireframes;
- dit ene canonieke Markdowndocument.

### Niet uitgevoerd / NO-GO

- application code, CSS, routes of componenten;
- package/font/icon-libraryinstallatie;
- data, fixtures in application code, database of schema;
- screenshotprototype dat als implementatie wordt voorgesteld;
- deployment, infrastructuur, productie, DNS of providerwijziging;
- WS.1–WS.5-uitvoering.

De tokens in dit document zijn specificatiewaarden, geen toestemming om `variables.css` te wijzigen. Een toekomstige implementatie moet in een beperkte fase aantonen dat de waarden in echte browserstates, forced colors, zoom en beide kleurcontexten werken.

## 25. Open human decisions

Geen van onderstaande blokkeert beoordeling van de specificatie; zij moeten vóór de genoemde implementatiefase worden gesloten:

1. **Dual gold:** bevestig dat brand gold `#C7A166` uitsluitend accent/decoratief mag zijn en accessible `gold-text #77511F` operationele tekst draagt. Aanbeveling: GO.
2. **Attention-bronregels:** wie/domainmodel bepaalt vereist actie, deadline en stale? Sluiten binnen WS.5, niet visueel gokken.
3. **Home financeprivacy:** mag een bedrag direct op Home of alleen factuurstatus? Sluiten met WS.2 permissions en finance-owner.
4. **Atlas op Home:** alleen confirmed, direct relevant en maximaal één; bevestig of candidate-context volledig achter Atlas blijft. Aanbeveling: ja.
5. **Desktop density preference:** comfortabele default nu; compact-mode pas na gebruiksbewijs. Aanbeveling: defer.
6. **Focusroute URL-model:** dedicated create/edit routes versus route + modal state. Sluiten in WS.1; mobiel vereist deelbare/restorebare focuscontext waar veilig.
7. **Merkfont:** systeem-Georgia behouden voor eerste implementatie of later een gelicentieerde editorial font onderzoeken. Aanbeveling: Georgia behouden; fontonderzoek defer.

## 26. Recommended implementation sequence

Iedere stap vereist een aparte menselijke GO en eigen preflight.

1. **WS.1 — Route- en shellcontract:** semantische routes, active state, focusroute/backcontext, error/not-found; geen brede restyle.
2. **VIS-IMP.1 — Foundation primitives:** tokens, type, spacing, focus, buttons/controls en accessibility testharnas in geïsoleerde scope; geen datapagina’s.
3. **WS.4A — Responsive navigation shell:** desktoprail, mobiele top/bottom nav, safe areas, keyboard/focus/zoom; behoud functionaliteit.
4. **WS.2 visual states:** Workspace/user/organisation/read-only/permissionweergave nadat domeincontract bestaat.
5. **WS.3 collection states:** rows, dossiersamenvattingen, loading/error/empty/stale en focusforms met synthetische fixtures; daarna echte data-integratie.
6. **WS.5 Home/Attention:** pas na deterministisch attention/eventmodel; stress-test 1 en 8–12 situaties.
7. **Visual regression & accessibility proof:** 320, 390, 768, 1024, 1440 en brede desktop; keyboard, screenreader, 200% zoom, reduced motion, forced colors.
8. **Beperkte releasecandidate:** afzonderlijke Human GO; vergelijking met WS-VIS.0 en WS-VIS.1, rollback en observatievenster.

Geen big-bang redesign. De bestaande sterke shell wordt incrementeel volwassen gemaakt.

## 27. GO/NO-GO conclusion

| Besluit | Status |
|---|---|
| Alle 27 gevraagde specificatieonderdelen | **GO — aanwezig** |
| Consistentie met WS-VIS.1 | **GO — cream work surface, green anchor, scarce gold/attention** |
| Consistentie met Canonical Review | **GO — organisation-first, attention-first, incremental, trust-aware** |
| Density/growthbewijs | **GO op specificatieniveau — 1 en 8–12 attention, lage/hoge dossierinhoud en collectionregels uitgewerkt** |
| Desktop en mobiel | **GO op specificatieniveau** |
| Accessibility | **GO als ontwerpbaseline; formele browser-/AT-audit vereist bij implementatie** |
| WS-VIS.2 document | **GO voor menselijke review** |
| Pixel-perfect implementatie uit WS-VIS.1-PNG’s | **NO-GO** |
| Application/CSS/component implementation | **NO-GO — afzonderlijke menselijke GO vereist** |
| WS.1–WS.5 starten | **NO-GO vanuit deze opdracht** |
| Deployment/infrastructuur/productie | **NO-GO** |

**Aanbevolen volgende besluit:** keur WS-VIS.2 als visueel systeem goed of geef gerichte wijzigingen op de zeven open beslissingen. Start daarna hoogstens één afzonderlijke WS.1- of VIS-IMP.1-preflight; niet beide impliciet.

**STOP:** wacht op menselijke beoordeling en expliciete volgende GO.
