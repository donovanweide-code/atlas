# WS.1 — Route / Application Boundary Implementation

**Project:** WBD Workspace Evolution binnen Project 002C  
**Fase:** WS.1 + 002C-WSP.2B  
**Datum:** 2026-08-07  
**Status tijdens uitvoering:** lokale implementatie-GO; productie, deployment en providers NO-GO

## 1. Preflight

- **Complexiteit:** middel.
- **Risico:** laag/middel; routewijzigingen kunnen navigation, refresh en browserhistorie raken.
- **Indicatieve Codex-bandbreedte:** €25–60. Werkelijke eurocredits zijn niet zichtbaar en worden niet verzonnen.
- **Rollback:** uitsluitend de hieronder geregistreerde WS.1-bestanden terugdraaien; geen brede worktree-reset en geen bestaande evidence verwijderen.
- **Wijzigingsgrens:** lokale application-code, tests, providerneutrale runtimecontracten en dit document. Geen account, aankoop, DNS, providerconfiguratie, echte klantdata, deployment of productie.

Baseline vóór wijziging op 2026-08-07:

- `npm.cmd test`: **PASS — 244/244**.
- `npm.cmd run build`: **PASS**; publieke-only build en boundarycontrole geslaagd.
- De worktree bevatte vooraf veel bestaande gewijzigde en untracked bestanden; deze zijn gebruikers-eigendom en blijven buiten rollback/scope.

## 2. Before-state

De publieke website gebruikt `main.ts`; interne developmentroutes worden in Vite naar `internal-main.ts` herschreven. WBD wordt client-side op pathname gedispatcht. De actuele WBD-boundary is `/workspace/wbd`; Experience gebruikt `/workspace/experience` en een eigen productionbuild; Atlas gebruikt `/atlas`.

Twee fallbacks verborgen fouten:

1. `getWbdNavigationItem()` retourneerde voor iedere onbekende WBD-route `Overzicht`.
2. `renderWbdFoundation()` eindigde voor iedere niet-herkende foundationroute met `renderOverview()`.

Daarom leken onder andere `/workspace/wbd/communicatie`, onbekende business-foundation-subroutes en typefouten succesvol. `/workspace/wbd/tijdlijn` verwees naar werkende lokale back-upcode, maar de dispatcher bereikte die code niet.

## 3. Route inventory vóór wijziging

| Route | Current target | Expected target | Boundary | Auth later | Org context later | Direct link | Before-status |
|---|---|---|---|---|---|---|---|
| `/` + publieke contentroutes | publieke website | publieke website | PUBLIC | nee | nee | ja | werkend, eigen entry |
| `/ervaar`, `/e` | Experience public/personal | Experience | EXPERIENCE | eigen contract | nee | ja | eigen build/boundary |
| `/workspace/experience/*` | Experience Admin | Experience Workspace | EXPERIENCE | ja | eigen context | ja | apart van WBD |
| `/atlas`, `/atlas/fundament` | Atlas Workspace | Atlas | ATLAS | later | nee | ja | eigen boundary |
| `/workspace/wbd` | WBD Overzicht | alias naar canonical Home | WBD WORKSPACE | ja | nee | ja | duplicate alias |
| `/workspace/wbd/overzicht` | Overzicht | Home | WBD WORKSPACE | ja | nee | ja | canonical |
| `/workspace/wbd/organisaties` | organisatielijst | organisatielijst | WBD WORKSPACE | ja | browse | ja | canonical |
| `/workspace/wbd/organisaties/:id` | dossier | dossier | WBD WORKSPACE | ja | ja | ja | canonical; id is nog geen securitykey |
| `/workspace/wbd/projecten` | projecten | projecten | WBD WORKSPACE | ja | later | ja | canonical |
| `/workspace/wbd/ontwikkelpartners` | partners | partners | WBD WORKSPACE | ja | later | ja | canonical |
| `/workspace/wbd/ontwikkeling/monitor` | monitor | monitor | WBD WORKSPACE | ja | nee | ja | canonical |
| `/workspace/wbd/ontwikkeling` | monitor | alias naar monitor | WBD WORKSPACE | ja | nee | ja | duplicate alias |
| `/workspace/wbd/ontwikkeling/historie` | historie | historie | WBD WORKSPACE | ja | nee | ja | canonical |
| `/workspace/wbd/ontwikkeling/feedback` | feedback | feedback | WBD WORKSPACE | ja | later | ja | canonical |
| `/workspace/wbd/business-foundation/*` | bedrijfs-/financepagina's | expliciete bekende routes | WBD WORKSPACE | ja | nee | ja | bekende routes werkend; unknown viel stil terug |
| `/workspace/wbd/business-foundation/finance/facturen/*` | facturen | list/create/detail/sent focusroutes | WBD WORKSPACE | ja | later | ja | werkend; te brede prefixdispatch |
| `/workspace/wbd/infrastructuur` | infrastructuur | infrastructuur | WBD WORKSPACE | ja | nee | ja | canonical |
| `/workspace/wbd/kennisvoorstellen/*` | lijst/detail | lijst/detail | WBD WORKSPACE | ja | later | ja | canonical |
| `/workspace/wbd/kennis` | Atlas Knowledge Repository | repository | WBD WORKSPACE | ja | nee | ja | canonical secondary capability |
| `/workspace/wbd/tijdlijn` | door fallback Overzicht | lokale back-up/continuïteit | WBD WORKSPACE | ja | nee | ja | **dead dispatch** |
| `/workspace/wbd/communicatie` | door fallback Overzicht | geen capability; expliciete 404 | WBD WORKSPACE | ja | later | ja | **legacy/dead** |
| `/workspace/wbd/<unknown>` | Overzicht met actieve Home | expliciete Workspace 404 | WBD WORKSPACE | ja | onbekend | ja | **silent fallback defect** |
| `/atlas-lab`, `/sportpaleis-proof` | lokale proeven | dev-only | DEVELOPMENT | nee | nee | beperkt | niet promoveren |

Hashnavigatie bestaat binnen `/atlas`; WBD-schermidentiteit is pathname-driven. Querygebruik bestaat voor `?bewerken=1` op een kennisvoorstel. WBD-routekeuze hangt niet af van local/session storage.

## 4. Application boundary

### Besluit

De canonieke WBD-boundary blijft:

```text
/workspace/wbd
/workspace/wbd/...
```

Dit is aantoonbaar beter dan de kortere generieke `/workspace`-optie in de huidige multi-Workspace-architectuur:

- WBD en Experience hebben binnen dezelfde familie elk een expliciete namespace: `/workspace/wbd` en `/workspace/experience`;
- `/atlas` blijft een eigen epistemische werkruimte en wordt niet stil onderdeel van WBD;
- de bestaande route-identiteiten, links, dossier-ID's en workflows blijven behouden;
- dezelfde app kan later achter `workspace.webuildanddesign.nl` worden gemount of geproxied zonder route-/domeinmodel te vermengen;
- een hostname of pathname is nooit een autorisatiebewijs; WS.2/WS.3 voegen server-side identity, organisationcontext en data-isolation toe.

De production-entry is nu apart van de publieke en Experience-entrypoints:

```text
PUBLIC        index.html       -> src/main.ts                -> dist/
EXPERIENCE    experience.html  -> experience validation app -> dist-experience/
WBD WORKSPACE workspace.html   -> src/workspace-main.ts      -> dist-workspace/
LOCAL INTERNAL internal.html   -> src/internal-main.ts       -> dev-only dispatcher
```

`dist-workspace` bevat na build alleen `workspace.html`, het compacte officiële WBD-favicon, één Workspace-CSS-bundle en één Workspace-JavaScriptbundle. `publicDir` staat voor deze build uit. Publieke homepagecopy/rasterassets, Experience-entrycode en dev-only routes worden door de buildverificatie geweigerd.

## 5. Canonical route map na implementatie

| Canonical route | Routeklasse | Renderer/doel | Active navigation | Org-context | Direct/refresh | Status |
|---|---|---|---|---|---|---|
| `/workspace/wbd/overzicht` | future authenticated root | Home/actuele bedrijfspraktijk | Overzicht | nee | ja | canonical |
| `/workspace/wbd/organisaties` | future authenticated browse | organisatielijst | Organisaties | nee | ja | canonical |
| `/workspace/wbd/organisaties/:organizationId` | future org-guarded detail | bestaand dossier | Organisaties | ja | ja | canonical |
| `/workspace/wbd/organisaties/:organizationId/documenten` | future org-guarded browse | WS.3 documentroutecontract | Organisaties | ja | ja | contractstate, geen nieuwe dataflow |
| `/workspace/wbd/organisaties/:organizationId/documenten/nieuw` | focusroute | toekomstige documentinvoer | Organisaties | ja | ja | contractstate, geen formulier gebouwd |
| `/workspace/wbd/organisaties/:organizationId/notities/nieuw` | focusroute | toekomstige notitie-invoer | Organisaties | ja | ja | contractstate, geen formulier gebouwd |
| `/workspace/wbd/projecten` | future authenticated browse | projecten | Projecten | later per record | ja | canonical |
| `/workspace/wbd/ontwikkelpartners` | future authenticated browse | ontwikkelpartners | Ontwikkelpartners | later | ja | canonical |
| `/workspace/wbd/ontwikkeling/monitor` | future authenticated browse | ontwikkelmonitor | Ontwikkeling | nee | ja | canonical |
| `/workspace/wbd/ontwikkeling/historie` | future authenticated browse | historie | Ontwikkeling | nee | ja | canonical |
| `/workspace/wbd/ontwikkeling/feedback` | future authenticated task | feedback | Ontwikkeling | later | ja | canonical |
| `/workspace/wbd/business-foundation` | future authenticated browse | business foundation | Business Foundation | nee | ja | canonical |
| `/workspace/wbd/business-foundation/bedrijfsgegevens` | future authenticated detail | bedrijfsgegevens | Business Foundation | nee | ja | canonical |
| `/workspace/wbd/business-foundation/finance` | future authenticated browse | finance | Business Foundation | nee | ja | canonical |
| `/workspace/wbd/business-foundation/finance/inkomende-facturen` | future authenticated browse | inkomende facturen | Business Foundation | later | ja | canonical |
| `/workspace/wbd/business-foundation/finance/facturen` | future authenticated browse | factuurconcepten | Business Foundation | later | ja | canonical |
| `/workspace/wbd/business-foundation/finance/facturen/nieuw` | focusroute | nieuw factuurconcept | Business Foundation | later | ja | bestaand, canonical |
| `/workspace/wbd/business-foundation/finance/facturen/concepten/:invoiceId` | focusroute | factuurconceptdetail | Business Foundation | later | ja | canonical |
| `/workspace/wbd/business-foundation/finance/facturen/verzonden` | future authenticated browse | verzonden facturen | Business Foundation | later | ja | canonical |
| `/workspace/wbd/business-foundation/finance/facturen/verzonden/:invoiceId` | focusroute | verzonden factuurdetail | Business Foundation | later | ja | canonical |
| `/workspace/wbd/business-foundation/templates` | future authenticated browse | templates | Business Foundation | nee | ja | canonical |
| `/workspace/wbd/infrastructuur` | future authenticated browse | infrastructuurcontext | Infrastructuur | nee | ja | canonical |
| `/workspace/wbd/kennisvoorstellen` | future authenticated browse | voorstellenlijst | Kennisvoorstellen | nee | ja | canonical |
| `/workspace/wbd/kennisvoorstellen/:proposalId` | focusroute | voorstelreview | Kennisvoorstellen | nee | ja | canonical; `?bewerken=1` blijft ondersteund |
| `/workspace/wbd/kennis` | future authenticated secondary | Atlas Knowledge Repository | Kennisvoorstellen | nee | ja | canonical |
| `/workspace/wbd/tijdlijn` | future authenticated secondary | lokale back-up/continuïteit | geen fictieve primaire state | nee | ja | **dispatch hersteld** |
| `/health` | system public | liveness | n.v.t. | nee | ja | 200, minimale JSON |
| `/ready` | system public | huidige app-readiness | n.v.t. | nee | ja | 200, minimale JSON |

Aliases worden deterministisch gecanonicaliseerd:

| Alias | Canonical target | Client/dev | Node runtime |
|---|---|---|---|
| `/workspace/wbd` | `/workspace/wbd/overzicht` | `history.replaceState` | HTTP 308 |
| `/workspace/wbd/ontwikkeling` | `/workspace/wbd/ontwikkeling/monitor` | `history.replaceState` | HTTP 308 |
| `/workspace/wbd/business-foundation/finance/facturen/concepten` | facturenlijst | `history.replaceState` | HTTP 308 |

`/workspace/wbd/communicatie` is geen capability en geen alias. Hij toont nu expliciet Workspace 404. Er is geen mail-, thread-, sender- of deliverymodel gebouwd.

## 6. Not-found en route parsing

- Een onbekende WBD-route retourneert geen navigation fallback en rendert nooit Home.
- De Workspace toont een rustige `data-route-status="not-found"`-state met één veilige Home-route.
- Een malformed percent-encoded route toont een afzonderlijke `parse-error`-state.
- Er verschijnt geen stacktrace, secret, providerinformatie of klantinhoud.
- De lokale browsercode logt alleen een generieke foutklasse; geen volledige route-ID of payload.
- De providerneutrale Node-runtime retourneert voor bekende documentsroutes HTTP 200, aliases 308, onbekende WBD-routes 404 met de client-side 404-shell, en routes buiten de Workspace-boundary 404 zonder WBD-bundle.
- De Vite-developmentserver blijft een development SPA-server; de zichtbare foutstate is daar leidend. Correcte production HTTP-semantiek is in de Node-runtime geïmplementeerd en getest.
- `renderWbdFoundation()` heeft geen laatste `renderOverview()`-fallback meer; een onmogelijke interne dispatch faalt naar de algemene veilige application error boundary.

## 7. Deep-link behavior

- De route resolver gebruikt uitsluitend `window.location.pathname`; query en hash veranderen de schermidentiteit niet.
- Alle canonical routes zijn direct te openen en door de Node-runtime als documentroute bekend.
- Refresh op `/workspace/wbd/organisaties/sportpaleis` behoudt dossier, titel en actieve Organisaties-state.
- Refresh op een unknown route behoudt de expliciete 404; hij springt niet naar Home.
- WBD-route-identiteit gebruikt geen local/session storage.
- Gekopieerde focus-URL's herstellen dezelfde contextstate; formulieren en unsaved-changebeleid volgen later per capability.

## 8. Back- en focusroutecontract

Inhoudelijke mobiele dossieracties krijgen een echte route. De twee gereserveerde routes tonen in WS.1 alleen het contract, omdat nieuwe upload-/notitieflows datamigratie of dubbele writes zouden introduceren.

- `documenten/nieuw` keert deterministisch terug naar het dossier via “Annuleren en terug”.
- `notities/nieuw` gebruikt hetzelfde stabiele dossierpad.
- `documenten` is de toekomstige dedicated browse-route en verwijst terug naar het dossier.
- De browser Back/Forward-listener rendert opnieuw op basis van de actuele URL.
- Bestaande volledige-pagina-links blijven gewoon werken; er is geen fragiele clickstate-router geïntroduceerd.
- De route-ID `organizationId` is een lokaal dossieradres, niet automatisch een toekomstige tenant/securitykey.

## 9. Navigation contract

`getWbdNavigationItem()` vraagt het centrale routecontract om `navigationId`. Voor unknown, parse error en routes zonder primaire ingang retourneert het `undefined`; Overzicht is niet langer de universele fallback.

De huidige shell en hoofdvolgorde blijven visueel ongewijzigd. De routearchitectuur kan later zonder routerherbouw de WS-VIS.2-richting Home / Organisaties / Projecten / Financiën / Meer ondersteunen. Geen desktoprail, mobiele bottom navigation, icon library of nieuwe card system is in WS.1 geïmplementeerd.

## 10. Page title contract

Alle aangeraakte WBD-renderers gebruiken:

```text
<Page or dossier name> — WBD Workspace
```

Voorbeelden die werkelijk zijn gevalideerd:

- `Home — WBD Workspace`
- `Projecten — WBD Workspace`
- `Sport 2000 Sportpaleis B.V. — WBD Workspace`
- `Route niet gevonden — WBD Workspace`
- `Notitie toevoegen — WBD Workspace`

Lange organisatienamen worden als data aan de title helper doorgegeven en niet in componentstructuur hardgecodeerd.

## 11. Provider-neutral Node runtime contract

| Onderdeel | Contract |
|---|---|
| Node | `>=22.12.0`; vastgelegd in `package.json` en lockfile |
| Build | `npm.cmd run build:workspace` |
| Start | `npm.cmd run start:workspace` |
| Production mode | `NODE_ENV=production`; `APP_ENV=staging` of `production` |
| Process | één stateless HTTP-process; geen in-process sessions/jobs als durable waarheid |
| Filesystem | buildartefact read-only; lokale runtimefilesystem is ephemeral en geen dataopslag |
| Binding | `PORT`; `HOST`, default production `0.0.0.0` |
| Shutdown | `SIGTERM` en `SIGINT` stoppen accepting requests en sluiten de server graceful |
| Logging | éénregel-JSON naar stdout; geen requestbody, secret of klantdata |
| Release | verplichte opaque `RELEASE_ID` in production; alleen startup/release-evidence, niet in probes |
| Static assets | hashed, immutable cache; HTML/probes `no-store` |
| Route status | 200 known, 308 alias, 404 unknown/outside, 405 unsupported method |
| Provider | geen SDK, cloudmanifest, API key, DNS- of accountdependency |

Dit is een runnable UI/runtime-boundary, geen productieclaim. De huidige WBD write-API's zijn nog Vite-developmentmiddleware; identity, server-side authorization en durable data ontbreken bewust tot WS.2/WS.3.

## 12. Configuration schema

`workspace-runtime-config.mjs` definieert een JSDoc-typed schema en fail-fast parser. Secretvelden worden niet teruggegeven of gelogd; toekomstige dependencies worden uitsluitend als configured/not-configured boolean gerepresenteerd.

| Variable | WS.1-status | Production required | Secret | Opmerking |
|---|---|---:|---:|---|
| `NODE_ENV` | actief | ja | nee | development/test/production |
| `APP_ENV` | actief | ja | nee | local/test/staging/production |
| `HOST`, `PORT` | actief | defaults | nee | standaard webprocesscontract |
| `PUBLIC_BASE_URL` | actief | ja | nee | absolute URL zonder embedded credentials |
| `WORKSPACE_BASE_URL` | actief | ja | nee | ondersteunt later eigen Workspace-host |
| `RELEASE_ID` | actief | ja | nee | opaque, maximaal 128 veilige tekens |
| `WORKSPACE_DIST_DIR` | actief | nee | nee | default `dist-workspace` |
| `LOG_LEVEL` | actief | nee | nee | debug/info/warn/error |
| `DATABASE_URL` | gereserveerd WS.3 | nee in WS.1 | ja | niet gelezen door readiness |
| `OBJECT_STORAGE_*` | gereserveerd WS.3 | nee in WS.1 | deels | geen bucket/provider gekoppeld |
| `IDENTITY_*` | gereserveerd WS.2 | nee in WS.1 | deels | geen WorkOS/andere SDK gekoppeld |
| `SENTRY_DSN` | gereserveerd later | nee in WS.1 | ja | geen externe monitoring geactiveerd |

Local development krijgt veilige niet-secret defaults. Production mode weigert ontbrekende base URLs/release-ID, ongeldige URLs, onveilige embedded URL-credentials en ongeldige poorten/environments.

## 13. Health en readiness

`GET|HEAD /health`:

```json
{"status":"ok"}
```

`GET|HEAD /ready`:

```json
{"status":"ready"}
```

Beide zijn klein, stabiel, `no-store` en bevatten bewust geen release-ID, versiedetails, dependencies, klantdata, database-, identity-, storage- of secretinformatie. Andere methods krijgen 405.

Readiness betekent in WS.1 uitsluitend dat de huidige stateless Workspace-UI verantwoord requests kan aannemen en het immutable artefact beschikbaar is. Er is expres geen nep-databasecheck. WS.2/WS.3 mogen later echte dependencychecks toevoegen, waarna readiness pas groen is als de vereiste server-side dependencies verantwoord beschikbaar zijn.

## 14. Public / Experience / Workspace separation

- De standaard public build blijft `dist/` en slaagt in de bestaande public-only scan.
- De Workspace krijgt `workspace.html`, `workspace-main.ts`, `vite.workspace.config.ts` en `dist-workspace/`.
- De Workspace-build gebruikt `publicDir: false` en bevat geen publieke homepagecopy, Experience-entrypoint, context-first experiment, `/atlas-lab` of `/sportpaleis-proof`.
- De Experience-build/config is niet gewijzigd.
- De lokale `internal-main.ts` laadt WBD alleen binnen `/workspace/wbd`; import/startfouten krijgen een veilige lokale errorstate.
- De Node-runtime rendert buiten `/workspace/wbd` geen WBD-shell of WBD-bundle.
- Er is niets gedeployed en geen hosting-, DNS- of subdomainconfiguratie gewijzigd.

## 15. Browserstorage findings

| State | Huidige opslag | Routeafhankelijk? | Vervolg |
|---|---|---:|---|
| WBD route/schermidentiteit | URL pathname/query | nee | behouden |
| WBD dossier/document/contact/tijdlijn | IndexedDB | nee | WS.3 durable central data + private objects |
| Kennisvoorstellen/repository | IndexedDB | nee | WS.3 durable data/audit |
| Foundation feedback/payment | lokale Vite file/API-middleware | nee | WS.3 serverrepository |
| Factuurconcepten/verzonden | lokale development-API/files | nee | finance continuity binnen WS.3/later capability |
| Atlas focus/observaties/Understanding/ideeën/logboek | localStorage in aparte `/atlas`-omgeving | hash/Atlascontext, niet WBD dispatch | buiten deze WBD-routemigratie; later durable review |

Geen brede opslagmigratie is uitgevoerd. De afzonderlijke production-UI-build maakt lokale stores niet ineens productionwaardig.

## 16. Future identity boundary

Routes zijn geclassificeerd als:

- system public: uitsluitend `/health` en `/ready`;
- future authenticated Workspace route: alle WBD root/browse/detailroutes;
- focusroute: concrete inhoudelijke taak met herstelbare URL;
- future organisation/role-guarded: dossier-, document- en later project/financeobjectroutes.

Er is geen loginpagina, fake session, client-side authorization, WorkOS SDK of permissief authgedrag gebouwd. De browserroute selecteert later een gevraagde context maar verleent nooit toegang. WS.2 moet deny-by-default server-side route/session/role/org guards toevoegen.

## 17. Organisation boundary

`organizationId` is nu een stabiele lokale dossierlocator en maakt directe links mogelijk. Hij is niet gepromoveerd tot canonical securitytenant-ID. WS.2/WS.3 moeten:

- canonical `organization_id` server-side uit membership/session en requestcontext afleiden;
- cross-organisation denial testen;
- routeparameter, query, repository en objectkey tegen dezelfde organisationboundary valideren;
- browserdata nooit als authorizationbron vertrouwen.

Sportpaleis blijft voorbeeld-/bestaande lokale dossierinhoud, niet de architectuurbasis.

## 18. PWA readiness

- Echte pathname-routes, direct links, refresh, titles en browser Back/Forward werken.
- Focusroutes hebben een expliciete terugroute wanneer browserchrome later ontbreekt.
- Dezelfde URL werkt op desktop en 390×844.
- Er is geen schermidentiteit die alleen in browserstorage bestaat.
- Er is geen manifest, service worker, offlinecache, push, background sync of installabilityclaim toegevoegd.

## 19. Security boundary

- Geen Bitwarden, wachtwoord, recoverycode, token, API key of production secret gelezen of toegevoegd.
- Geen echte productie-/klantdata ingevoerd of gemigreerd.
- Geen provideraccount, SDK, provisioning, DNS, database, bucket, WorkOS, Sentry, UptimeRobot of Cloudflare aangeraakt.
- Errorstates tonen geen stacktrace of interne details.
- Probes lekken geen release/dependencyinformatie.
- Buiten-boundary 404 serveert geen Workspacebundle.
- Runtimeconfig logt alleen veilige genormaliseerde metadata.
- `noindex, nofollow, noarchive` staat op de Workspace-entry en runtimeheaders.

## 20. Files changed

### Nieuwe WS.1-bestanden

- `docs/atlas/PROJECT-WS1-ROUTE-APPLICATION-BOUNDARY-IMPLEMENTATION.md`
- `website/workspace.html`
- `website/vite.workspace.config.ts`
- `website/src/workspace-main.ts`
- `website/src/workspace-routes.ts`
- `website/src/styles/workspace-base.css`
- `website/scripts/workspace-runtime-config.mjs`
- `website/scripts/workspace-runtime.mjs`
- `website/scripts/verify-workspace-build.mjs`
- `website/tests/workspace-routing.test.mjs`
- `website/tests/workspace-runtime.test.mjs`

### Gericht bijgewerkte bestaande bestanden

- `website/.gitignore` (uitsluitend `dist-workspace` als reproduceerbare buildoutput)
- `website/package.json`
- `website/package-lock.json`
- `website/vite.config.ts`
- `website/src/internal-main.ts`
- `website/src/workspace-config.ts`
- `website/src/wbd-workspace.ts`
- `website/src/wbd-foundation.ts`
- `website/src/wbd-invoices.ts`
- `website/tests/workspace-foundation.test.mjs`

Een aantal hiervan was vóór WS.1 al gewijzigd of untracked in de gebruikers-worktree. Alleen de hierboven beschreven WS.1-hunks behoren tot deze fase; unrelated bestaande wijzigingen zijn niet opgeschoond, gestaged of teruggedraaid.

De lokaal gegenereerde map `website/dist-workspace/` is na verificatie verwijderd en wordt voortaan genegeerd; zij kan volledig worden gereproduceerd met `npm.cmd run build:workspace`.

## 21. Tests en bewijs

### Automatisch

| Controle | Resultaat |
|---|---|
| baseline `npm.cmd test` | PASS — 244/244 |
| final `npm.cmd test` | **PASS — 252/252** |
| gerichte WBD/route/runtimeset | PASS — 23/23 |
| TypeScript `tsc` | PASS |
| `node --check` runtime/config | PASS |
| `npm.cmd run build:workspace` | PASS — 4 bestanden; Workspace-only verifier PASS |
| `npm.cmd run build` | PASS — public-only verifier PASS |
| Node config negative tests | PASS — production fail-fast, geen secret return |
| Node HTTP integration | PASS — health/ready, 308, known 200, unknown 404, outside 404, asset, 405 |
| Vite `/health` en `/ready` via direct HTTP | PASS — beide 200, exact minimale JSON, `no-store` |

Toegevoegd zijn acht nieuwe testgevallen voor route matrix, aliases, unknown/malformed routes, organisation/focuscontext, titles/history, entrypointseparation, configvalidatie en runtime-HTTP-semantiek.

### Echte lokale browser

Met de in-app browser is de daadwerkelijk draaiende lokale Vite-app gecontroleerd:

- Home direct: juiste route, title en actieve Home-state;
- Sportpaleis dossier direct en na refresh: inhoud, `Sport 2000 Sportpaleis B.V. — WBD Workspace` en actieve Organisaties-state behouden;
- unknown route direct en na refresh: `not-found`, nul actieve primaire routes en geen Homeweergave;
- document-focusroute: expliciete organisationcontext en “Annuleren en terug” naar het stabiele dossier;
- Back van Projecten naar Home en Forward naar Projecten: route, title en active state correct;
- `/workspace/wbd` canonicaliseert in de browser naar `/workspace/wbd/overzicht`;
- 390×844 Home en notitie-focusroute: geen documentbrede horizontale overflow; dezelfde URL/context en veilige cancelroute.

De browser blokkeerde het rechtstreeks openen van het kale lokale `/health`-document client-side. Dit is geen endpointfout: dezelfde Vite-probes zijn direct over HTTP met 200 gecontroleerd en de Node-runtime-integratietest valideert beide endpoints end-to-end.

## 22. Regression result

- Bestaande 244 tests blijven groen; totaal nu 252.
- Publieke websitebuild en bestaande public-only securityscan blijven groen.
- Organisatie/dossieropslag- en UI-tests blijven groen.
- Finance/invoiceberekening, conceptflow en UI-contracttests blijven groen.
- Atlas informatiearchitectuur, runtime, observations, Understanding en shelltests blijven groen.
- Experience tests en afzonderlijke buildboundarytests blijven groen.
- De huidige WBD-shell en visuele taal zijn behouden; alleen 404/error/focus-contractstates en een niet-zichtbare aparte runtime-entry zijn toegevoegd.
- Geen brede CSS-cleanup, redesign, nieuwe navigation rail of mobiele bottom bar uitgevoerd.
- Geen bekende regressie aangetroffen.

## 23. Unresolved dependencies

### WS.2

- echte identity, MFA, sessions en recovery;
- server-side authenticated route guard;
- canonical memberships, roles, permissions en organisationderivation;
- cross-organisation negative tests;
- WorkOS blijft conditional en is niet geactiveerd.

### WS.3

- centrale PostgreSQL-repositories/migrations;
- vervangen IndexedDB en dev file/API-writes;
- private objectstorage, download/upload authorization en malware/type/sizegrenzen;
- audit, export/delete, dataretentie en durable finance continuity;
- echte dependencyreadiness en isolated restorebewijs.

### WS.4 / VIS-IMP.1

- goedgekeurde visual tokens, typography, spacing, controls en accessibilityfoundation;
- latere desktoprail/mobile bottom navigation;
- focusrouteformulieren, keyboard/sticky/unsaved behavior;
- volledige viewport/a11y/screenshotregressie na visuele implementatie.

### Runtime/release later

- immutable deploymentartefact/register buiten lokale build;
- production host, TLS, DPA/accounts, external monitoring en release/rollback rehearsal;
- support/RPO/RTO/contractgates uit WSP.2C.

## 24. Rollback

Rollback is bestand-/hunkgericht:

1. verwijder uitsluitend de elf nieuwe WS.1-bestanden;
2. draai uitsluitend de WS.1-hunks in de negen bijgewerkte bestanden terug;
3. laat alle vooraf bestaande gewijzigde/untracked bestanden en WS-VIS.0/1/2-evidence staan;
4. voer daarna `npm.cmd test` en `npm.cmd run build` uit;
5. geen `git reset --hard`, brede checkout, database-/browserstoredeling of productieactie.

Er is niets externs om terug te draaien: geen account, DNS, provider, abonnement, data of deployment is gewijzigd.

## 25. GO / NO-GO

| Gate | Status | Onderbouwing |
|---|---|---|
| **WS.1 — Route / Application Boundary** | **GO** | expliciete manifest/dispatcher, geen silent fallback, deep links/history/titles/focuscontract, aparte build/runtime, probes en 252 tests groen |
| **002C-WSP.2B provider-neutral runtime contract** | **GO als lokaal contract** | Node/config/stateless/ephemeral/logging/shutdown/build/start/HTTP-semantiek zijn providerneutraal en getest |
| **WS.2 identity/permissions** | **NO-GO binnen deze fase** | niet gestart; afzonderlijke preflight/GO nodig |
| **WS.3 durable data** | **NO-GO binnen deze fase** | niet gestart; bestaande lokale stores blijven expliciet lokaal |
| **WS.4 / WS.5** | **NO-GO binnen deze fase** | niet gestart |
| **Production purchases/provisioning** | **NO-GO** | niets gekocht of geactiveerd |
| **Production deployment/livegang** | **NO-GO** | identity, durable data, private storage, recovery en releasegates ontbreken |

De preflightinschatting “middel, laag/middel risico, zeer hoog hergebruik” bleek kwalitatief juist. Het werk bleef binnen de voorspelde technische omvang. Werkelijke eurocredits zijn niet zichtbaar; er wordt daarom geen gerealiseerd eurobedrag gerapporteerd.

**Exact één aanbevolen vervolgfase:** `VIS-IMP.1 — Foundation Primitives`, uitsluitend na een nieuwe preflight, creditinschatting, menselijke review en expliciete GO. Deze fase mag de goedgekeurde WS-VIS.2-tokens, typography, spacing, controls en accessibilitybasis implementeren, maar start niet door dit document.

**STOP.** Geen WS.2, WS.3, WS.4, WS.5, VIS-IMP.1, provider provisioning of livegang gestart.
