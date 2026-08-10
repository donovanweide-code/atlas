# Project — WBD Workspace Canonical Review

**Fase:** Current State, Product Vision & Implementation Gap Assessment  
**Datum:** 7 augustus 2026  
**Status:** assessment candidate — review-only  
**Beslisser:** menselijke beoordeling vereist  
**Parallelle grens:** Project 002C.7 — Cloudflare Free Preflight blijft volledig geïsoleerd

## Bewijslabels

| Label | Betekenis in dit assessment |
| --- | --- |
| **VERIFIED** | Rechtstreeks aangetoond in actuele broncode, lokale UI, data-artefacten of uitgevoerde validatie. |
| **DOCUMENTED BUT NOT VERIFIED** | Beschreven in canonieke documentatie, maar niet in deze review operationeel of extern bewezen. |
| **MOCK / STATIC** | Vooraf ingevulde, handmatig gecureerde, demo- of placeholderdata; geen actuele bronkoppeling. |
| **PARTIAL** | Een bruikbaar deel bestaat, maar de capability is niet compleet of niet geschikt voor de beoogde context. |
| **UNKNOWN** | De repository en read-only inspectie leveren onvoldoende bewijs. |
| **LEGACY / REVIEW** | Bestaand onderdeel of eerdere conclusie die niet meer betrouwbaar bij de huidige canonieke richting aansluit. |
| **RECOMMENDATION** | Voorgestelde richting; niet geïmplementeerd en niet automatisch goedgekeurd. |

---

## 1. Executive Summary

De huidige WBD Workspace is **geen lege mock-up**, maar ook nog **geen gedeelde online dagelijkse werkplek**. Het is een lokale, met vanilla TypeScript opgebouwde productkandidaat met vier verschillende werkelijkheidsniveaus:

1. **Echte lokale workflows:** organisatiedossiers met bestanden en contactnotities in IndexedDB, lokale kennisvoorstellen en menselijke goedkeuring, plus een werkende factuurworkflow via repositorybestanden, een lokale Node-bridge en de bestaande Python-generator.
2. **Handmatig gecureerde bedrijfsweergaven:** Home, Projecten, Ontwikkelmonitor, Ontwikkelhistorie, Ontwikkelpartner en Infrastructuur lezen uit statische TypeScript-data. De inhoud bevat deels echte besluiten, maar is geen live bedrijfsstaat.
3. **Bewuste lege staten:** inkomende facturen, delen van Business Foundation en Fundament tonen alleen een toekomstige positie.
4. **Onjuiste of niet-bereikbare routes:** `/workspace/wbd/tijdlijn` en `/workspace/wbd/communicatie` vallen terug op een oude Overzicht-placeholder; de echte lokale dossierback-up-UI bestaat in code maar is via de huidige router niet bereikbaar.

De sterkste productbasis is de rustige WBD-beeldtaal, de gedeelde Workspace-shell, de expliciete menselijke bewijsgrenzen in Atlas, de organisatiegebonden dossieropzet en de veilige definitieve factuurstatus. De grootste fout zou zijn deze onderdelen opnieuw te ontwerpen. Zij verdienen consolidatie en gerichte verbetering.

De grootste gaps zijn fundamenteler:

- geen WBD-authenticatie, sessie- of usermodel;
- geen autorisatie of afgedwongen organisatie-isolatie;
- geen centrale applicatiedatabase of multi-device continuïteit;
- interne Workspace-routes en write-API's bestaan alleen in de lokale Vite-developmentserver;
- de normale productiebuild sluit WBD en Atlas bewust uit;
- geen generieke customer-workspaceconfiguratie, rollen, abonnementen of capabilities;
- geen dynamische attention-engine voor Home of navigatie;
- geen bewezen mobile journey, ondanks bruikbare CSS-reflow;
- geen geïntegreerde Context Engine van connector naar observatie, interpretatie en WBD-presentatie.

**Assessmentbesluit:** **GO**. De huidige staat en gaps zijn voldoende aantoonbaar om kleine vervolgprojecten te definiëren.  
**Online dagelijks gebruik:** **NO-GO**.  
**Start eerste implementatiefase:** **NO-GO totdat een mens dit assessment expliciet goedkeurt**; daarna is de voorgestelde `WS.1 — Canonical Application Boundary & Route Integrity` veilig parallel aan Project 002 uitvoerbaar.

## 2. Scope

Binnen scope:

- actuele WBD Workspace-broncode, routes, shell, data en lokale workflows;
- Atlas- en Experience-grenzen voor zover zij de WBD Workspace-architectuur bepalen;
- desktop- en mobiele inspectie van de lokale kandidaat;
- build, tests en productie-outputgrens;
- vergelijking met bestaande Workspace-, Atlas-, connector- en Project 002-documentatie;
- gap-, prioriteits- en fasevoorstel.

Buiten scope en niet uitgevoerd:

- applicatie- of CSS-wijzigingen;
- database- of migratiewerk;
- deployment, productie, infrastructuur, DNS, TransIP of Cloudflare;
- account-, credential- of vaultgebruik;
- Sportpaleis-implementatie;
- connectoractivatie of externe synchronisatie;
- ontwerp van een nieuwe visuele richting.

De review beoordeelt de actuele brede werkboom. Die bevat al veel bestaande gewijzigde en niet-getrackte bestanden van andere werkstromen. Dit assessment eigent die wijzigingen niet toe en verandert ze niet.

## 3. Evidence Reviewed

### Broncode en lokale data

- `website/src/internal-main.ts`, `website/vite.config.ts` en de drie Vite-buildgrenzen;
- `website/src/workspace-config.ts` en `website/src/workspace-shell.ts`;
- `website/src/wbd-workspace.ts`, `wbd-foundation.ts`, `wbd-foundation-data.ts` en bijbehorende CSS;
- `wbd-dossier-store.ts`, `wbd-dossier-backup.ts`, `wbd-knowledge-store.ts` en `wbd-invoices.ts`;
- lokale developmentmiddleware voor WBD Foundation en facturen;
- Atlas Workspace, observations, Understanding, runtime, case-snapshot en connectorframework;
- repositorydata onder `data/wbd-workspace/`, `invoices/wbd/data/`, `clients/0001-we-build-and-design/` en de lokale connectorstaat;
- relevante Node- en Python-tests.

### Canonieke en historische documentatie

- `WORKSPACE-FOUNDATION-V1.md`;
- `WBD-WORKSPACE-BUSINESS-FOUNDATION-V1.md`;
- `ATLAS-WORKSPACE-COMPLETE-UX-ARCHITECTURE-REVIEW-2026-08-05.md`;
- `WORKSPACE-NAVIGATION-EXPERIENCE-PROPOSAL-V1.md`;
- `UX-ARCHITECTURE-IMPLEMENTATION-ROADMAP-V1.md` en UXA-implementatiereviews;
- Atlas Runtime, Cognitive Engine, Knowledge Capture en Continuous Inquiry-documentatie;
- Atlas Connector Framework-documentatie;
- Project 001 final handoff;
- actuele Project 002A/002B/002C-documentatie, inclusief `PROJECT-002C-CLOUDFLARE-FREE-PREFLIGHT.md`.

### Uitgevoerde verificatie

| Controle | Resultaat |
| --- | --- |
| `npm test` in `website/` | **VERIFIED:** 244 tests geslaagd, 0 gefaald. |
| `npm run build` in `website/` | **VERIFIED:** TypeScript, Vite-build en public-only controle geslaagd. |
| Productie-output doorzoeken op interne Workspace-code | **VERIFIED:** geen WBD/Atlas Workspace, IndexedDB of lokale WBD-API in `dist/`. |
| Desktop UI | **VERIFIED:** 1280×720, geen documentbrede horizontale overflow op het gecontroleerde Overzicht. |
| Mobiele UI | **VERIFIED:** 390×844 op negen bekende routes; geen documentbrede horizontale overflow. |
| Mobiele aanraakmetingen | **VERIFIED:** primaire navigatielinks circa 31 px hoog; dossierknoppen circa 37 px; invoervelden meestal 38–41 px. |
| Mobiele dossierlengte | **VERIFIED:** leeg Sportpaleis-dossier circa 2.287 px documenthoogte; beide formulieren permanent zichtbaar. |

De tests zijn waardevol maar vooral unit-, broncontract- en opslagtests. Er is geen aangetoonde volledige browser-E2E-suite, accessibility-audit, securitytest, tenant-isolatietest of real-device matrix.

## 4. Current Architecture

```text
LOKALE VITE DEVELOPMENT SERVER
├── publieke site-entry
├── interne route-rewrite → internal-main.ts
│   ├── /workspace/wbd/* → WBD renderer
│   ├── /atlas*         → Atlas renderer
│   └── /workspace/experience/* → Experience Admin renderer
├── /__wbd-foundation/* → lokale JSON-bestanden
└── /__wbd-invoices/*   → lokale JSON/PDF + Python-generator

BROWSER
├── DOM-rendering en lokaal componentstate (vanilla TypeScript)
├── IndexedDB: organisatiedossiers, documenten, kennis
└── localStorage: Atlas-focus, observaties, Understanding, ideeën, logboek

REPOSITORY
├── statische bedrijfs- en roadmapdata
├── canonieke documenten en casesnapshots
├── factuurconcepten/definitieve facturen/PDF's
└── connectorframework en historische lokale connectorstaat
```

### Technische kenmerken

| Onderdeel | Huidige werkelijkheid | Label |
| --- | --- | --- |
| Frontend | Vanilla TypeScript, stringtemplates en directe DOM-events; geen UI-framework. | **VERIFIED** |
| Routing | Pathname-dispatch in `internal-main.ts` en renderers; onbekende WBD-routes vallen terug op Overzicht. | **VERIFIED / LEGACY / REVIEW** |
| Layout | Gedeelde shell met configuratie voor Atlas, WBD en Experience. | **VERIFIED** |
| State management | Lokale variabelen, volledige her-rendering en browserstorage; geen centrale state-machine voor WBD. | **VERIFIED / PARTIAL** |
| Server/API | Alleen Vite-developmentmiddleware voor WBD writes; geen productie-appserver voor WBD. | **VERIFIED** |
| Database | Geen centrale WBD-database. IndexedDB is apparaat- en browsergebonden. | **VERIFIED** |
| Build | Standaard build is bewust public-only; Experience heeft een apart pakket; WBD/Atlas hebben geen production entry. | **VERIFIED** |
| Deployment | Publieke en Experience-releasepaden bestaan; structurele interne Workspace-hosting ontbreekt. | **VERIFIED / BLOCKED BY PROJECT 002** |
| Iconen | Geen icon library; navigatie gebruikt nummers. Enkele cards gebruiken handgemaakte CSS-iconen. | **VERIFIED** |
| Styling | CSS custom properties plus veel component-specifieke hardcoded kleuren en afmetingen. | **VERIFIED / PARTIAL** |

De architectuur is geschikt als lokale productproef en als bewijs van losse workflows. Zij is niet geschikt als multi-user online applicatie zonder een expliciete applicatieserver-, identity-, data- en releasegrens.

## 5. Actual Workspace Map

### WBD Internal Workspace

| Route | Doel | Huidige status en data | Maturity | Mobiel/desktop | Afhankelijkheden |
| --- | --- | --- | --- | --- | --- |
| `/workspace/wbd`, `/overzicht` | Dagstart en actuele bedrijfspraktijk | Handmatig gecureerde `wbd-foundation-data.ts`; vaste datum en werkstroom. | **MOCK / STATIC** | Reflow werkt; inhoud lang en niet persoonlijk. | Echte project- en attentionbron. |
| `/organisaties` | Organisatiedossiers kiezen | Vier vaste seeds; daarna browser-IndexedDB. | **PARTIAL** | Grid wordt één kolom; goed leesbaar. | Centraal orgmodel, auth, isolatie. |
| `/organisaties/:id` | Documenten en contactgeschiedenis per organisatie | Echte lokale CRUD, Blobs en tijdlijn in IndexedDB. | **PARTIAL** | Geen overflow; lange permanente formulieren. | Centrale opslag, uploadsecurity, permissions. |
| `/projecten` | Roadmap en projectstatus | Drie statische projecten met mijlpalen en grenzen. | **MOCK / STATIC** | Reflow werkt. | Projectrepository en historie/economics. |
| `/ontwikkelpartners` | Praktijkvalidatie-relatie | Eén hardcoded Sportpaleis-record. | **MOCK / STATIC** | Reflow werkt. | Generiek organisatierelatiemodel. |
| `/ontwikkeling/monitor` | Betekenisvolle actuele werkstroom | Statische projectdata. | **MOCK / STATIC** | Reflow werkt. | Dynamische attention/projectdata. |
| `/ontwikkeling/historie` | Mijlpalen | Statische lijst; enkele datums bewust onbekend. | **MOCK / STATIC** | Reflow werkt. | Betekenisvolle event-/decisionhistorie. |
| `/ontwikkeling/feedback` | Praktijkfeedback vastleggen | Lokale JSON-API; huidige dataset leeg. Alleen developmentserver. | **PARTIAL** | Formulier schaalt. | Productie-API, identity, org/projectreferenties. |
| `/business-foundation` | Bedrijfsbasis | Navigatie/positionering; deels statisch. | **PARTIAL** | Cards schalen. | Betrouwbare centrale bronnen. |
| `/business-foundation/finance` | Uitgaande facturen en betaalstatus | Leest echte lokale factuurfiles plus handmatige betaalstatus-JSON. | **PARTIAL** | Reflow werkt; zeer kleine tekst. | Productie-API, centrale opslag, permissions. |
| `/business-foundation/finance/inkomende-facturen` | Leveranciersfacturen | Alleen lege staat. | **MOCK / STATIC** | Bruikbaar leeg scherm. | Cost/document foundation. |
| `/business-foundation/bedrijfsgegevens` | WBD-afzendergegevens | Hardcoded weergave van templategegevens. | **DOCUMENTED BUT NOT VERIFIED / STATIC** | Reflow werkt. | Eén canonieke bedrijfsbron. |
| `/business-foundation/templates` | Herbruikbare zakelijke templates | Read-only beschrijving van actief factuursjabloon. | **PARTIAL** | Reflow werkt. | Later generiek documentregister. |
| `/business-foundation/finance/facturen/*` | Concept, berekening, PDF, definitief | Werkende lokale workflow via repositoryfiles en Python. Eén gedocumenteerde definitieve factuur. | **VERIFIED lokaal / PARTIAL online** | Responsive regels bestaan; invoer blijft compact en tekst klein. | Veilige serveropslag, auth, audit, releasepad. |
| `/infrastructuur` | Toekomstige basis zichtbaar houden | Statische statuskaart; teksten zijn deels ingehaald door Project 002C. | **LEGACY / REVIEW** | Reflow werkt. | Project 002 blijft autoritatief. |
| `/kennisvoorstellen` | Menselijke review voor kennis | Echte lokale IndexedDB CRUD en approve/reject. | **PARTIAL** | Reflow werkt. | Centrale provenance/context/identity. |
| `/kennis` | Goedgekeurde Knowledge Repository | Echte lokale IndexedDB-opslag; niet in hoofdnavigatie. | **PARTIAL** | Reflow werkt. | Atlas-integratie en gedeelde opslag. |
| `/tijdlijn` | Bedrijfscontinuïteit/back-up | Link bestaat; route valt verkeerd terug op oude Overzicht-placeholder. Back-upcode bestaat maar is onbereikbaar. | **LEGACY / REVIEW** | Verkeerde pagina. | Route-integriteit. |
| `/communicatie` | Toekomstige communicatie | Alleen in oude, ongebruikte Overzichtdata; directe route valt terug op Overzicht. | **MOCK / STATIC / LEGACY** | Verkeerde pagina. | Eerst capability- en orgconfigmodel. |

### Aangrenzende maar afzonderlijke omgevingen

```text
WBD ECOSYSTEEM
├── WBD Workspace        dagelijkse bedrijfspraktijk
├── Atlas Workspace      aandacht, werkelijkheid, begrip en kennis
│   ├── /atlas           lokale dagroute + epistemische werkobjecten
│   └── /atlas/fundament lege secundaire route
├── Experience Workspace sessies, antwoorden en review; eigen server/opslaggrens
├── Observatory          specialistische Experience-observatie
└── /sportpaleis-proof   interne demo; geen customer Workspace
```

De Workspace-switcher wisselt tussen productwerelden, niet tussen organisaties. Dat onderscheid moet behouden blijven.

## 6. Data Reality: Real vs Mock

| Data | Werkelijkheid | Label |
| --- | --- | --- |
| WBD Home/projecten/monitor/historie/infrastructuur | Gecureerde TypeScript-constanten met deels echte besluiten, maar geen live bron en enkele verouderde tijdclaims. | **MOCK / STATIC / LEGACY / REVIEW** |
| Vier organisaties | Statische seedrecords; namen kunnen echt zijn, maar de lijst is geen centraal organisatieregister. | **MOCK / STATIC** |
| Toegevoegde dossierdocumenten/contactnotities | Werkelijke gebruikersdata, maar alleen in de huidige browser en origin. | **VERIFIED lokaal / PARTIAL** |
| Dossierback-up | Werkende export/parse/merge/replace-code en tests; UI-route momenteel onbereikbaar. | **PARTIAL / LEGACY / REVIEW** |
| Kennisvoorstellen en entries | Werkelijke lokale gebruikerdata in IndexedDB; geen automatische Atlas-output. | **VERIFIED lokaal / PARTIAL** |
| Uitgaande facturen | Repositorybestanden; één finale `F00248` is canoniek gedocumenteerd. Een onvolledig concept bestaat ook. | **VERIFIED / PARTIAL** |
| Betaalstatus | Handmatig JSON-record, geen bank- of boekhoudbewijs. | **VERIFIED als handmatige registratie** |
| Feedback | Productieachtig schema, maar huidige JSON-lijst is leeg en API is development-only. | **PARTIAL** |
| Atlas-focus/observaties/Understanding/ideeën/logboek | Werkelijke browserlokale input; defaults en meerdere zichtbare reviewitems zijn statisch. | **PARTIAL** |
| Atlas Case 0001 | Repository is autoritatief, maar actuele revision is `candidate`; loader toont terecht geen bevestigde waarheid. | **VERIFIED bewijsgrens** |
| Connectorstaat | Historische echte WBD-sitemapruns van 29 juli; lokale staat gebruikt een oudere vorm en is niet in de Workspace geïntegreerd. | **VERIFIED historisch / LEGACY / REVIEW** |

Belangrijk: browserlokale data is **echt**, maar niet automatisch duurzaam, gedeeld, centraal geback-upt of organisatiegeïsoleerd.

## 7. Navigation

### Wat bestaat

- **VERIFIED:** gedeelde configureerbare shell voor Atlas, WBD en Experience;
- **VERIFIED:** duidelijke crèmekleurige actieve WBD-state en `aria-current="page"`;
- **VERIFIED:** Workspace-switcher met naam en omschrijving;
- **VERIFIED:** horizontale responsive navigatie onder 980 px;
- **VERIFIED:** semantische ondersteuning voor één rustige attentionlabel, maar geen enkel WBD-item levert zo'n label;
- **VERIFIED:** acht vlakke WBD-hoofditems, genummerd `01`–`08`;
- **MISSING:** account, settings, usermanagement en organisation switcher;
- **MISSING:** consistente navigatie-iconen;
- **LEGACY / REVIEW:** onbekende routes worden stil als Overzicht weergegeven, waardoor een defecte link geldig lijkt.

### Oordeel

De shell geeft rust en oriëntatie op desktop. De navigatie is nog geen overtuigende dagelijkse mobiele bediening: bij 390 px is het navigatievlak 326 px breed en de inhoud circa 746 px. De eerste vier items zijn zichtbaar, maar de overige context ligt verborgen achter horizontale scroll zonder sterke affordance. De gemeten linkhoogte is circa 31 px, onder de canonieke 44 px-aanraakrichting.

De eerder voorgestelde groepering Relaties / Werk / Bedrijf / Kennis is niet geïmplementeerd. Dat is geen reden voor een rewrite; de bestaande configuratie kan groepen, lijniconen en één betekenisvol attentionsignaal dragen.

**KEEP:** shell, switcher, actieve state, huidige route-identiteiten.  
**IMPROVE:** route-integriteit, groepering, eigen iconografie, 44 px touch targets, zichtbare mobiele oriëntatie.  
**REMOVE / RECONSIDER:** nummering als enige visuele oriëntatie en stille fallback naar Overzicht.

## 8. Attention Model

### Huidige staat

| Capability | Oordeel |
| --- | --- |
| `Verdient vandaag aandacht` op Home/Monitor | **MOCK / STATIC:** handmatig label op de vaste werkstroom. |
| WBD-navigatie-aandacht | **PARTIAL:** renderer ondersteunt label en stille stip; data levert niets. |
| Atlas observatiereview | **VERIFIED lokaal:** onbeoordeelde observaties, menselijke uitkomsten, rationale en herstelbare status. |
| Project 002 monitoringmodel | **DOCUMENTED BUT NOT VERIFIED:** info/attention/urgent, deduplicatie en herstel zijn beschreven maar niet operationeel. |
| Federatie naar WBD Home | **MISSING.** |

Er is geen generiek onderscheid `INFO / ATTENTION / URGENT`, geen situatiesleutel voor deduplicatie, geen closure op herstel en geen contextweging door Atlas over WBD-data. Het productprincipe **gezond = stil** is visueel en documentair aanwezig, maar niet als end-to-end capability.

**RECOMMENDATION:** bouw pas een WBD-attentionweergave nadat betrouwbare bronnen en identiteit bestaan. Eén situation-record moet bron, organisatie, ernst, betekenis, menselijke eigenaar, status en herstelbewijs bewaren. Geen notificatiecentrum en geen badge per event.

## 9. Personalisation

| Onderdeel | Status | Oordeel |
| --- | --- | --- |
| Volgorde/zichtbaarheid WBD-onderdelen | Niet aanwezig | **MISSING** |
| Compact/uitgebreid | Niet aanwezig | **MISSING** |
| Persoonlijke startomgeving | Niet aanwezig | **MISSING** |
| Organisation context | Alleen dossierroute, geen actieve context | **PARTIAL** |
| Terugkeer naar eerder werk | Atlas localStorage bewaart werkobjecten; WBD-shell niet | **PARTIAL** |
| Vrije appstructuur bouwen | Niet aanwezig en niet gewenst | **SHOULD NOT BUILD** |

Veilige toekomstige personalisatie moet beperkt blijven tot startcontext, recente organisatie/project, rustige dichtheidskeuze en zichtbaarheid/volgorde van toegestane Home-secties. Permissions en tenantstructuur blijven centraal bepaald.

## 10. Visual Language

### Sterke aansluiting

- warm donkergroen/nachtgroen, crème en goud bestaan als gedeelde tokens;
- serifkoppen en sobere sans-serif metadata sluiten aan op de WBD-websitewereld;
- actieve navigatie gebruikt crème in plaats van technologisch blauw;
- kaarten, grenzen en schaduwen zijn rustig en professioneel;
- reduced-motion en focus-visible zijn op meerdere oppervlakken aanwezig;
- desktopcompositie heeft duidelijke hiërarchie en veel gecontroleerde ruimte.

### Gaps

| Aspect | Gap |
| --- | --- |
| Lichtheid | De Workspace is nog overwegend zeer donker en zwaar; de gewenste lichtere, luchtigere richting is slechts in accenten aanwezig. |
| Typography | Veel metadata en bodycopy gebruikt circa `0.54–0.78rem`; dit is vooral mobiel een leesbaarheids- en accessibilityrisico. |
| Tokens | Basistokens bestaan, maar veel componenten herhalen hardcoded kleuren, gradients en kleine maten. |
| Density | Project-, finance- en dossierpagina's tonen veel panelen en metadata tegelijk. |
| Iconography | Geen consistente navigatie-iconfamilie; nummers dragen de primaire oriëntatie. |
| Cards | Visueel consistent, maar te veel gelijkwaardige bordered cards verminderen prioriteit. |
| Accessibility | Semantische labels en focus zijn sterk; formele contrast-, zoom-, screenreader- en WCAG-validatie ontbreekt. |

Dit vraagt polish en consolidatie, geen redesign. Behoud de bestaande wereld en maak haar lichter door typografische schaal, minder permanente panelen en sterkere intentionele disclosures.

## 11. Workspace Home

De huidige Home is visueel sterk en rustig. Zij kiest één actieve werkstroom, toont afgerond/hierna en beperkt zichzelf tot vier ingangen. Dat voorkomt dashboard-overload.

De inhoud is echter statisch: datum `5 augustus 2026`, `Experience Polish`, `F00248` en Project 002-status komen rechtstreeks uit bronconstanten. Er is geen actieve user, organisatie, recent werk, open besluit, werkelijk costsignaal, document of Atlas-situatie.

| Gewenst element | Huidig |
| --- | --- |
| Welkom/context | **PARTIAL:** WBD-context, geen persoon of organisatiekeuze. |
| Huidige projecten | **STATIC.** |
| Aandacht | **STATIC.** |
| Recente gebeurtenissen | **MISSING.** |
| Relevante documenten | **MISSING.** |
| Open beslissingen | **MISSING.** |
| Kosten/voortgang | **PARTIAL:** één statische factuurwaarde; geen costs. |
| Atlas-context | **PARTIAL:** “Powered by Atlas”, geen echte contextfeed. |
| Vervolgacties | **STATIC links.** |

**KEEP:** één primaire focus, rustige begrenzing en maximaal enkele ingangen.  
**IMPROVE:** laat Home later uit betrouwbare organisation/project/attentionqueries komen en toon alleen wat vandaag een beslissing of vervolgactie ondersteunt.

## 12. Atlas

### Canonieke principes die al goed zijn verwerkt

- Atlas is geen chatbotwidget in de Workspace.
- Kennis, hypothese, observatie, inzicht en volgende stap zijn afzonderlijke typen.
- Observaties bewaren bron, context, eigenaar en menselijke review.
- Understanding bewaart lineage en revisies.
- Candidate-cases worden niet als Confirmed waarheid getoond.
- Menselijke correctie en eindverantwoordelijkheid zijn expliciet.
- De Runtime en Cognitive Engine modelleren onzekerheid, alternatieven, stilte en zelfcorrectie.

### Huidige Workspace-representatie

`/atlas` combineert een statische dagelijkse briefing en reviewlaag met browserlokale focus, observaties, Understanding, cases, ideeën en logboek. De actuele Case 0001-snapshot is `candidate`; de UI valt daarom veilig terug op “herbevestiging nodig”. Experience heeft de meest uitgewerkte conversation/runtime, maar is een afzonderlijke omgeving.

### Gap

Atlas is methodisch rijk maar operationeel versnipperd. WBD-data, connectorchanges, Experience-context en Atlas-observaties delen nog geen centrale contextstore. De lange Atlas-pagina presenteert bovendien veel gereedschap en statische reviewcontent tegelijk. Atlas observeert zijn gedrag als canoniek model, maar een duurzame zelfobservatie-/evaluatielus is niet end-to-end in de WBD Workspace bewezen.

**KEEP:** epistemische types, provenance, human review, Candidate/Confirmed-grens.  
**IMPROVE:** centrale contextboundary en rustigere, contextuele presentatie.  
**DO NOT BUILD:** een generieke chatbox als vervanging van Atlas.

## 13. Organisations

Het dossiermodel is generiek genoeg om records met willekeurige `organizationId` te scheiden, maar de architectuur is nog niet organisation-centered in beveiligingszin.

### Wat bestaat

- generiek `Organization`-record met id, naam, type en beschrijving;
- dossierdocumenten, contactnotities en timeline-events dragen `organizationId`;
- vier vaste seeds: WBD, Sportpaleis, Bij Cees en AquaFlask;
- routegebaseerde dossierselectie;
- WBD en Sportpaleis zijn conceptueel onderscheiden.

### Wat ontbreekt

- geen actieve organisation context of switcher;
- geen owner/tenant-id naast het vrije organisatie-id;
- geen server-side queryboundary of row-level autorisatie;
- geen membership, role of permission;
- geen organisatiebrandingconfig;
- geen project-, invoice-, knowledge- of communication-isolatie op één gedeeld model;
- seeddata is hardcoded en daardoor geen betrouwbaar register.

Sportpaleis vormt niet de generieke dossierengine, maar is wel hardcoded als seed, ontwikkelpartner, factuurklant en aparte proof. Dat is acceptabel als bewijsdata, niet als toekomstige platformbasis.

## 14. Customer Workspace Boundary

| Grens | Huidig oordeel |
| --- | --- |
| WBD Internal Workspace | **PARTIAL:** concrete lokale workflows, geen identity/online boundary. |
| Customer Workspace-engine | **MISSING.** |
| `Sport 2000 Sportpaleis Workspace` | **MISSING:** alleen dossier, factuurdata en losse `/sportpaleis-proof`. |
| Organisation-specific visual config | **MISSING.** |
| Generieke capabilityconfig | **MISSING.** |
| Data/permission isolation | **MISSING / P0.** |

De huidige `WorkspaceConfig` configureert productwerelden (`atlas`, `wbd`, `experience`), niet tenantinstances. Breid dit niet rechtstreeks uit tot een vermenging van product- en organisatiecontext. Een toekomstige customer Workspace heeft minimaal afzonderlijke `workspaceInstance`, `organization`, `membership`, `capabilitySet` en `themeConfig` nodig. Sportpaleis-configuratie wordt data, geen fork van de WBD-code.

## 15. Users / Permissions

**MISSING:** WBD heeft geen login, account, user, membership, role, permissioncheck of sessie. Iedereen met toegang tot de lokale devserver kan de lokale WBD-API's benaderen; browserdata wordt alleen door het browserprofiel gescheiden.

De canonieke commerciële richting — drie users, één administrator en twee standard users — is architectonisch nog niet ondersteund. Prijzen voor extra users staan niet in het actuele applicatiemodel.

Minimale toekomstige scheiding:

```text
APPLICATION ROLE
├── administrator: users/rechten + commerciële informatie + uitbreiding aanvragen
└── standard: toegewezen dagelijkse capabilities

INFRASTRUCTURE ACCESS
└── volledig afzonderlijk; nooit impliciet door Workspace administrator
```

Dit is **P0** voor online gebruik. Billing-entitlements mogen later rollen beïnvloeden, maar zijn niet hetzelfde als autorisatie.

## 16. Commercial / Subscription

De code bevat alleen statische uitspraken over modules/capabilities en toekomstige commerciële prijsgrenzen. Er is geen plan-, subscription-, trial-, invoice-entitlement-, payment- of user-expansionmodel.

**RECOMMENDATION:** modelleer later capabilities en entitlements, niet los verkochte schermen. Een trial moet organisatie, capability, start/einde, bewijs van gebruik, menselijke keuze en terugvalgedrag bewaren. Bouw dit pas nadat identity, organisation isolation en betrouwbare usage evidence bestaan. Huidige prioriteit: **P3**, behalve de extensible capabilitycontracten in de organisation foundation (**P1**).

## 17. Costs / Finance

### Wat bestaat

- werkende uitgaande factuurconcepten en definitieve facturen;
- server-side vergrendeling in de lokale bridge;
- PDF-generatie en heropenen;
- eenvoudige totale uitgaande waarde;
- handmatige betaalstatus;
- statische lege staat voor inkomende leveranciersfacturen.

### Wat ontbreekt

- kostenrecords, leveranciers, inkomende facturen en btw-classificatie;
- OpenAI/Codex-kosten, uren, projectkosten en recurring costs;
- relatie tussen kosten, document, organisatie, project en implementatie;
- betaal-/boekhoudexport en audittrail;
- centrale veilige documentopslag.

### Minimale waardevolle eerste cost capability

Geen boekhouding, maar een **Cost Evidence Register**:

- leverancier, factuurdatum en documentreferentie;
- netto, btw en bruto;
- valuta, betaalstatus en recurrence;
- WBD-organisatie en optioneel project/implementatie;
- categorie (hosting, software/AI, inkoop, professioneel, overig);
- bron/provenance en menselijke bevestiging;
- veilige opslag van de originele factuur;
- optionele urenregistratie als aparte cost evidence, niet als factuur.

Dit levert direct administratieve/BTW-vindbaarheid en projecteconomische feedback zonder een grootboek te bouwen. Prioriteit **P1**, maar pas na centrale identity/data/document foundation.

## 18. Project History / Implementation Economics

De huidige `WbdProject` bewaart id, fase, laatste mijlpaal, volgende stap, blockers en soms resultaat. Ontwikkelhistorie bewaart menselijke betekenis. Dat is een sterke start, maar alles is statisch en mist:

- geplande complexiteit en rationale;
- verwachte/werkelijke credits;
- eigen uren en overige kosten;
- hergebruik;
- expliciet GO/NO-GO-besluit als event;
- lessons learned en resultaatmeting;
- bronrelaties en revisions.

Finance en implementation economics moeten gescheiden blijven maar dezelfde cost evidence kunnen refereren. **P1** voor een generiek project/historymodel; automatische budgetvoorspelling pas **P2/P3** na voldoende eigen historische data.

## 19. Documents

Documenten bestaan op de juiste plek: binnen een organisatiedossier, met type, titel, omschrijving, origineel bestandsnaam, MIME, grootte en tijd. Dit volgt de canonieke richting beter dan een losse fileshare.

Gaps:

- alleen browser-IndexedDB; geen multi-device of centrale back-up;
- geen project/case/invoice/evidence-relaties naast organisatie;
- geen uploader-identiteit, versie, hash, scanstatus of retention;
- geen server-side grootte-/typepolicy en geen malwarecontrole;
- openen gebruikt een tijdelijke Blob-URL;
- delete bewaart voor documenten een timeline-event, maar verwijderde inhoud is niet herstelbaar;
- contactnotitieverwijdering verwijdert ook het event, waardoor auditcontinuïteit anders is dan bij documenten.

**KEEP:** organisation-first dossier en metadata.  
**IMPROVE:** centrale objectopslag, provenance, relaties, versie/audit en veilige uploadpolicy.  
**DO NOT BUILD:** één algemene fileshare zonder dossiercontext.

## 20. Communication

Er is geen communicatiecapability. Contactnotities kunnen handmatig `e-mail` als type krijgen, maar er is geen mailbox, sender identity, template, message, thread, delivery status of connector. `/communicatie` is geen werkende route.

Een generieke toekomstige capability kan per organisatie configureren:

- sender identity en mailboxconnector;
- templates en tone;
- message/thread met organisation/project/case-relatie;
- human review en delivery evidence;
- capability- en permissiongrenzen.

`klantenservice@sportpaleis.nl` en Sportpaleis-templates zijn toekomstige configuratiedata, geen basis voor de engine. Prioriteit **P2/P3**; wachten op identity, organisation isolation en mailsecurity uit de relevante Project 002-grenzen.

## 21. Projects / Cases

WBD-projecten zijn statische roadmapcards. Atlas Cases en Understanding hebben rijkere epistemische modellen, maar zijn browserlokaal en niet hetzelfde als operationele projecten.

Een generiek projectmodel ontbreekt voor aanleiding, organisatie, doel, hypothesen, besluiten, implementaties, bewijs, kosten, resultaat en volgende stap. De juiste richting is geen taaklijst, maar een dossier met gekoppelde views:

```text
PROJECT
├── operationele status en volgende stap
├── decisions / hypotheses / evidence
├── implementations en releases
├── documents / communication
├── costs / hours
└── outcome / lessons learned
```

Hergebruik Atlas' provenance- en revisionprincipes; kopieer de rijke Atlas-objecten niet als tweede WBD-waarheid.

## 22. Timeline of Understanding

Er bestaan drie losse historievormen:

1. dossier-timeline: document toegevoegd/verwijderd en handmatige contactnotitie;
2. statische ontwikkelhistorie: betekenisvolle mijlpalen zonder dynamische provenance;
3. Atlas Understanding: typed relaties, revisions en lineage.

Geen daarvan vormt al een geïntegreerde Timeline of Understanding. De dossier-timeline is vooral activiteit, terwijl Atlas de semantische bouwstenen wel heeft. Een toekomstige timeline moet besluiten en betekenis afleiden uit bron-events zonder bronhistorie te overschrijven. Prioriteit **P2** na project/context foundation.

## 23. Context Engine

De canonieke keten bestaat deels in code:

```text
CONNECTOR → NORMALIZER → RECORD CHANGE → TRANSLATOR
          → OBSERVATION CANDIDATE → HUMAN REVIEW → INTERPRETATION
```

Sterk:

- connectorcontract heeft context-id, provenance, hashes, freshness, retries en state boundaries;
- Translator-output blijft `uninterpreted`;
- Atlas-observaties en Understanding bewaren menselijke beoordeling en lineage;
- repositorysnapshot wordt alleen als Confirmed waarheid geladen.

Gap:

- geen scheduler of fleet-runtime;
- WBD-sitemap is de enige werkende connectorproef;
- actuele lokale connectorstaat is historisch en lijkt een oudere opslagvorm te gebruiken;
- geen operationele translator naar de huidige Atlas-reviewqueue;
- geen centrale organisation/context store;
- geen WBD Home-query over geïnterpreteerde context;
- geen reconciliatie tussen repositorywaarheid, browserdata en serverdata.

De architectuur is inhoudelijk herbruikbaar. De implementatie is **PARTIAL**. Voorkom een nieuwe Context Engine; verbind de bestaande contracten pas nadat centrale identity/data boundaries bestaan.

## 24. Connectors

| Connector/capability | Status |
| --- | --- |
| Generiek connectorframework | **VERIFIED:** tests voor sync, diff, retries, contextgrens, translatoridentiteit en fleet health. |
| WBD preview-sitemap | **VERIFIED historisch:** handmatige read-only proef met 13 records. |
| Scheduler | **MISSING.** |
| Workspace UI | **MISSING bewust.** |
| E-mailconnector | **MISSING.** |
| Google Search Console | **DOCUMENTED richting / niet aangetroffen als implementatie.** |
| GA4 | **DEFERRED:** credentials/propertyboundary niet ingericht. |
| Metadata/index-first file connector | **DOCUMENTED richting / niet operationeel bewezen.** |

Behoud de incrementele, read-only, provenance-first architectuur. Voeg geen connector toe omdat een integratie beschikbaar is; de bron moet een concrete ondernemersbeslissing ondersteunen.

## 25. Mobile Readiness

### Scorecard

| Aspect | Score | Bewijs/oordeel |
| --- | ---: | --- |
| Layout reflow | 3/5 | Geen documentbrede overflow op negen routes bij 390×844; grids zakken naar één kolom. |
| Primaire navigatie | 2/5 | Horizontale scroll werkt, maar 746 px inhoud in 326 px vlak en geen sterke affordance. |
| Touch targets | 1/5 | Nav circa 31 px, dossierknoppen circa 37 px, meerdere controls 38–41 px. |
| Leesbaarheid | 2/5 | Sterke hiërarchie, maar veel 9–12 px-equivalente metadata/bodycopy. |
| Home-focus | 3/5 | Rustig en één focus, maar zeer lang en statisch. |
| Dossiers | 2/5 | Geen overflow; leeg dossier circa 2.287 px hoog door permanente formulieren. |
| Finance/invoices | 2/5 | Responsive CSS aanwezig; dense invoer en kleine tekst. |
| Modals/forms | 3/5 | Dialogs en éénkolomsreflow bestaan; real-device toetsenbord/zoom niet getest. |
| Mobile identity/session | 0/5 | Geen WBD-login, sessie of veilige multi-device data. |
| Accessibility evidence | 1/5 | Focus/reduced motion aanwezig; geen formele audit of screenreader/zoomtest. |

**Totaaloordeel: 1,9/5 — PARTIAL, niet klaar voor dagelijks mobiel gebruik.**

De CSS-basis is bruikbaar en verdient geen rewrite. De P0/P1-gaps zijn touch targets, navigatie-oriëntatie, leesbare type-scale, intentionele forms, sticky/headergedrag met mobiel toetsenbord en echte authenticated multi-device journeys.

## 26. Online Readiness

| Voorwaarde | Classificatie | Huidige werkelijkheid |
| --- | --- | --- |
| WBD authentication | **NEEDS WORK** | Niet aanwezig. |
| Sessions/cookies/CSRF | **NEEDS WORK** | Niet aanwezig voor WBD. Experience heeft een aparte implementatie die niet automatisch herbruikbaar is. |
| Users/roles/permissions | **NEEDS WORK** | Niet aanwezig. |
| Organisation isolation | **NEEDS WORK** | Alleen id-filtering in browserstore; geen server enforcement. |
| Centrale database | **NEEDS WORK** | Geen WBD-appdatabase. |
| API boundary | **NEEDS WORK** | Developmentmiddleware zonder productie-auth. |
| Upload/private content | **NEEDS WORK** | Browser-Blobs, geen serverpolicy/objectstore. |
| Environment config | **PARTIAL** | Enkele env vars voor scripts; geen WBD production profile. |
| Secrets | **PARTIAL** | Relevante WBD-code gebruikt geen credentials; toekomstig secretmodel ontbreekt. |
| Error handling | **PARTIAL** | Lokale statusmeldingen en API-errors; geen centraal observabilitycontract. |
| Logging/audit | **NEEDS WORK** | Geen WBD serveraudit; verschillende lokale timelines. |
| Health/readiness | **BLOCKED BY PROJECT 002 / NEEDS WORK** | Project 002 definieert contracten; WBD heeft geen app-endpoint/runtime. |
| Release artifact | **NEEDS WORK** | Public build sluit interne Workspaces bewust uit. |
| Hosting/access | **BLOCKED BY PROJECT 002** | Structurele interne host en access boundary ontbreken. |
| Monitoring/back-up/recovery | **BLOCKED BY PROJECT 002** | Baselines gedocumenteerd, niet volledig operationeel. |
| Cloudflare | **BLOCKED BY PROJECT 002C.7/8** | Niet nodig om lokaal te bouwen; huidige cutover is NO-GO. |
| Mobile | **NEEDS WORK** | CSS partial; geen daily-use bewijs. |

### Beslissende productiegrens

De standaard `npm run build` maakt alleen de publieke website en verifieert expliciet dat interne Workspace-inhoud ontbreekt. WBD-routes en lokale write-API's worden alleen geïnstalleerd wanneer Vite met `command === "serve"` draait. De huidige Workspace kan daarom niet simpelweg “mee worden gedeployed”. Er is eerst een expliciete interne applicatieruntime nodig.

## 27. Security / Trust

Positief:

- interne HTML is `noindex, nofollow`;
- zichtbare userinput wordt doorgaans ge-escaped;
- invoer heeft lengte- en typevalidatie;
- factuur-id's worden gesanitized en definitieve facturen zijn lokaal server-side locked;
- connectoren vereisen contextgrenzen en bewaren geen secrets;
- Project 002-documentatie communiceert layered security, herstel en menselijke verantwoordelijkheid.

Blockers:

- `noindex` is geen toegangsbeveiliging;
- geen WBD-auth, autorisatie, tenant isolation, CSRF, session expiry of audit;
- development-API's schrijven lokale repositorydata zonder usercontext;
- documentuploads hebben geen centrale malware-, grootte-, type- of privacyboundary;
- browserdata en lokale back-up zijn niet gelijk aan managed recovery;
- geen trust/status UI of menselijke uitleg over privacy, beschikbaarheid en verantwoordelijkheid;
- Cloudflare kan deze applicatiegaps niet oplossen.

Een toekomstige Trust-ervaring moet evidence-backed uitleg geven over lagen, privacy, back-up, onderhoud, transparantie en verantwoordelijkheid. Vendorlogo's zijn geen trustbewijs. Prioriteit voor een publieke/customer-facing Trust UI is **P2/P3**; de onderliggende securitycontrols zijn **P0**.

## 28. Experience Quality

### Sterk

- uitgesproken rustige, eigen WBD-wereld;
- sterke desktopinformatiehiërarchie;
- betekenisvolle lege staten in plaats van fictieve data;
- menselijke taal en duidelijke boundaries;
- weinig decoratieve animatie;
- consistente shell over productwerelden;
- definitieve factuur- en epistemische veiligheidsgrenzen zijn voelbaar in de UI.

### Zwak

- statische informatie oogt actueler dan zij is;
- veel schermen zijn kijkpagina's, geen dagelijkse werkplek;
- primaire en secundaire informatie gebruiken te vaak dezelfde card-/bordergrammatica;
- kleine tekst en dichte metadata beperken leesbaarheid;
- permanente formulieren maken dossiers administratief;
- routerfallbacks verbergen defecten;
- Atlas is methodisch sterk maar cognitief lang;
- mobiel werkt technisch, maar vraagt veel scroll en precisie;
- geen persoonlijke, organisation- of permissioncontext.

De UX is een sterke **candidate experience**, geen gevalideerde dagelijkse operationele journey.

## 29. Keep / Improve / Remove / Add

| Richting | Onderdeel | Reden |
| --- | --- | --- |
| **KEEP** | Gedeelde Workspace-shell en product-switcher | Sterke, herbruikbare basis. |
| **KEEP** | WBD donkergroen/crème/goud en typografische identiteit | Sluit al aan op de canonieke wereld. |
| **KEEP** | Organisation-first dossiers | Betere basis dan een fileshare. |
| **KEEP** | Factuurtemplate, centrale berekening en definitieve lock | Werkend en betrouwbaar begrensd. |
| **KEEP** | Atlas provenance, human review, Candidate/Confirmed en Understanding-lineage | Kern van reliability over intelligence. |
| **KEEP** | Connectorcontract en repository als relevante autoriteit | Herbruikbaar, leverancier-onafhankelijk. |
| **IMPROVE** | Routecontract en 404/fallback | Defecte routes mogen niet als Overzicht lijken te werken. |
| **IMPROVE** | Home | Van statische status naar betrouwbare dagelijkse query. |
| **IMPROVE** | Navigatie/mobile | Iconen, grouping, attention, 44 px en scrolloriëntatie. |
| **IMPROVE** | Dossiers | Forms pas na intentie; centrale opslag en provenance. |
| **IMPROVE** | Finance | Conceptarchief, incoming cost evidence, permissions en audit. |
| **IMPROVE** | Type-scale/tokens | Lichter, leesbaarder, minder hardcoded varianten. |
| **REMOVE / RECONSIDER** | Stille unknown-route fallback | Verbergt fouten en misleidt actieve state. |
| **REMOVE / RECONSIDER** | Oude ongebruikte WBD Overzichtrenderer/entries | Bevat communicatie- en back-uplinks die niet met actuele routes kloppen. |
| **REMOVE / RECONSIDER** | Statische actuele datum/status zonder bronlabel | Veroudert en presenteert curated content als live. |
| **REMOVE / RECONSIDER** | Infrastructuurpagina als duplicaat van Project 002 | Alleen behouden als read-only index naar autoritatieve evidence. |
| **REMOVE / RECONSIDER** | Permanente volle dossierformulieren | Capability behouden, standaardpresentatie heroverwegen. |
| **ADD** | Identity, membership, permissions en organisation isolation | P0 voor online/multi-user. |
| **ADD** | Centrale data-, document- en auditboundary | P0 voor duurzaam dagelijks gebruik. |
| **ADD** | Betrouwbaar attention/situationmodel | P1 voor dagelijkse waarde. |
| **ADD** | Project/history/implementation economics | P1 voor WBD-leren. |
| **ADD** | Minimal Cost Evidence Register | P1 voor directe bedrijfswaarde. |
| **ADD** | Beperkte personalisatie | P2 na identity/context. |
| **ADD** | Generieke customer-workspaceconfiguratie | P2 na isolation; geen Sportpaleis-fork. |

## 30. Priority Matrix

Schaal: waarde/risico/hergebruik `H/M/L`; complexity `S/M/L/XL`.

| Prio | Gap / resultaat | Waarde | Risico indien uitgesteld | Complexiteit | Hergebruik | Dependency | Evidence | Implementatievolgorde |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: |
| P0 | Expliciet WBD production application boundary | H | H | L | H | Project 002 runtime/hostinginput | Dev-only routes/API; public-only build | 1 |
| P0 | Route-integriteit en verwijdering stille fallback | H | M | S | H | Geen | Twee bewezen foutieve routes | 1 |
| P0 | Identity/session/CSRF-contract | H | H | L | H | Host/TLS/secrets uit 002 | Niet aanwezig | 2 |
| P0 | User/membership/permissionmodel | H | H | M | H | Identity + orgmodel | Niet aanwezig | 2 |
| P0 | Server-side organisation/data isolation | H | H | L | H | Centrale DB + permissions | Alleen browser-id filtering | 2 |
| P0 | Centrale database/documentopslag/audit | H | H | L/XL | H | Recovery/hosting uit 002 | IndexedDB/repositoryfiles | 3 |
| P0 | Reproduceerbaar releaseartefact + health/readiness | H | H | M | H | Project 002 release/monitoring | Interne app ontbreekt in dist | 4 |
| P1 | Mobile shell, 44 px, leesbaarheid en form-intentie | H | M | M | H | Route/shell foundation | Gemeten 31/37 px en lange dossierjourney | 5 |
| P1 | Dynamische Home + situation/attentionmodel | H | M | L | H | Betrouwbare sources/org/user | Home is static | 6 |
| P1 | Project/history/economics foundation | H | M | L | H | Centrale data/context | Huidige projectdata static | 7 |
| P1 | Cost Evidence Register + incoming documents | H | M | M | H | Documents, permissions, project | Incoming leeg | 8 |
| P1 | Factuurconceptarchief/herstel | M | M | M | M | Centrale storage/audit | Bestaand onvolledig concept | 8 |
| P2 | Context Engine-integratie naar WBD/Atlas | H | M | L | H | Sources + identity + project | Contracten bestaan los | 9 |
| P2 | Customer Workspace config/theme/capabilities | H | H | L | H | Isolation + permissions | Niet aanwezig | 10 |
| P2 | Beperkte personalisatie | M | L | M | M | User/context | Niet aanwezig | 10 |
| P2 | Generieke communicatiecapability | M | M | L | H | Mailsecurity/identity/org | Niet aanwezig | 11 |
| P3 | Subscription/trials/user expansion | M | L | L | H | Capabilities + billingbesluit | Niet aanwezig | 12 |
| P3 | Trust UI, credits, automatische budgets | M | L | M/L | M | Eerst echte evidence | Alleen richting | 13 |

## 31. Dependencies on Project 002

### Veilig parallel uit te voeren na menselijke GO

- routecontract, expliciete not-found en opruimen van dead/duplicate navigationdata;
- application architecture decision en production entry-ontwerp zonder deployment;
- generieke organisation/user/permission/capability schemas en contracttests;
- mobiele shell- en accessibilitypolish op lokale data;
- project/history/cost domeinmodellering en fixtures;
- hergebruikplan voor Atlas provenance/contextcontracten;
- read-only releasemanifestontwerp.

### Vereist afstemming met Project 002, maar kan lokaal worden voorbereid

- auth/sessionimplementatie;
- database- en objectstoragekeuze;
- health/readiness/loggingcontract;
- secrets/environmentprofielen;
- backup/restore-eisen voor Workspace-data;
- trusted proxy/client-IP-grens;
- monitoringevent naar attentioncontract.

### Moet absoluut wachten op Project 002-uitkomst en aparte GO

- hosting of online publicatie van WBD/Atlas Workspace;
- productiecredentials, accounts of vaultacties;
- DNS, Cloudflare, TransIP of proxyconfiguratie;
- externe monitoringactivatie;
- productie-database-/objectstorageprovisioning;
- customerdata migreren;
- echte Sportpaleis Workspace activeren;
- productie-release, cutover en validatie.

Project 002C.7 blijft **NO-GO** voor cutover. Cloudflare is een mogelijke laag, niet de Workspace-foundation.

## 32. Proposed Implementation Phases

Iedere fase is klein, geïsoleerd en vraagt afzonderlijke GO.

### WS.1 — Canonical Application Boundary & Route Integrity

**Doel:** één expliciet route-/runtimecontract; correcte 404/fallback; real/static/empty/legacy labels; dead en duplicate WBD-entrydata beslissen; interne production entry als ontwerp vastleggen.  
**Waarde:** verwijdert misleiding en maakt alle volgende tests betrouwbaar.  
**Project 002:** geen harde uitvoeringsdependency; geen deployment.  
**Exit:** route manifest, alle links resolve correct, unknown route is expliciet, production boundary testbaar.

### WS.2 — Organisation, Identity & Permission Foundation

**Doel:** generieke organisation, workspace instance, user, membership, role en capabilitycontracten; scheiding application/infrastructure access.  
**Project 002:** lokale modellen/tests parallel; runtime/sessionintegratie afgestemd met 002.  
**Exit:** bewezen tenantqueries en permissiontests, nog zonder productiegegevens.

### WS.3 — Durable Data & Document Boundary

**Doel:** centrale repositoryinterfaces voor dossiers, knowledge, projectdata, audit en private documents; migratieplan voor browserdata.  
**Project 002:** database/objectstorage/backupkeuze afhankelijk.  
**Exit:** lokale integration tests, uploadpolicy en recoverabilitycontract; geen productieprovisioning.

### WS.4 — Mobile Daily Shell & Navigation

**Doel:** 44 px touch targets, leesbare type-scale, routegroepering/eigen iconen, mobiele oriëntatie, intentionele dossierforms en keyboard/zoomtests.  
**Project 002:** veilig parallel, behalve authenticated journey.  
**Exit:** overeengekomen device/zoom/screenreader scorecard en geen regressie in desktop.

### WS.5 — Home & Attention Foundation

**Doel:** situationmodel `INFO / ATTENTION / URGENT`, deduplicatie/herstel en rustige Home-query; gezond = stil.  
**Project 002:** health/monitoring blijft extern; lokaal werken met expliciete sources/fixtures.  
**Exit:** één betekenisvol signaal per situatie, herleidbaar en sluitbaar.

### WS.6 — Projects, Decisions & Implementation Economics

**Doel:** echte projectrecords, decisions, evidence, costs/credits/uren, outcome en lessons learned; Atlas-lineage hergebruiken.  
**Project 002:** geen harde dependency na centrale datafoundation.  
**Exit:** één WBD-project end-to-end herleidbaar zonder taaklijstproduct te worden.

### WS.7 — Cost Evidence & Finance Continuity

**Doel:** inkomende leveranciersfacturen en Cost Evidence Register; factuurconceptarchief/herstel; relatie met project/document.  
**Project 002:** private document storage, backup en permissions vereist.  
**Exit:** één echte leveranciersfactuur veilig vindbaar met btw-, project- en broncontext; geen boekhoudclaims.

### WS.8 — Atlas Context Integration

**Doel:** bestaande connector/translator/observation/Understandingcontracten koppelen aan centrale context en WBD Home, zonder chatwidget.  
**Project 002:** read-only connectorsecrets en scheduler later; lokale fixtures eerst.  
**Exit:** één bronwijziging wordt via menselijke review één herleidbare contextuitkomst.

### WS.9 — Customer Workspace Platform Boundary

**Doel:** generieke workspace instance, capabilityconfig en themeconfig; WBD internal versus customer views; Sportpaleis alleen als toekomstige data-instance.  
**Project 002:** identity/isolation/hosting vereist.  
**Exit:** generieke testtenant zonder Sportpaleis-specifieke enginecode.

### WS.10 — Communication & Commercial Capabilities

**Doel:** generiek message/sender/templatecontract en later entitlement/trialmodel.  
**Project 002:** mailsecurity, secrets en monitoring vereist.  
**Exit:** alleen na bewezen behoefte; geen automatische verkoop- of notificatiemachine.

### WS.11 — Secure Online Integration & Release Validation

**Doel:** production appserver, auth, sessions, DB/objectstore, audit, health, backup/restore, monitoring, immutable release, mobile/security validation.  
**Project 002:** volledig afhankelijk van goedgekeurde infrastructuur- en accessbaselines.  
**Exit:** afzonderlijke GO voor productie; geen onderdeel van dit assessment.

## 33. Deferred Items

- Cloudflare-account, zone, cutover of proxy;
- productiehosting en deployment;
- Sportpaleis UI, mailflows of officiële brandingconfiguratie;
- billingprovider, abonnementen en extra-userbetalingen;
- volledige boekhouding, bankkoppeling, OCR en btw-aangifte;
- realtime notifications of activity feed;
- brede connectorcatalogus;
- automatische Atlas-kennis of beslissingen zonder menselijke review;
- vrije drag-and-drop-appbuilder;
- Trust-marketing zonder operationeel bewijs;
- credits/budgetvoorspelling voordat eigen historie voldoende is.

## 34. Open Questions

1. Is de eerste online Workspace uitsluitend WBD internal, of moet de foundation direct een lege customer-tenant kunnen dragen?
2. Welke bestaande browserdata moet duurzaam worden gemigreerd en welke is uitsluitend proefdata?
3. Welke organisatie- en projectrecords zijn door Donovan bevestigd en mogen seeds vervangen?
4. Wat wordt de autoritatieve applicatiedatabase en private objectstorage binnen de uitkomst van Project 002?
5. Welke identity-oplossing past bij WBD en toekomstige customer workspaces zonder infrastructuurrechten te vermengen?
6. Welke acties mogen standard users binnen dossiers, projecten, finance en communication uitvoeren?
7. Welke commerciële informatie is administrator-only?
8. Welke statische projectclaims zijn nog actueel en wie mag ze bevestigen?
9. Moet de lokale dossierback-up na centrale opslag blijven bestaan als user-export, of alleen als migratiehulpmiddel?
10. Welke minimale mobile devices, zoomniveaus en assistive technologies vormen de acceptatiematrix?
11. Welke inkomende leveranciersfactuur is geschikt als eerste echte Cost Evidence-test zonder gevoelige data onnodig te verspreiden?
12. Welke source mag als eerste end-to-end Context Engine-proef naar WBD Home lopen?
13. Wanneer heeft communicatie aantoonbaar meer waarde dan handmatige contactnotities?
14. Welke Project 002-gates zijn exact vereist vóór een eerste interne staginglogin?
15. Welke brede werkboomwijzigingen vormen de uiteindelijke schone Workspace-releasebasis?

## 35. GO / NO-GO Recommendation

### A. Canonical assessment

**GO.** De repository, lokale UI, opslag, tests, buildgrens en relevante canonieke documenten leveren voldoende bewijs voor een betrouwbare current-state- en gapbeoordeling. Onzekerheden zijn expliciet gemarkeerd.

### B. Huidige Workspace als lokale productkandidaat

**GO met grenzen.** Geschikt voor lokale review en gecontroleerd gebruik van de bestaande factuur- en dossierproeven. Browserlokale of repositorydata mag niet als gedeelde productiebron worden voorgesteld.

### C. Huidige Workspace voor veilig dagelijks online/mobile gebruik

**NO-GO.** Identity, permissions, organisation isolation, centrale data, private documentstorage, production runtime, releaseartefact, health, audit, recovery en daily mobile validation ontbreken.

### D. Eerste aanbevolen implementatiefase `WS.1`

**NO-GO CURRENTLY, uitsluitend omdat expliciete menselijke beoordeling en GO nog ontbreken.** Na goedkeuring is `WS.1 — Canonical Application Boundary & Route Integrity` technisch **GO** als geïsoleerde lokale fase. Zij mag geen deployment, infrastructuur, Cloudflare, databaseprovisioning of Sportpaleis-implementatie bevatten.

### E. Fasering parallel aan Project 002

**CONDITIONAL GO** voor WS.1, lokale contractdelen van WS.2, en WS.4 na aparte menselijke GO.  
**NO-GO** voor online integratie, productieaccess, provisioned data, monitoringactivatie en release totdat Project 002 zijn eigen gates draagt.

### Uitvoeringsbevestiging

- Toegevoegd: `docs/atlas/PROJECT-WBD-WORKSPACE-CANONICAL-REVIEW.md`.
- Geen application code gewijzigd.
- Geen CSS of component gewijzigd.
- Geen databasewijziging of migratie uitgevoerd.
- Geen deployment uitgevoerd.
- Geen infrastructuur-, DNS-, TransIP- of Cloudflarewijziging uitgevoerd.
- Geen externe accounts, credentials of secrets gebruikt.
- Geen Sportpaleis-implementatie gestart.
- Project 002-documentatie niet inhoudelijk gewijzigd.
- Geen implementatiefase gestart.
- Werkelijke Codex-credits zijn in deze omgeving niet zichtbaar en worden daarom niet gerapporteerd of geschat.

**STOP:** wacht op menselijke beoordeling en expliciete GO.
