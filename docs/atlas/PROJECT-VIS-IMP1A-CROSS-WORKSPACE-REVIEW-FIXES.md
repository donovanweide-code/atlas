# PROJECT VIS-IMP.1A — Cross-Workspace Review Fixes

Datum: 8 augustus 2026  
Status: **GO als lokaal gevalideerde implementation candidate**  
Productie, auth-herstel en een brede Atlas-migratie: **NO-GO zonder afzonderlijke menselijke GO**

## 1. Reviewbevindingen

De review leverde vier begrensde bevindingen op:

1. De merkidentiteit linksboven in de Experience Workspace suggereerde een link zonder afzonderlijke functionele bestemming.
2. Atlas wijkt visueel af van VIS-IMP.1/WS-VIS.2 en de nieuwe SVG-navigatie-iconen werden door ontbrekende Atlas-sizing extreem groot.
3. Een lege of onbedoelde conceptfactuur kon niet veilig worden opgeruimd.
4. Het eerder gebruikte Experience-beheerwachtwoord werkt volgens de menselijke review niet meer; dit mocht uitsluitend read-only worden onderzocht.

## 2. Scope

Uitgevoerd:

- niet-interactief Experience-merkblok;
- één kleine Atlas layoutbugfix en een expliciet alignment-assessment;
- concept-only factuurverwijdering met bevestiging, backendguards en afgeleide PDF-cleanup;
- tests, TypeScript, drie builds en lokale/live browserinspectie;
- read-only auth-onderzoek zonder een credential te lezen of te gebruiken.

Niet uitgevoerd:

- Home-, sidebar- of typografieredesign;
- nieuwe navigation architecture;
- identity, permissions, database, provider, tenant, mail of modulebouw;
- productieconfiguratie, password reset, credentialgeneratie of deployment;
- volledige Atlas visual migration.

## 3. Experience correction

`WorkspaceConfig` heeft nu een optionele `brandIsInteractive`-grens. Alleen Experience zet deze op `false`. De gedeelde shell rendert de merkidentiteit dan als een neutraal `div.workspace-brand` in plaats van een anchor. W/BD, de naam en `Workspace` blijven visueel behouden; `href`, linksemantiek en de standaard linkcursor vervallen.

Er is geen bestemming of route verzonnen. De echte primaire navigatieroute en de Workspace-switcher blijven beschikbaar.

Lokale browservalidatie:

- desktop 1440×900: merkblok is `DIV`, heeft geen `href`, geen horizontale paginaoverflow;
- mobiel 390×844: hetzelfde merkblok blijft `DIV`, zonder `href`, binnen de beschikbare breedte;
- de Experience-navigatie-iconen zijn door de kleine gedeelde Atlas-fix 20×20 px.

De correction is een lokale candidate. De huidige live Experience-bundle bevat de nieuwe `/workspace/experience`-admininterface nog niet: live valt die URL terug op de deelnemers-Experience. Er is daarom bewust niet beweerd dat deze merkcorrectie al live staat.

## 4. Atlas assessment

### Kleine bug die nu veilig is opgelost

De generieke inline SVG-iconen hadden in de oude Atlas-CSS geen afmetingen. Browsermetingen vóór de fix:

- iconen circa 128–145 px;
- navigatierijen circa 153–171 px;
- intern uitlopende rijbreedtes.

De enige Atlas-codewijziging zet `.workspace-nav__icon` op 20×20 px met een vaste flexbasis. Na de fix zijn alle vijf gemeten iconen exact 20×20 px en alle navigatierijen circa 45,6 px. Desktop en mobiel hebben geen horizontale paginaoverflow.

### Afwijkingen die een aparte migratie vereisen

| Onderdeel | Huidige Atlas | VIS-IMP.1 / WS-VIS.2 | Classificatie |
|---|---|---|---|
| Desktoprail | 272 px | 248 px vanaf 1200; 224 px op kleine laptop | migratie |
| Werklaag | donker/transparant met gradients | warm crème als dagelijkse werklaag | migratie |
| Surface-taal | dark panels, glow/gradient en transparantie | lichte surfaces, subtiele borders, schaarse shadow | migratie |
| Mobiele shell | sticky header met horizontaal scrollende desktopnav | 64 px topbar + vijfdelige bottomnav + Meer | migratie |
| Mobiele nav | 326 px zichtbaar, 546 px scrollcontent | prioritaire vaste bestemmingen zonder desktopnav-verkleining | migratie |
| Mobiele targets | gemeten circa 39,2 px hoog | voorkeur 48 px | polish binnen migratie |
| Typografie | meerdere essentiële labels/metadata circa 0,55–0,84 rem | metadata 13,5/14 px; operationeel minimaal 14 px | migratie |
| Iconen | vóór fix onbegrensd; nu 20 px | coherente 20/24 px outlinefamilie | kleine fix afgerond |

Het gemelde afkappen is niet als horizontale paginaoverflow gereproduceerd op 1440 of 390 px. De oude horizontaal scrollende mobiele navigatie is wel aantoonbaar een andere interaction language. Die nu herschrijven zou scope creep zijn.

Behouden moeten blijven: Atlas’ donkere/methodische identiteit waar semantisch passend, epistemische statussen, Werkelijkheid/Werkruimte/Fundament, rustige redactionele toon, bestaande routes en functionaliteit. Atlas hoeft niet visueel identiek te worden aan WBD, maar moet dezelfde tokens, controlkwaliteit, responsive grammatica en toegankelijkheidsgrenzen gaan delen.

Aanbeveling: **`ATLAS-VIS.1 — Atlas Workspace Visual Alignment`** als afzonderlijke ontwerp-/implementatiefase.

## 5. Finance concept-delete behavior

### Bestaande nummerlogica

Voor implementatie is de opslag onderzocht. Een conceptnummer is op dit moment handmatige documentdata; er bestaat geen allocator, teller of nummerreservering bij het aanmaken van een concept. Finaliseren verplaatst hetzelfde concept-id naar de afzonderlijke `sent`-opslag en vergrendelt de inhoud. Een concept verwijderen verandert daarom geen nummerreeks en herschrijft geen definitieve historie.

### Gedrag

- `Concept verwijderen` verschijnt uitsluitend bij een bestaand concept;
- een native modale bevestiging noemt factuurnummer, klantnaam of concept-id;
- `Annuleren` sluit zonder mutatie;
- bevestigen roept uitsluitend `DELETE /__wbd-invoices/concepts/:id` aan;
- de server valideert het id, weigert een gelijknamig definitief record en vereist `document_status: "concept"`;
- een afgeleide concept-PDF wordt eerst verwijderd, daarna het bronrecord;
- faalt bronverwijdering na PDF-cleanup, dan blijft het concept herstelbaar en kan de PDF opnieuw worden gegenereerd;
- na succes vervangt de UI de history-state door het conceptenoverzicht en rendert de actuele lijst opnieuw;
- `DELETE /sent/:id` antwoordt expliciet met 409 en verandert niets;
- definitieve detailpagina’s tonen geen delete- of finalizeactie en blijven readonly.

Browseracceptatie gebruikte één uniek tijdelijk testconcept. Cancel behield het; confirm verwijderde het; terugkeer naar het overzicht werkte; een aansluitende GET gaf 404. De bestaande definitieve Sportpaleis-factuur gaf 409 op DELETE en daarna 200 op GET.

## 6. Experience auth finding

### Huidige methode

Productie:

- POST naar dezelfde `/api/admin/login`-route;
- verificatie via `password_verify` tegen `admin_password_hash`;
- daarna één server-side PHP-beheersessie;
- Secure, HttpOnly, SameSite=Strict cookie met standaardnaam `wbd_experience_observatory`;
- acht loginpogingen per vijftien minuten volgens de server-side rate limit.

Lokaal testharnas:

- dezelfde frontend-API en dezelfde adminroutes;
- een aparte `EXPERIENCE_LOCAL_ADMIN_PASSWORD`-omgevingsvariabele van minimaal zestien tekens;
- een gehashte tijdelijke sessietoken in lokale teststate.

### Gedeeld of gewijzigd

Observatory en de nieuwe Experience-admininterface gebruiken binnen dezelfde omgeving **dezelfde** `experienceApi.adminLogin`, `/api/admin/login` en beheersessie. Er is geen tweede Experience Workspace-wachtwoordpad gevonden.

Geen aantoonbare recente auth-codewijziging is gevonden:

- de actuele bron-API en het lokaal gebouwde Experience-pakket zijn bytegelijk;
- het gedocumenteerde Context First production deployment hield API, PHP Runtime en Observatory byte-identiek;
- de huidige live asset is `experience-Cjddk2RY.js`, overeenkomstig de vastgelegde First Visit V2-release;
- de relevante lokale Experience-bronnen zijn in deze dirty worktree niet door Git getrackt, waardoor commit history geen aanvullend bewijs over lokale wijzigingen kan leveren.

De concrete oorzaak van het geweigerde eerdere wachtwoord is daarom **niet aantoonbaar vastgesteld**. Mogelijke verklaringen zoals een verschil tussen lokale en productiecredential, private-configdrift, een onjuiste omgeving of rate limiting zijn niet als feit behandeld.

### Credentialbeheer en veilige herstelroute

- productie: `/sites/experience-private/config.php` buiten de DocumentRoot, of het pad uit `EXPERIENCE_CONFIG_PATH`; alleen de password-hash hoort daar;
- lokaal: alleen de procesomgeving `EXPERIENCE_LOCAL_ADMIN_PASSWORD`;
- nooit broncode, frontend, buildartefact, repositorydocument of log.

Herstel vereist een afzonderlijke menselijke GO en een expliciete keuze voor lokaal of productie. Onder die GO moet alleen de private targetconfig worden gecontroleerd en zo nodig atomair worden vervangen met een hash van een door de mens gekozen nieuw wachtwoord, gevolgd door login/logout- en rollbackvalidatie. Het huidige wachtwoord kan en mag niet uit de hash worden teruggelezen.

Er is in deze fase geen password geprobeerd, getoond, gelogd, gereset, gegenereerd of gecommit en geen productieconfig geopend of gewijzigd.

## 7. Files changed

Implementatie:

- `website/src/workspace-config.ts`;
- `website/src/workspace-shell.ts`;
- `website/src/styles/atlas-workspace.css`;
- `website/scripts/wbd-invoice-development-api.mjs`;
- `website/src/wbd-invoices.ts`;
- `website/src/styles/wbd-invoices.css`.

Tests en documentatie:

- `website/tests/workspace-visual-foundation.test.mjs`;
- `website/tests/wbd-invoices.test.mjs`;
- `docs/atlas/PROJECT-VIS-IMP1A-CROSS-WORKSPACE-REVIEW-FIXES.md`.

De repository was vóór deze fase al substantieel dirty en meerdere betrokken bestanden waren al untracked. Niets is gereset, gestaged of gecommit. Buildoutputs zijn alleen lokaal opnieuw gegenereerd voor validatie.

## 8. Tests

- gerichte Finance + visual-foundation tests: **10/10 pass**;
- standaard volledige suite `npm.cmd test`: **351/351 pass**;
- seriële volledige controlerun: **351/351 pass**;
- TypeScript: **pass** via alle drie builds;
- `npm.cmd run build`: **pass**, public-only verifier pass;
- `npm.cmd run build:workspace`: **pass**, Workspace-verifier en runtime syntaxchecks pass;
- `npm.cmd run build:experience`: **pass**, afgeschermd pakket voorbereid.

Een eerste parallelle full-suite run gaf één eenmalige bestaande Sportpaleis source-match failure. Alle Sportpaleis-testbestanden, de volledige seriële suite en de directe standaardrerun waren daarna groen. De afwijking was niet reproduceerbaar en is geen bevestigde regressie.

## 9. Browser validation

Uitgevoerd met de echte lokale Workspace op 127.0.0.1 en read-only tegen de bestaande live Experience:

- Experience merkblok desktop en mobiel: neutraal `DIV`, geen `href`;
- Atlas desktop en mobiel: iconen vóór/na gemeten, 20 px na fix, geen paginaoverflow;
- Finance: tijdelijk concept maken, bewaren, delete-dialog openen, annuleren, opnieuw openen, bevestigen, actuele lijst en 404 verifiëren;
- Finance sent: geen deleteactie, readonly inputs, DELETE 409, aansluitende GET 200;
- live `/observatory`: bestaande beheerlogin zichtbaar, geen loginpoging gedaan;
- live `/workspace/experience`: huidige productie bevat nog geen admin-Workspace-route en valt terug op de deelnemers-Experience;
- browserconsole over de gevalideerde lokale eindstaat: **0 warnings, 0 errors**.

De tijdelijke browsertabs zijn gesloten en de viewportoverride is hersteld.

## 10. Regression result

Geen bevestigde regressie gevonden in:

- publieke buildgrens;
- Workspace routes en shell;
- Atlasfunctionaliteit of epistemische inhoud;
- Experience/Observatory API-contract;
- concept save/generate/finalize;
- definitieve factuurlock, PDF-beschikbaarheid en historie;
- overige 351 tests.

De enige productie-observatie is een bestaande releasegrens: de nieuwe Experience Workspace is nog niet live. Dit is niet door VIS-IMP.1A veranderd.

## 11. Security boundary

- alleen gesanitiseerde concept-id’s worden naar vaste concept-, sent- en PDF-roots vertaald;
- statuscontrole en sent-collisionguard staan server-side, niet alleen in de UI;
- sent delete is expliciet geblokkeerd;
- geen definitieve status wordt teruggedraaid;
- geen nummer-, audit- of historierecord wordt aangepast;
- geen secret is gelezen, gelogd, getoond, getest of gewijzigd;
- geen productie-, database-, provider-, DNS- of deploymentmutatie;
- geen package geïnstalleerd of gewijzigd.

## 12. Remaining human decisions

1. Is een afzonderlijke release-GO gewenst om deze lokale candidate naar de relevante omgeving te brengen?
2. Moet Experience-toegang worden hersteld, en zo ja: lokaal of productie? Dit vereist een afzonderlijke operationele GO.
3. Mag `ATLAS-VIS.1` daarna de visuele familierelatie systematisch uitwerken, met Atlas’ epistemische karakter als harde behoudgrens?

## 13. GO/NO-GO

- **GO:** VIS-IMP.1A als lokaal gevalideerde, begrensde implementation candidate.
- **GO:** Experience affordance fix, Atlas icon layoutfix en concept-delete behavior.
- **NO-GO:** automatische productiepublicatie.
- **NO-GO:** auth-reset of private-configwijziging zonder aparte menselijke GO.
- **NO-GO:** brede Atlas redesign binnen deze fase.

## 14. Recommended next phase

Exact aanbevolen product-/designvervolg:

**`ATLAS-VIS.1 — Atlas Workspace Visual Alignment`**

Die fase hoort desktoprail, lichte/donkere oppervlakverhouding, typografie, spacing, mobile topbar/bottom navigation, touch targets en content clipping als één begrensde migratie te behandelen, met behoud van Atlasfunctionaliteit, epistemische rollen en bestaande routes.

Indien beheerstoegang eerst operationeel noodzakelijk is, plan daarvoor geen productfase maar een afzonderlijk menselijk goedgekeurde **Experience auth recovery** met expliciete targetomgeving en rollback. Start geen van beide automatisch.
