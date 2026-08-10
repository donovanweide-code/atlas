# Project 001 Final Release Review — 5 augustus 2026

> **Formele vervolgstatus — 6 augustus 2026:** de hieronder vastgelegde deployment-NO-GO blijft geldig als infrastructuurgrens, maar blokkeert de inhoudelijke afsluiting van Project 001 niet langer. Productontwikkeling en releasecandidate zijn formeel afgerond en overgedragen via [`PROJECT-001-FINAL-HANDOFF-TO-PROJECT-002.md`](PROJECT-001-FINAL-HANDOFF-TO-PROJECT-002.md). Productiepublicatie valt onder Project 002.

## Besluit

**Project 001D releasecandidate: GO.** De vier afgebakende blockers zijn in de actuele lokale implementatie opgelost en gevalideerd.

**Definitieve afsluiting Project 001: NO-GO zolang de releasecandidate niet afzonderlijk is gepubliceerd en op productie is herbevestigd.** Publiceren viel expliciet buiten deze opdracht. De huidige productiepagina `https://experience.webuildanddesign.nl/ervaar` rapporteert op 5 augustus 2026 nog canonical `/e/` en bevat nog geen faviconlinks. Dit is een releasehandeling, geen nieuw product- of UX-blocker.

## Readiness Check

- Doel: uitsluitend de vastgestelde releaseblokkades oplossen.
- Omvang: XS voor blockers 1–3; de goedgekeurde aanvulling voegt alleen de minimale Experience Workspace toe.
- Hergebruik: bestaande Experience-API, opslag, sessies, Observatory-gegevens, routes en gedeelde Workspace-shell.
- Niet uitgevoerd: commit, merge, push, publicatie, infrastructuurwijziging of Project 002.

## Opgeloste blockers

### 1. Officieel WBD-favicon

Alle publieke en interne HTML-entrypoints verwijzen nu naar dezelfde compacte WBD-uitvoering in `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` en `safari-pinned-tab.svg`. De tijdelijke Vite-uitvoering is verwijderd. Er is geen manifest aanwezig en er is voor deze blocker geen manifest toegevoegd.

### 2. Understanding-toegankelijkheid

Uitsluitend de twee ontbrekende toegankelijke namen zijn toegevoegd via bestaande koppen en `aria-labelledby`: het inzichtveld en de betekenisvolle-volgende-stap. Focus- en toetsenbordgedrag gebruiken de bestaande patronen.

### 3. Experience-synchronisatie

- `/ervaar` is in bron, metadata en releasepakket de canonieke menselijke ingang.
- `/e/` zonder token verwijst rustig naar `/ervaar`.
- Geldige, ongeldige en verlopen tokens en hervatten blijven compatibel.
- Oude uitnodigingstaal is geen primaire Experience-boodschap meer.
- Productie is bewust niet aangepast; zie het besluit bovenaan.

### 4. Experience Workspace als beheeromgeving

- De Workspace-selector opent `/workspace/experience`, nooit `/ervaar` of `/e/`.
- De pagina legt de drie ingangen `/ervaar`, `/e/#token` en `/workspace/experience` uit.
- Overzicht en detail lezen rechtstreeks uit de bestaande Observatory/Experience-API.
- De lijst toont bestaande sessies, status, bron en datums.
- Detail toont uitsluitend bewust opgeslagen antwoorden/reality contacts, feedback, gebeurtenissen en observatieverwijzingen.
- Atlas blijft de plaats voor menselijke observatiereview; Observatory blijft secundair onderzoek en historie.
- Er is geen tweede sessie-, antwoord-, review- of opslagmodel gebouwd.
- De lege toestand is als expliciete interfacecode en regressiepad aanwezig; de screenshots gebruiken een geïsoleerde technische dataset om de gevraagde lijst en details te bewijzen.

## Gewijzigde bestanden binnen Project 001D

- `website/public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `safari-pinned-tab.svg`
- dezelfde vier Experience-assets onder `website/experience-public/`
- `website/index.html`, `internal.html`, `experience.html`, `first-visit-v2.html`, `context-first-experiment.html`, `public/404.html`
- `website/scripts/prepare-experience-package.mjs`
- `website/src/atlas-workspace.ts`
- `website/src/workspace-config.ts`, `workspace-shell.ts`, `internal-main.ts`, `experience-validation-main.ts`
- `website/src/experience-admin-workspace.ts`
- `website/src/styles/experience-admin-workspace.css`
- `website/vite.config.ts`
- `website/tests/project-001d-release-blockers.test.mjs`, `workspace-foundation.test.mjs`

## Validatie

- TypeScript `--noEmit`: **PASS**
- Productiebuild: **PASS**
- Public-only-build: **PASS**, 32 bestanden en 10 tekstbestanden gecontroleerd
- Experience-productiebuild en pakketvoorbereiding: **PASS**
- Volledige regressie: **244/244 PASS**, 0 failures
- `git diff --check`: **PASS** (uitsluitend bestaande CRLF-waarschuwingen)
- Browserconsole: **PASS**, geen fouten of waarschuwingen; alleen Vite connect/connected-debugregels
- Responsive: desktop 1440×900, tablet 768×1024 en mobiel 430×932 zonder horizontale overflow
- Extra browsercontrole: publieke website, Atlas, WBD Workspace, `/ervaar`, Experience Workspace, sessiedetail en Observatory

## Controlelocaties

### Publiek

- Website: `http://127.0.0.1:5173/`
- Experience: `http://127.0.0.1:5180/ervaar`
- Compatibiliteit zonder token: `http://127.0.0.1:5180/e/`
- Ongeldige token: `http://127.0.0.1:5180/e/#ongeldige-project-001d-token`

### Intern

- Experience Workspace: `http://127.0.0.1:5180/workspace/experience`
- Observatory: `http://127.0.0.1:5180/observatory`
- Atlas: `http://127.0.0.1:5173/atlas`
- Atlas-locaties: `#overzicht` (Vandaag), `#werkelijkheid`, `#observatie-review`, `#praktijkdossiers`, `#daily-horizon`, `#werkruimte`, `#cases`, `#understanding`, `#ideeen`, `#logboek`
- Fundament: `http://127.0.0.1:5173/atlas/fundament`
- Atlas Lab, review-only: `http://127.0.0.1:5173/atlas-lab`
- WBD: `http://127.0.0.1:5173/workspace/wbd/overzicht`
- WBD-routes: `/organisaties`, `/projecten`, `/ontwikkelpartners`, `/business-foundation`, `/infrastructuur`, `/kennisvoorstellen`

Reviewbenamingen als `#vandaag`, `#observaties`, `#praktijkbronnen`, `#horizon` en `#kennisvoorstellen` zijn geen tweede routes; zij corresponderen met de canonieke locaties hierboven.

## Screenshots

Map: `docs/atlas/screenshots/project-001d-final-release-review/`

- publieke website, Atlas, WBD Workspace en `/ervaar` — desktop
- Experience Workspace overzicht en sessiedetail — desktop en full-page
- Observatory — desktop
- publieke website, Atlas, `/ervaar` en Experience Workspace — mobiel 430×932
- Experience Workspace — tablet 768×1024

## Scopebevestiging

Project 001D heeft uitsluitend de drie oorspronkelijke releaseblockers en de expliciet toegevoegde vierde blocker opgelost. Er is geen nieuwe Experience-flow, observatiemethode, Atlas-functionaliteit, tracking, authenticatie, infrastructuur of Project 002 gestart.

## Eindadvies

De code en het releasepakket zijn productiewaardig als **Project 001D releasecandidate**. Geef Project 001 pas definitief GO nadat een afzonderlijk geautoriseerde publicatie de productiecanonical, faviconassets, Experience-routes en interne Workspace heeft gesynchroniseerd en een korte productie-smoketest deze vier punten bevestigt.
