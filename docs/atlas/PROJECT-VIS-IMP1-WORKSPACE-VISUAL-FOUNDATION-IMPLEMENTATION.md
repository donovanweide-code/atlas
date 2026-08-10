# PROJECT VIS-IMP.1 — Workspace Visual Foundation Implementation

Datum: 7 augustus 2026  
Status: **GO als lokale implementation candidate voor menselijke visuele review**  
Volgende fase: **NO-GO zonder afzonderlijke menselijke GO**

## 1. Executive summary

VIS-IMP.1 heeft de bestaande lokale WBD Workspace daadwerkelijk omgezet naar de goedgekeurde lichte Workspace-richting. Crème is nu de dagelijkse werklaag, donkergroen het vaste navigatieanker en één inhoudelijk verantwoord primair aandachtvlak, en goud een schaars merk-/betekenisaccent.

De implementatie hergebruikt de bestaande shell, routegrens, renderers en datacontracten. Er is geen rebuild, tenant, identity-, permission-, data-, infrastructuur- of productiefase gestart. De nieuwe structurele UI bestaat uit generieke Workspace-configuratie, generieke shellcomponenten en een generieke iconset; WBD-specifieke inhoud blijft uitsluitend inhoud.

Resultaat:

- desktop is aantoonbaar lichter en rustiger dan WS-VIS.0;
- 248/224 px desktoprail met actieve cream-state en maximaal zes directe items plus Meer;
- mobiele topbar plus vijfdelige bottom navigation;
- modale Meer-sheet met native focusbegrenzing;
- Home met één eerlijke primaire attention-state en lichte vervolgroutes;
- organisatiedossier toont context en inhoud vóór formulieren;
- formulieren blijven functioneel intact achter progressive disclosure;
- 256/256 tests, publieke build en Workspace-build groen;
- negen echte lokale Browser-skill captures beschikbaar.

## 2. Scope

Uitgevoerd:

- shared visual tokens;
- typografie, ruimte, borders, radius, shadow en motionfoundation;
- generieke shellconfiguratie en inline navigatie-iconen;
- lichte desktoprail;
- mobiele topbar, backcontext, bottom navigation en Meer-sheet;
- responsive regels voor phone-xs tot wide desktop;
- visuele Home-herstructurering zonder nieuwe intelligentie;
- lichte dossierpresentatie en progressive disclosure;
- toegankelijkheidsfoundation;
- gerichte regressietests;
- echte lokale browser- en screenshotvalidatie;
- dit canonieke implementatiedocument.

Niet uitgevoerd:

- nieuwe businessfunctionaliteit;
- tenant-/customerconfiguratie-engine;
- echte Sportpaleis Workspace;
- identity, organisations of permissions;
- centrale data of migratie;
- dynamische attention, recent changes of personalisatie;
- productie, provider, DNS, Cloudflare, TransIP of deployment.

## 3. Canonical inputs

Minimaal gebruikt:

- `PROJECT-WS1-ROUTE-APPLICATION-BOUNDARY-IMPLEMENTATION.md`;
- `PROJECT-WS-VIS1-WORKSPACE-VISUAL-DIRECTION-CONCEPT.md`;
- `PROJECT-WS-VIS2-VISUAL-SYSTEM-RESPONSIVE-INTERACTION-SPECIFICATION.md`;
- `PROJECT-WBD-WORKSPACE-CANONICAL-REVIEW.md`;
- `PROJECT-WS-BASE0-WORKSPACE-BASIS-VALUE-SPORTPALEIS-FIT-REVIEW.md`;
- `PROJECT-WS-BASE1-SPORTPALEIS-BASIS-EVIDENCE-VALIDATION.md`;
- WS-VIS.0 baselinecaptures;
- WS-VIS.1 conceptcaptures;
- actuele Workspace-code en tests.

WS-VIS.2 is normatief gebruikt waar beeld en tekst konden verschillen.

## 4. Pre-implementation state

Voor de eerste edit:

- volledige suite: 252/252 groen;
- publieke build: 174,39 kB CSS gzip 32,40 kB; 82,16 kB JS gzip 24,02 kB;
- Workspace-build: 148,25 kB CSS gzip 24,43 kB; 116,14 kB JS gzip 29,21 kB;
- repository was al substantieel dirty door eerdere, user-owned werkzaamheden;
- `atlas-workspace.css` en `wbd-foundation.ts` bevatten bestaande wijzigingen.

Daarom is niets gereset, opgeschoond, gestaged of gecommit. De grote bestaande Atlas-CSS is niet voor VIS-IMP.1 aangepast; de nieuwe visual foundation is een afzonderlijke, laatst geladen laag.

## 5. Files changed

Implementatie:

- `website/src/styles/workspace-base.css` — normatieve tokens en reduced-motionbasis;
- `website/src/styles/workspace-visual-foundation.css` — nieuwe generieke light foundation;
- `website/src/workspace-icons.ts` — nieuwe generieke 24×24 inline SVG-iconset;
- `website/src/workspace-config.ts` — optionele configureerbare mobile navigation;
- `website/src/workspace-shell.ts` — iconrail, mobiel shell, Meer-dialog en shellinteracties;
- `website/src/wbd-foundation.ts` — eerlijke visuele Home-compositie en main landmark;
- `website/src/wbd-workspace.ts` — main landmark, mobiele dossiercontext, dossierhiërarchie en disclosure;
- `website/src/wbd-invoices.ts` — gedeeld main-landmarkdoel.

Validatie en bewijs:

- `website/tests/workspace-visual-foundation.test.mjs`;
- `docs/atlas/evidence/vis-imp-1/2026-08-07/*.png`;
- `docs/atlas/PROJECT-VIS-IMP1-WORKSPACE-VISUAL-FOUNDATION-IMPLEMENTATION.md`.

Geen packagebestand is door VIS-IMP.1 gewijzigd.

## 6. Design tokens

Geïmplementeerde WS-VIS.2-kern:

| Rol | Waarde |
|---|---|
| Workspace background | `#F3EEE4` |
| Surface primary | `#FBF8F2` |
| Surface secondary | `#EAE3D6` |
| Surface sunken | `#E2D9CA` |
| Navigation background | `#0D2D27` |
| WBD dark green / primary attention | `#123C33` |
| Text primary | `#162722` |
| Text secondary | `#465A52` |
| Text muted | `#5E6E67` |
| WBD cream | `#F0E6D2` |
| Brand gold | `#C7A166` |
| Accessible gold text | `#77511F` |
| Subtle border | `#D9D0C2` |
| Emphasized border | `#827667` |
| Success | `#2F6B4F` |
| Warning | `#835610` |
| Danger | `#9B3B32` |
| Focus light | `#8A5B13` |
| Focus dark | `#F0E6D2` |

Daarnaast zijn type-, spacing-, radius-, shadow-, contentwidth-, rail-, controlheight- en safe-area-tokens vastgelegd.

## 7. Typography

- Editorial: Georgia / Times New Roman fallback;
- operational: systeem sans-serif stack;
- page title: fluid 34–48 px;
- section title: fluid 24–28 px;
- body: 16 px, 1.6 line-height;
- metadata/labels zijn niet structureel teruggebracht tot de oude zeer kleine baseline;
- lange Nederlandse titels wrappen en gebruiken `overflow-wrap` waar data anders kan uitbreken;
- Sport 2000 Sportpaleis B.V. past op 390 en 320 px zonder horizontale overflow;
- bottom labels blijven op 320 px 12 px en zichtbaar met beperkte negatieve letterspacing.

## 8. Desktop shell

- rail 248 px bij minimaal 1200 px;
- rail 224 px bij 900–1199 px;
- sticky over volledige viewporthoogte;
- maximaal zes directe navigatie-items plus Meer;
- actieve route: cream fill, donkere tekst en 3 px gold startmarkering;
- controls minimaal 44 px;
- geen collapsefeature gebouwd;
- content maximaal 1440 px en wordt op wide schermen niet in extra dashboardkolommen uitgerekt.

Browserbewijs bij 1024 px: rail exact 224 px, main start exact na de rail, mobile topbar verborgen en geen horizontale overflow.

## 9. Navigation and icons

De iconset is één geometrische outlinefamilie op 24×24 met 1,75 px stroke, `currentColor`, afgeronde caps/joins en `aria-hidden` voor decoratieve iconen. Er zijn geen emoji, externe assets of iconpackages toegevoegd.

Semantiek aanwezig voor Home, organisaties, projecten, partners, ontwikkeling, finance, infrastructuur, kennis, timeline, documenten, contact, menu, Meer, sluiten en terug.

Attention blijft opt-in via een expliciet menselijk leesbaar `attentionLabel`. Er is geen unread-count of fake notificatie toegevoegd.

## 10. Mobile shell

Geïmplementeerd onder 900 px:

- fixed topbar van 64 px plus safe area;
- W/BD-mark, compacte Workspace-identiteit en routecontext;
- generieke 48 px backactie op dossier-/focuscontext;
- 48 px menucontrol;
- fixed bottom navigation van circa 69 px plus safe area;
- Home, Organisaties, Projecten, Financiën en Meer;
- labels blijven zichtbaar;
- Meer opent een native modaal `dialog` van minimaal 70vh;
- Meer bevat geconfigureerde capabilities en de bestaande Workspace-switcher;
- sluiten geeft focus terug aan de opener.

De mobiele configuratie is declaratief en optioneel. Zij is geen permissionboundary en veronderstelt niet dat iedere toekomstige customer dezelfde capabilities heeft.

## 11. Responsive behavior

Werkelijk gevalideerd:

| Override | Resultaat |
|---:|---|
| 320×720 | geen horizontale overflow; 48 px menu; bottomtargets circa 61×68 px |
| 360×800 | geen horizontale overflow; 64 px topbar; 69 px bottomnav |
| 390×844 | geen horizontale overflow; Home, dossier, Meer en focusroute gecontroleerd |
| 430×900 | geen horizontale overflow; 64/69 px mobile shell |
| 1024×768 | 224 px desktoprail; maximaal twee contentkolommen |
| 1440×900 | 248 px rail; rustige brede desktopcompositie |

Een bestaand `body { min-width: 320px; }` veroorzaakte bij klassieke Windows-scrollbars aanvankelijk 15 px horizontale scroll op de 320 px override. Dit is uitsluitend binnen de geladen Workspace-modus gecorrigeerd naar `min-width: 0`.

De Browser-tool bewaart bij een klassieke verticale scrollbar de CSS-viewportoverride, maar PNG-uitvoer bevat alleen het clientgebied. Daardoor zijn 390 px viewportcaptures 375 px breed en sommige 1440 px captures 1425 px breed. De gemeten `window.innerWidth` bleef respectievelijk 390 en 1440; dit is een capturetool-eigenschap, geen reflowafwijking.

## 12. Home

Home gebruikt de bestaande gegevens en verandert alleen de visuele hiërarchie:

- titel: `Vandaag in de Workspace` zonder fake persoonlijke naam;
- één donker primary-attentionvlak;
- expliciet label `Vastgelegde aandacht`;
- expliciete datastatus `Lokale, handmatig vastgelegde projectstatus`;
- vier bestaande, lichte bestemmingen;
- geen fake live status, Atlas-intelligentie, unread-count of personalisatie.

Daarmee is Home voorbereid op toekomstige attention en context, maar functioneel eerlijk over de huidige statische/lokale bron.

## 13. Dossier

Het organisatiedossier is visueel omgebouwd van form-first naar context-first:

- lichte dossierhero met organisatie, beschrijving en broncontext;
- echte document- en notitietellingen uit het geladen dossier;
- sectienavigatie Overzicht, Tijdlijn en Documenten;
- documentenlijst vóór uploadformulier;
- timeline vóór contactformulier;
- echte browseropslaggrens blijft zichtbaar;
- mobiele topbar toont de actuele organisatienaam en een terugactie;
- lange naam wrapt zonder afkappen van de paginatitel.

Sportpaleis blijft voorbeeldinhoud in de WBD-data en is nergens de structurele basis van de componenten.

## 14. Forms and actions

De bestaande forms, velden, `data-form`, `data-testid`, submitlisteners en repositorycalls zijn behouden. Beide grote formulieren staan standaard gesloten in native `details`:

- `Document toevoegen`;
- `Contactmoment vastleggen`.

Na openen blijven alle velden zichtbaar en functioneel. Controls zijn minimaal 44 px desktop / 48 px mobiel, labels blijven zichtbaar, textarea start op minimaal 120 px en destructieve acties behouden de bestaande expliciete confirmatiedialog.

Complexe focusroutes zijn behouden, maar de forms zijn nog niet naar die routes verhuisd: die routes zijn momenteel uitsluitend WS.1-contractroutes en een verhuizing zou een tweede datastroom of nieuw businessgedrag vereisen.

## 15. Surfaces and cards

- standaardwerkvlak is crème;
- standaardpanels zijn lichte primary surfaces zonder shadow;
- secondary zones gebruiken warm ingetogen crème;
- borders zijn subtiel;
- Home heeft exact één dominant donkergroen inhoudsvlak;
- lijsten gebruiken waar mogelijk dividers in plaats van cards-in-cards;
- maximaal twee hoofdkolommen.

## 16. Gold usage

- brand gold `#C7A166` wordt gebruikt voor markers en decoratieve/ruime accenten;
- operationele kleine tekst gebruikt `gold-text #77511F`;
- goud is geen bodykleur en geen overal aanwezige border;
- primaire buttons gebruiken donkergroen met cream tekst;
- active navigation combineert fill, tekst en marker en leunt niet alleen op kleur.

## 17. Accessibility

Geïmplementeerd en gecontroleerd:

- `main`, `aside`, `nav`, `header`, `section`, `dialog` en gelabelde region semantics;
- skiplink naar focusbaar `#workspace-main-content`;
- zichtbare 2 px focusrings op lichte en donkere oppervlakken;
- icon-only controls hebben accessible names;
- native modale Meer-dialog begrenst focus;
- focus keert na sluiten terug aan de opener;
- 44 px minimum en 48 px mobiele voorkeur;
- geen kleur als enige active/statusdrager;
- reflow zonder horizontale paginaoverflow;
- reduced-motion en forced-colors basisregels;
- labels boven bestaande velden;
- foutpagina heeft expliciet routegedrag en een herstelactie;
- focusroute behoudt expliciete organisatiecontext.

Bewijsbeperking: de Browser-skill leverde in deze run click/focus, DOM- en computed-stylebewijs, maar gesynthetiseerde Tab/Enter-toetsaanslagen werden door de in-app browser niet afgeleverd. Daarom is dit geen claim van een volledige handmatige screenreader- of end-to-end keyboard-audit. Native elementkeuze en broncontracten zijn wel gericht getest.

## 18. Customer neutrality

- `WorkspaceConfig.mobileNavigation` en `mobileMoreNavigation` zijn optioneel;
- shellcontext is generiek (`label`, `backHref`, `backLabel`);
- iconen zijn generieke Workspace-iconen;
- CSS-componentnamen zijn `workspace-*`;
- geen `Sportpaleis*` component of tenantconditionering toegevoegd;
- zichtbare capabilities komen uit configuratie, niet uit klantspecifieke if-statements;
- er is expliciet geen permissionclaim aan clientconfiguratie gekoppeld.

## 19. Sportpaleis readiness

De foundation kan later dragen:

- een andere organisatie-identiteit;
- rolgerichte capability-configuratie;
- medewerkers-/admincontext;
- documenten en gespecialiseerde modules;
- een compacte dossiercontext op mobiel;
- beperkte capability visibility nadat echte server-side permissions bestaan.

Niet gebouwd: tenant, Kevin/admin-view, medewerker-view, Bedrukking-uitbreiding, echte accounts of echte klantdata.

## 20. Regression protection

Ongewijzigd gebleven:

- `/workspace/wbd` en canonical aliases;
- route manifest en runtimeboundary;
- deep links, refresh, Back/Forward;
- onbekende/malformed routes;
- dossiers, IndexedDB, documenten, notities en timeline;
- knowledge review;
- factuurworkflow en locks;
- Atlas/provenance-contracten;
- publieke buildgrens;
- afzonderlijke Workspace-build.

Browser Back/Forward gaf exact:

1. `/workspace/wbd/organisaties`;
2. terug naar `/workspace/wbd/overzicht`;
3. vooruit naar `/workspace/wbd/organisaties`.

## 21. Browser validation

Uitgevoerd met de Codex Browser-skill tegen `http://127.0.0.1:5173`:

- Home desktop 1440;
- dossier desktop 1440;
- Home 390;
- dossier 390;
- Meer-dialog open/sluit en focusreturn;
- lange dossierforms beide open;
- 320, 360 en 430 reflow;
- 1024 railmeting;
- expliciete 404 zonder actieve route;
- organisatie-focusroute op mobiel;
- linknavigatie plus Back/Forward;
- browserconsole: 0 warnings, 0 errors.

## 22. Screenshot register

Alle bestanden zijn echte captures van de lokale draaiende Workspace:

1. `docs/atlas/evidence/vis-imp-1/2026-08-07/01-home-desktop-1440x900.png`
2. `docs/atlas/evidence/vis-imp-1/2026-08-07/02-organisatiedossier-desktop-1440x900.png`
3. `docs/atlas/evidence/vis-imp-1/2026-08-07/03-home-mobile-390x844.png`
4. `docs/atlas/evidence/vis-imp-1/2026-08-07/04-organisatiedossier-mobile-390x844.png`
5. `docs/atlas/evidence/vis-imp-1/2026-08-07/05-mobile-navigation-390x844.png`
6. `docs/atlas/evidence/vis-imp-1/2026-08-07/06-lange-dossierjourney-mobile-390x844.png`
7. `docs/atlas/evidence/vis-imp-1/2026-08-07/07-foutpagina-desktop-1440x900.png`
8. `docs/atlas/evidence/vis-imp-1/2026-08-07/08-home-kleine-laptop-1024x768.png`
9. `docs/atlas/evidence/vis-imp-1/2026-08-07/09-home-stresstest-320x720.png`

## 23. WS-VIS.0 comparison

Bewust behouden:

- W/BD-mark;
- warm donkergroen, cream en goud;
- Georgia editorial hiërarchie;
- vaste desktoprail;
- bestaande routes, data en workflows;
- rustige WBD-stem en karakter.

Bewust lichter:

- primaire werkachtergrond van donker naar warm crème;
- panels en dossier van donkere gradients naar lichte surfaces;
- cards zonder standaardshadow;
- meer whitespace en grotere operationele tekst;
- donker alleen als navigatieanker en één attentionstate.

Opgeloste baselinefrictie:

- gecomprimeerde desktopnav op mobiel vervangen;
- actieve route duidelijker;
- formulierdominantie teruggebracht;
- lange titels en labels beter leesbaar;
- mobiel heeft vaste routeprioriteit en echte touch targets;
- onbekende route blijft zichtbaar foutgedrag binnen dezelfde shell.

## 24. WS-VIS.1/2 conformance

De implementatie volgt:

- cream work surface;
- green anchor;
- scarce gold;
- één primary attention;
- twee-kolomlimiet;
- 248/224 rail;
- topbar + bottom nav;
- configureerbare mobiele bestemmingen;
- context-first dossier;
- 44/48 px controls;
- 320–wide responsive foundation;
- Georgia zonder downloadfont;
- dual-gold contrastmodel.

## 25. Performance impact

Nieuwe packages: **nee**.  
Nieuwe fonts: **nee**.  
Nieuwe zware assets: **nee**.  
Iconen: inline SVG, geen netwerkrequest.

Definitieve Workspace-build versus baseline:

| Asset | Baseline | VIS-IMP.1 | Delta |
|---|---:|---:|---:|
| CSS raw | 148,25 kB | 180,10 kB | +31,85 kB |
| CSS gzip | 24,43 kB | 28,90 kB | +4,47 kB |
| JS raw | 116,14 kB | 123,46 kB | +7,32 kB |
| JS gzip | 29,21 kB | 31,18 kB | +1,97 kB |

Publieke build: bytegelijk voor de relevante CSS/JS-bundles (174,39 kB CSS en 82,16 kB JS). De mobiele impact is vooral CSS; er is geen runtimeframework of fontdownload toegevoegd.

## 26. Test results

Definitief na alle edits:

- volledige testsuite: **256/256 pass**;
- nieuwe VIS-IMP.1-tests: **4/4 pass**;
- TypeScript: **pass** via beide builds;
- publieke build en public-only verifier: **pass**;
- Workspace-only build en verifier: **pass**;
- runtimeconfig en runtime syntaxchecks: **pass**;
- gerichte route/runtime/dossier/factuurtests: **pass**;
- trailing whitespace in gerichte bestanden: **geen**;
- Browserconsole: **0 warnings / 0 errors**.

Er bestaat geen apart lintscript in `website/package.json`; er is niets stilzwijgend overgeslagen onder een bestaande lintcommand.

## 27. Deviations

1. Forms zijn niet naar focusroutes verhuisd. De huidige focusroutes zijn contract-only en verplaatsing zou buiten VIS-IMP.1 business-/datagedrag introduceren. Progressive disclosure is de kleinste veilige oplossing.
2. De Meer-sheet gebruikt native `dialog` in plaats van een custom drawer. Dit levert focusbegrenzing en focusreturn zonder dependency of extra componentframework.
3. Screenshot-PNG-breedte kan 15 px kleiner zijn dan de browseroverride door de klassieke Windows-scrollbar. De werkelijke CSS-viewportoverride en reflowmetingen zijn wel exact uitgevoerd.
4. Geen volledige handmatige screenreader-/keyboardaudit: de Browser-skill leverde gesynthetiseerde Tab/Enter niet af. Semantiek, focusstyles, native controls, clickpad, focusreturn en broncontracten zijn wel gecontroleerd.

## 28. Rollback

Rollback vereist geen data- of infrastructuurherstel:

1. verwijder `workspace-visual-foundation.css`, `workspace-icons.ts` en de VIS-IMP.1-test/evidence;
2. verwijder de VIS-IMP.1-tokenuitbreiding uit `workspace-base.css`;
3. herstel uitsluitend de kleine VIS-IMP.1-hunks in config, shell, WBD renderers en invoice main-landmark;
4. draai test, publieke build en Workspace-build opnieuw.

Geen database, remote state, productie of migratie is geraakt.

## 29. Open human decisions

Donovan beoordeelt nu:

1. voelt de lichte balans sterk genoeg zonder te wit te worden;
2. voelt het primaire attentionvlak inhoudelijk en visueel juist;
3. is de desktoprail rustig genoeg bij lange labels;
4. voelt mobiele topbar + bottom navigation als de gewenste dagelijkse Workspace;
5. is dossierprogressive-disclosure sterk genoeg voor deze tussenfase;
6. mag deze foundation later als basis voor Sportpaleis worden gebruikt;
7. wanneer WS.3 de document-/notitiedataboundary levert: forms definitief naar focusroutes verplaatsen of desktopdrawer toevoegen.

## 30. GO/NO-GO

**VIS-IMP.1: GO als lokale implementation candidate voor menselijke visuele acceptatie.**

Acceptatiecriteria zijn technisch behaald:

- WS-VIS.2 aantoonbaar gevolgd;
- WS.1 route/runtime intact;
- bestaande functies behouden;
- desktop aantoonbaar lichter;
- mobiel echte mobile navigation;
- accessibilityfoundation aanwezig;
- generieke componenten/configuratie;
- geen fake functionality;
- geen productie/security/datafase gestart;
- echte lokale screenshots;
- volledige tests en beide builds groen.

**Volgende implementatiefase: NO-GO totdat Donovan de screenshots en lokale ervaring expliciet visueel heeft goedgekeurd.**

## 31. Recommended next phase

Na menselijke visuele GO:

1. een kleine VIS-IMP.1A review/polish uitsluitend voor expliciet gekozen visuele correcties, indien nodig;
2. daarna terug naar de vastgestelde productvolgorde en afhankelijkheden, met een afzonderlijke preflight/GO voor de eerstvolgende functionele Workspacefase;
3. complexe formuliermigratie pas koppelen aan de daarvoor geschikte WS.3-data-/documentboundary;
4. customer-/Sportpaleis-activation pas na identity, permissions en echte tenantisolatie.

Geschatte volgende Codex-creditbandbreedte:

- alleen menselijke reviewcorrecties / VIS-IMP.1A: circa €15–€35;
- een volgende functionele Workspacefase: opnieuw afzonderlijk ramen na preflight.

Werkelijke Codex-eurocredits zijn in deze omgeving niet zichtbaar.

STOP: geen volgende fase automatisch starten.
